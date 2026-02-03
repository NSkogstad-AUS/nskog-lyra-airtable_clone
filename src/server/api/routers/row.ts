import { eq, and, asc, desc, sql, count } from "drizzle-orm";
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
  "is",
  "isNot",
  "isEmpty",
  "isNotEmpty",
]);
const filterJoinSchema = z.enum(["and", "or"]);
const sortDirectionSchema = z.enum(["asc", "desc"]);
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

  switch (filter.operator) {
    case "contains":
      if (!normalizedValue) return null;
      return sql`${cellText} ILIKE ${`%${normalizedValue}%`}`;
    case "doesNotContain":
      if (!normalizedValue) return null;
      return sql`${cellText} NOT ILIKE ${`%${normalizedValue}%`}`;
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
        sort: z
          .object({
            columnId: z.string().uuid(),
            direction: sortDirectionSchema,
          })
          .optional(),
        filters: z
          .array(
            z.object({
              columnId: z.string().uuid(),
              operator: filterOperatorSchema,
              value: z.string().trim().max(200).optional(),
              join: filterJoinSchema.optional(),
            }),
          )
          .max(30)
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
        offsetCursor !== undefined || typeof input.offset === "number";
      const resolvedOffset = offsetCursor ?? input.offset ?? 0;
      const normalizedSearchQuery = input.searchQuery?.trim() ?? "";
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

      const combinedFilterExpression = filterExpressions.reduce<ReturnType<typeof sql> | undefined>(
        (combined, entry) => {
          if (!combined) return entry.expression;
          return entry.join === "or"
            ? sql`(${combined}) OR (${entry.expression})`
            : sql`(${combined}) AND (${entry.expression})`;
        },
        undefined,
      );

      const searchExpression =
        normalizedSearchQuery.length > 0
          ? sql`${rows.cells}::text ILIKE ${`%${normalizedSearchQuery}%`}`
          : undefined;

      const sortDirection = input.sort?.direction ?? "asc";
      const sortValueExpression = input.sort
        ? sql`COALESCE(${rows.cells} ->> ${input.sort.columnId}, '')`
        : undefined;

      const keysetExpression = (() => {
        if (useOffsetPagination || !keysetCursor) return undefined;

        const rowOrderTieBreaker =
          sortDirection === "desc"
            ? sql`(${rows.order} < ${keysetCursor.lastOrder} OR (${rows.order} = ${keysetCursor.lastOrder} AND ${rows.id} < ${keysetCursor.lastId}))`
            : sql`(${rows.order} > ${keysetCursor.lastOrder} OR (${rows.order} = ${keysetCursor.lastOrder} AND ${rows.id} > ${keysetCursor.lastId}))`;

        if (!sortValueExpression) {
          return rowOrderTieBreaker;
        }

        const cursorSortValue = keysetCursor.lastSortValue ?? "";
        if (sortDirection === "desc") {
          return sql`((${sortValueExpression} < ${cursorSortValue}) OR (${sortValueExpression} = ${cursorSortValue} AND ${rowOrderTieBreaker}))`;
        }

        return sql`((${sortValueExpression} > ${cursorSortValue}) OR (${sortValueExpression} = ${cursorSortValue} AND ${rowOrderTieBreaker}))`;
      })();

      const whereClause = and(
        eq(rows.tableId, input.tableId),
        combinedFilterExpression,
        searchExpression,
        keysetExpression,
      );

      const orderBy = sortValueExpression
        ? sortDirection === "desc"
          ? [desc(sortValueExpression), desc(rows.order), desc(rows.id)]
          : [asc(sortValueExpression), asc(rows.order), asc(rows.id)]
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
              lastSortValue: input.sort
                ? toCursorSortValue(
                    (lastRow.cells as Record<string, unknown>)[input.sort.columnId],
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
