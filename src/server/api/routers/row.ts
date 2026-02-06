import { eq, and, asc, desc, sql, count, gte } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  type ProtectedTRPCContext,
} from "~/server/api/trpc";
import { rows, tables } from "~/server/db/schema";

/**
 * Helper function to verify that the user owns the table (through base ownership)
 */
async function verifyTableOwnership(ctx: ProtectedTRPCContext, tableId: string) {
  const table = await ctx.db.query.tables.findFirst({
    where: eq(tables.id, tableId),
    with: {
      base: true,
    },
  });

  if (!table) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
  }

  if (table.base.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this table",
    });
  }

  return table;
}

/**
 * Helper function to verify row ownership
 */
async function verifyRowOwnership(ctx: ProtectedTRPCContext, rowId: string) {
  const row = await ctx.db.query.rows.findFirst({
    where: eq(rows.id, rowId),
    with: {
      table: {
        with: {
          base: true,
        },
      },
    },
  });

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Row not found" });
  }

  if (row.table.base.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this row",
    });
  }

  return row;
}

const cellValueSchema = z.union([z.string(), z.number(), z.null()]);
const filterOperatorSchema = z.enum([
  "contains",
  "doesNotContain",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "is",
  "isNot",
  "isEmpty",
  "isNotEmpty",
]);
const filterJoinSchema = z.enum(["and", "or"]);
const sortDirectionSchema = z.enum(["asc", "desc"]);
const sortColumnKindSchema = z.enum(["singleLineText", "number"]);
const sortConditionInputSchema = z.object({
  columnId: z.string().uuid(),
  direction: sortDirectionSchema,
  columnKind: sortColumnKindSchema.optional(),
});
const filterConditionInputSchema = z.object({
  columnId: z.string().uuid(),
  operator: filterOperatorSchema,
  value: z.string().trim().max(200).optional(),
  join: filterJoinSchema.optional(),
});
const listCursorSchema = z.object({
  lastOrder: z.number().int(),
  lastId: z.string().uuid(),
  lastSortValue: z.string().nullish(),
});
const listCursorInputSchema = z.union([z.number().int().min(0), listCursorSchema]);

const toCursorSortValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
};

const buildFilterExpression = (filter: {
  columnId: string;
  operator: z.infer<typeof filterOperatorSchema>;
  value?: string;
}) => {
  const normalizedValue = filter.value?.trim() ?? "";
  const cellText = sql`COALESCE(${rows.cells} ->> ${filter.columnId}, '')`;
  const numericCell = sql`CASE WHEN trim(${cellText}) ~ ${"^-?[0-9]+(\\.[0-9]+)?$"} THEN trim(${cellText})::numeric ELSE NULL END`;

  switch (filter.operator) {
    case "contains":
      if (!normalizedValue) return null;
      return sql`${cellText} ILIKE ${`%${normalizedValue}%`}`;
    case "doesNotContain":
      if (!normalizedValue) return null;
      return sql`${cellText} NOT ILIKE ${`%${normalizedValue}%`}`;
    case "greaterThan": {
      if (!normalizedValue) return null;
      const numericValue = Number(normalizedValue);
      if (!Number.isFinite(numericValue)) return null;
      return sql`${numericCell} > ${numericValue}`;
    }
    case "greaterThanOrEqual": {
      if (!normalizedValue) return null;
      const numericValue = Number(normalizedValue);
      if (!Number.isFinite(numericValue)) return null;
      return sql`${numericCell} >= ${numericValue}`;
    }
    case "lessThan": {
      if (!normalizedValue) return null;
      const numericValue = Number(normalizedValue);
      if (!Number.isFinite(numericValue)) return null;
      return sql`${numericCell} < ${numericValue}`;
    }
    case "lessThanOrEqual": {
      if (!normalizedValue) return null;
      const numericValue = Number(normalizedValue);
      if (!Number.isFinite(numericValue)) return null;
      return sql`${numericCell} <= ${numericValue}`;
    }
    case "is":
      if (!normalizedValue) return null;
      return sql`${cellText} = ${normalizedValue}`;
    case "isNot":
      if (!normalizedValue) return null;
      return sql`${cellText} <> ${normalizedValue}`;
    case "isEmpty":
      return sql`(${rows.cells} ->> ${filter.columnId}) IS NULL OR ${cellText} = ''`;
    case "isNotEmpty":
      return sql`(${rows.cells} ->> ${filter.columnId}) IS NOT NULL AND ${cellText} <> ''`;
    default:
      return null;
  }
};

export const rowRouter = createTRPCRouter({
  /**
   * List all rows for a table with pagination
   */
  listByTableId: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        limit: z.number().int().min(1).max(1000).default(100),
        cursor: listCursorInputSchema.nullish(),
        // Kept for backwards compatibility with non-infinite calls.
        offset: z.number().int().min(0).optional(),
        searchQuery: z.string().trim().max(200).optional(),
        sort: z.array(sortConditionInputSchema).max(10).optional(),
        filters: z
          .array(filterConditionInputSchema)
          .max(30)
          .optional(),
        filterGroups: z
          .array(
            z.object({
              join: filterJoinSchema.optional(),
              conditions: z.array(filterConditionInputSchema).max(30),
            }),
          )
          .max(12)
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify table ownership
        await verifyTableOwnership(ctx, input.tableId);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return { rows: [], total: 0, nextCursor: null };
        }
        throw error;
      }

      const offsetCursor = typeof input.cursor === "number" ? input.cursor : undefined;
      const keysetCursor =
        input.cursor && typeof input.cursor === "object" ? input.cursor : null;
      const useOffsetPagination =
        offsetCursor !== undefined ||
        typeof input.offset === "number" ||
        (input.sort?.length ?? 0) > 1;
      const resolvedOffset = offsetCursor ?? input.offset ?? 0;
      const normalizedSearchQuery = input.searchQuery?.trim() ?? "";
      const combinedFilterExpression = (() => {
        if (input.filterGroups && input.filterGroups.length > 0) {
          const groupedExpressions = input.filterGroups
            .map((group) => {
              const conditionExpressions = group.conditions
                .map((condition) => ({
                  join: condition.join ?? "and",
                  expression: buildFilterExpression({
                    columnId: condition.columnId,
                    operator: condition.operator,
                    value: condition.value,
                  }),
                }))
                .filter(
                  (
                    entry,
                  ): entry is {
                    join: "and" | "or";
                    expression: ReturnType<typeof sql>;
                  } => entry.expression !== null,
                );

              const groupExpression = conditionExpressions.reduce<
                ReturnType<typeof sql> | undefined
              >((combined, entry) => {
                if (!combined) return entry.expression;
                return entry.join === "or"
                  ? sql`(${combined}) OR (${entry.expression})`
                  : sql`(${combined}) AND (${entry.expression})`;
              }, undefined);

              if (!groupExpression) return null;
              return {
                join: group.join ?? "and",
                expression: groupExpression,
              };
            })
            .filter(
              (
                entry,
              ): entry is {
                join: "and" | "or";
                expression: ReturnType<typeof sql>;
              } => entry !== null,
            );

          return groupedExpressions.reduce<ReturnType<typeof sql> | undefined>(
            (combined, entry) => {
              if (!combined) return entry.expression;
              return entry.join === "or"
                ? sql`(${combined}) OR (${entry.expression})`
                : sql`(${combined}) AND (${entry.expression})`;
            },
            undefined,
          );
        }

        const filterExpressions = (input.filters ?? [])
          .map((filter) => ({
            join: filter.join ?? "and",
            expression: buildFilterExpression({
              columnId: filter.columnId,
              operator: filter.operator,
              value: filter.value,
            }),
          }))
          .filter(
            (
              entry,
            ): entry is {
              join: "and" | "or";
              expression: ReturnType<typeof sql>;
            } => entry.expression !== null,
          );

        return filterExpressions.reduce<ReturnType<typeof sql> | undefined>(
          (combined, entry) => {
            if (!combined) return entry.expression;
            return entry.join === "or"
              ? sql`(${combined}) OR (${entry.expression})`
              : sql`(${combined}) AND (${entry.expression})`;
          },
          undefined,
        );
      })();

      const searchExpression =
        normalizedSearchQuery.length > 0
          ? sql`${rows.cells}::text ILIKE ${`%${normalizedSearchQuery}%`}`
          : undefined;

      const normalizedSortRules = input.sort ?? [];
      const sortExpressions = normalizedSortRules.map((sortRule) => {
        const sortCellTextExpression = sql`COALESCE(${rows.cells} ->> ${sortRule.columnId}, '')`;
        const sortNumericExpression =
          sortRule.columnKind === "number"
            ? sql`CASE WHEN ${sortCellTextExpression} ~ ${`^-?[0-9]+(\\.[0-9]+)?$`} THEN ${sortCellTextExpression}::numeric ELSE NULL END`
            : undefined;
        const sortValueExpression = sortNumericExpression ?? sortCellTextExpression;
        return {
          sortRule,
          sortCellTextExpression,
          sortNumericExpression,
          sortValueExpression,
        };
      });
      const primarySortExpression = sortExpressions[0];
      const sortDirection = primarySortExpression?.sortRule.direction ?? "asc";

      const keysetExpression = (() => {
        if (useOffsetPagination || !keysetCursor) return undefined;

        const rowOrderTieBreaker =
          sortDirection === "desc"
            ? sql`(${rows.order} < ${keysetCursor.lastOrder} OR (${rows.order} = ${keysetCursor.lastOrder} AND ${rows.id} < ${keysetCursor.lastId}))`
            : sql`(${rows.order} > ${keysetCursor.lastOrder} OR (${rows.order} = ${keysetCursor.lastOrder} AND ${rows.id} > ${keysetCursor.lastId}))`;

        if (!primarySortExpression) {
          return rowOrderTieBreaker;
        }

        if (primarySortExpression.sortNumericExpression) {
          const cursorSortValue = keysetCursor.lastSortValue ?? "";
          const cursorNumericValue = Number(cursorSortValue);
          if (!Number.isFinite(cursorNumericValue)) {
            return rowOrderTieBreaker;
          }
          if (sortDirection === "desc") {
            return sql`((${primarySortExpression.sortNumericExpression} < ${cursorNumericValue}) OR (${primarySortExpression.sortNumericExpression} = ${cursorNumericValue} AND ${rowOrderTieBreaker}))`;
          }
          return sql`((${primarySortExpression.sortNumericExpression} > ${cursorNumericValue}) OR (${primarySortExpression.sortNumericExpression} = ${cursorNumericValue} AND ${rowOrderTieBreaker}))`;
        }

        const cursorSortValue = keysetCursor.lastSortValue ?? "";
        if (sortDirection === "desc") {
          return sql`((${primarySortExpression.sortCellTextExpression} < ${cursorSortValue}) OR (${primarySortExpression.sortCellTextExpression} = ${cursorSortValue} AND ${rowOrderTieBreaker}))`;
        }

        return sql`((${primarySortExpression.sortCellTextExpression} > ${cursorSortValue}) OR (${primarySortExpression.sortCellTextExpression} = ${cursorSortValue} AND ${rowOrderTieBreaker}))`;
      })();

      const whereClause = and(
        eq(rows.tableId, input.tableId),
        combinedFilterExpression,
        searchExpression,
        keysetExpression,
      );

      const orderBy =
        sortExpressions.length > 0
          ? [
              ...sortExpressions.map((expression) =>
                expression.sortRule.direction === "desc"
                  ? desc(expression.sortValueExpression)
                  : asc(expression.sortValueExpression),
              ),
              sortDirection === "desc" ? desc(rows.order) : asc(rows.order),
              sortDirection === "desc" ? desc(rows.id) : asc(rows.id),
            ]
          : sortDirection === "desc"
            ? [desc(rows.order), desc(rows.id)]
            : [asc(rows.order), asc(rows.id)];

      // Get rows with pagination
      const rowsData = await ctx.db.query.rows.findMany({
        where: whereClause,
        orderBy,
        limit: input.limit,
        ...(useOffsetPagination ? { offset: resolvedOffset } : {}),
      });

      // Count once on the first page. For keyset follow-up pages this saves a full-table count.
      const shouldFetchTotal = keysetCursor === null;
      const total = shouldFetchTotal
        ? (await ctx.db.select({ count: count() }).from(rows).where(whereClause))[0]?.count ?? 0
        : -1;

      let nextCursor: z.infer<typeof listCursorInputSchema> | null = null;
      if (rowsData.length >= input.limit) {
        if (useOffsetPagination) {
          nextCursor = resolvedOffset + rowsData.length;
        } else {
          const lastRow = rowsData.at(-1);
          if (lastRow) {
            nextCursor = {
              lastOrder: lastRow.order,
              lastId: lastRow.id,
              lastSortValue: primarySortExpression
                ? toCursorSortValue(
                    (lastRow.cells as Record<string, unknown>)[
                      primarySortExpression.sortRule.columnId
                    ],
                  )
                : undefined,
            };
          }
        }
      }

      return {
        rows: rowsData,
        total,
        nextCursor,
      };
    }),

  /**
   * Get a single row by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyRowOwnership(ctx, input.id);

      const row = await ctx.db.query.rows.findFirst({
        where: eq(rows.id, input.id),
      });

      return row ?? null;
    }),

  /**
   * Create a new row
   */
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        cells: z.record(z.string(), cellValueSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Get the max order value for rows in this table
      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${rows.order}), -1)` })
        .from(rows)
        .where(eq(rows.tableId, input.tableId));

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      // Create row
      const [newRow] = await ctx.db
        .insert(rows)
        .values({
          tableId: input.tableId,
          cells: input.cells,
          order: nextOrder,
        })
        .returning();

      return newRow;
    }),

  /**
   * Insert a new row relative to an anchor row ("above" or "below") by shifting
   * the integer `order` field of subsequent rows. This preserves Airtable-like
   * row ordering without fractional ranks.
   */
  insertRelative: protectedProcedure
    .input(
      z.object({
        anchorRowId: z.string().uuid(),
        position: z.enum(["above", "below"]),
        cells: z.record(z.string(), cellValueSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const anchor = await verifyRowOwnership(ctx, input.anchorRowId);

      const insertOrder = input.position === "above" ? anchor.order : anchor.order + 1;

      const [newRow] = await ctx.db.transaction(async (tx) => {
        // Shift any rows at/after the insertion point up by 1.
        await tx
          .update(rows)
          .set({ order: sql`${rows.order} + 1` })
          .where(and(eq(rows.tableId, anchor.tableId), gte(rows.order, insertOrder)));

        const [inserted] = await tx
          .insert(rows)
          .values({
            tableId: anchor.tableId,
            cells: input.cells,
            order: insertOrder,
          })
          .returning();

        return [inserted];
      });

      return newRow;
    }),

  /**
   * Update a row (partial cell update using JSONB merge)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        cells: z.record(z.string(), cellValueSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify row ownership
      await verifyRowOwnership(ctx, input.id);

      // Use JSONB concatenation operator to merge cells
      const [updatedRow] = await ctx.db
        .update(rows)
        .set({
          cells: sql`${rows.cells} || ${input.cells}::jsonb`,
        })
        .where(eq(rows.id, input.id))
        .returning();

      return updatedRow;
    }),

  /**
   * Update a single cell in a row
   */
  updateCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string().uuid(),
        columnId: z.string().uuid(),
        value: cellValueSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify row ownership
      await verifyRowOwnership(ctx, input.rowId);

      // Update single cell using JSONB set
      const [updatedRow] = await ctx.db
        .update(rows)
        .set({
          cells: sql`jsonb_set(${rows.cells}, ${`{${input.columnId}}`}, ${JSON.stringify(input.value)}::jsonb)`,
        })
        .where(eq(rows.id, input.rowId))
        .returning();

      return updatedRow;
    }),

  /**
   * Update many cells across rows in a single request.
   */
  bulkUpdateCells: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        updates: z
          .array(
            z.object({
              rowId: z.string().uuid(),
              columnId: z.string().uuid(),
              value: cellValueSchema,
            }),
          )
          .min(1)
          .max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTableOwnership(ctx, input.tableId);

      const updatesByRowId = new Map<string, Record<string, z.infer<typeof cellValueSchema>>>();
      for (const update of input.updates) {
        const existing = updatesByRowId.get(update.rowId) ?? {};
        existing[update.columnId] = update.value;
        updatesByRowId.set(update.rowId, existing);
      }

      if (updatesByRowId.size <= 0) {
        return { updatedRows: 0, updatedCells: 0 };
      }

      await ctx.db.transaction(async (transaction) => {
        await Promise.all(
          Array.from(updatesByRowId.entries()).map(([rowId, rowCells]) =>
            transaction
              .update(rows)
              .set({
                cells: sql`${rows.cells} || ${JSON.stringify(rowCells)}::jsonb`,
              })
              .where(and(eq(rows.id, rowId), eq(rows.tableId, input.tableId))),
          ),
        );
      });

      return {
        updatedRows: updatesByRowId.size,
        updatedCells: input.updates.length,
      };
    }),

  /**
   * Set one column value for all rows in a table
   */
  setColumnValue: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        columnId: z.string().uuid(),
        value: cellValueSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTableOwnership(ctx, input.tableId);

      const valueJson = JSON.stringify(input.value);

      await ctx.db
        .update(rows)
        .set({
          cells: sql`jsonb_set(${rows.cells}, ARRAY[${input.columnId}]::text[], ${valueJson}::jsonb, true)`,
        })
        .where(eq(rows.tableId, input.tableId));

      return { success: true };
    }),

  /**
   * Delete all rows for a table
   */
  clearByTableId: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTableOwnership(ctx, input.tableId);
      await ctx.db.delete(rows).where(eq(rows.tableId, input.tableId));
      return { success: true };
    }),

  /**
   * Delete a row
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify row ownership
      await verifyRowOwnership(ctx, input.id);

      await ctx.db.delete(rows).where(eq(rows.id, input.id));

      return { success: true };
    }),

  /**
   * Bulk create rows
   */
  bulkCreate: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        rows: z.array(
          z.object({
            cells: z.record(z.string(), cellValueSchema),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Get the max order value for rows in this table
      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${rows.order}), -1)` })
        .from(rows)
        .where(eq(rows.tableId, input.tableId));

      let nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      // Prepare rows with incrementing order
      const rowsToInsert = input.rows.map((row) => ({
        tableId: input.tableId,
        cells: row.cells,
        order: nextOrder++,
      }));

      // Bulk insert
      const createdRows = await ctx.db.insert(rows).values(rowsToInsert).returning();

      return createdRows;
    }),

  /**
   * Bulk create generated rows using one shared cell template.
   * Intended for large debug/perf datasets (e.g., 100k rows).
   */
  bulkCreateGenerated: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        count: z.number().int().min(1).max(100000),
        cells: z.record(z.string(), cellValueSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTableOwnership(ctx, input.tableId);

      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${rows.order}), -1)` })
        .from(rows)
        .where(eq(rows.tableId, input.tableId));

      let nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
      let inserted = 0;
      const chunkSize = 1000;

      while (inserted < input.count) {
        const currentChunkSize = Math.min(chunkSize, input.count - inserted);
        const rowsToInsert = Array.from({ length: currentChunkSize }, () => ({
          tableId: input.tableId,
          cells: input.cells,
          order: nextOrder++,
        }));

        await ctx.db.insert(rows).values(rowsToInsert);
        inserted += currentChunkSize;
      }

      return { inserted };
    }),
});
