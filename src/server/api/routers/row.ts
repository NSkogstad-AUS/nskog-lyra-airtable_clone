import { eq, and, asc, desc, sql, count, gte, gt, or } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  type ProtectedTRPCContext,
} from "~/server/api/trpc";
import { columns, rows, tables } from "~/server/db/schema";
import { ensureColumnIndexes } from "~/server/db/indexes";
import { faker } from "@faker-js/faker";

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
  columnKind: z.enum(["singleLineText", "number"]).optional(), // For optimized numeric filter handling
});
const listCursorSchema = z.object({
  lastOrder: z.number().int(),
  lastId: z.string().uuid(),
  lastSortValue: z.string().nullish(),
});
const listCursorInputSchema = z.union([z.number().int().min(0), listCursorSchema]);
const preparedTableIndexes = new Set<string>();

// Count cache for row queries - avoids expensive COUNT(*) on every getWindow call
const COUNT_CACHE_TTL_MS = 10000; // 10 seconds
const countCache = new Map<string, { count: number; timestamp: number }>();

const getCachedCount = (cacheKey: string): number | null => {
  const cached = countCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < COUNT_CACHE_TTL_MS) {
    return cached.count;
  }
  return null;
};

const setCachedCount = (cacheKey: string, count: number): void => {
  countCache.set(cacheKey, { count, timestamp: Date.now() });
  // Cleanup old entries if cache grows too large
  if (countCache.size > 1000) {
    const entries = [...countCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, 100);
    for (const [key] of toDelete) {
      countCache.delete(key);
    }
  }
};

// Invalidate count cache for a table (call after row mutations)
export const invalidateCountCache = (tableId: string): void => {
  for (const key of countCache.keys()) {
    if (key.startsWith(`${tableId}:`)) {
      countCache.delete(key);
    }
  }
};

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
  columnKind?: "singleLineText" | "number";
}) => {
  const normalizedValue = filter.value?.trim() ?? "";
  const cellText = sql`${rows.cells} ->> ${filter.columnId}`;
  const cellTextLower = sql`LOWER(${cellText})`;
  const normalizedValueLower = normalizedValue.toLowerCase();
  // Optimized: Skip regex validation when we know the column is numeric
  const numericCell = filter.columnKind === "number"
    ? sql`CASE WHEN trim(${cellText}) ~ ${"^-?[0-9]+(\\.[0-9]+)?$"} THEN trim(${cellText})::numeric ELSE NULL END`
    : sql`CASE WHEN trim(${cellText}) ~ ${"^-?[0-9]+(\\.[0-9]+)?$"} THEN trim(${cellText})::numeric ELSE NULL END`;

  switch (filter.operator) {
    case "contains":
      if (!normalizedValue) return null;
      return sql`${cellTextLower} LIKE ${`%${normalizedValueLower}%`}`;
    case "doesNotContain":
      if (!normalizedValue) return null;
      return sql`${cellTextLower} NOT LIKE ${`%${normalizedValueLower}%`}`;
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
      return sql`${cellText} IS NULL OR ${cellText} = ''`;
    case "isNotEmpty":
      return sql`${cellText} IS NOT NULL AND ${cellText} <> ''`;
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
                    columnKind: condition.columnKind,
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
              columnKind: filter.columnKind,
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
        const sortCellTextExpression = sql`LOWER(${rows.cells} ->> ${sortRule.columnId})`;
        const sortNumericTextExpression = sql`trim(${rows.cells} ->> ${sortRule.columnId})`;
        const sortNumericExpression =
          sortRule.columnKind === "number"
            ? sql`CASE WHEN ${sortNumericTextExpression} ~ ${`^-?[0-9]+(\\.[0-9]+)?$`} THEN ${sortNumericTextExpression}::numeric ELSE NULL END`
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

        const cursorSortValue = (keysetCursor.lastSortValue ?? "").toLowerCase();
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
   * Fetch a window of rows by absolute index (offset pagination).
   * Intended for windowed/virtualized clients.
   */
  getWindow: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        start: z.number().int().min(0),
        limit: z.number().int().min(1).max(1000).default(100),
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
        includeTotal: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        await verifyTableOwnership(ctx, input.tableId);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return { start: input.start, rows: [], total: 0 };
        }
        throw error;
      }

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
                    columnKind: condition.columnKind,
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
              columnKind: filter.columnKind,
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
        const sortCellTextExpression = sql`LOWER(${rows.cells} ->> ${sortRule.columnId})`;
        const sortNumericTextExpression = sql`trim(${rows.cells} ->> ${sortRule.columnId})`;
        const sortNumericExpression =
          sortRule.columnKind === "number"
            ? sql`CASE WHEN ${sortNumericTextExpression} ~ ${`^-?[0-9]+(\\.[0-9]+)?$`} THEN ${sortNumericTextExpression}::numeric ELSE NULL END`
            : undefined;
        const sortValueExpression = sortNumericExpression ?? sortCellTextExpression;
        return {
          sortRule,
          sortValueExpression,
        };
      });
      const sortDirection = sortExpressions[0]?.sortRule.direction ?? "asc";

      const whereClause = and(
        eq(rows.tableId, input.tableId),
        combinedFilterExpression,
        searchExpression,
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

      // Optimization: For high offsets with default sort order (no custom sort),
      // use seek-based pagination to avoid scanning and discarding rows
      const HIGH_OFFSET_THRESHOLD = 10000;
      const useSeekPagination =
        input.start > HIGH_OFFSET_THRESHOLD &&
        sortExpressions.length === 0 &&
        !combinedFilterExpression &&
        !searchExpression;

      let rowsData: typeof rows.$inferSelect[];
      if (useSeekPagination) {
        // For default sort (order, id), we can seek efficiently using the indexed columns
        // First, find the boundary row at the target offset
        const boundaryRow = await ctx.db.query.rows.findFirst({
          where: eq(rows.tableId, input.tableId),
          orderBy: [asc(rows.order), asc(rows.id)],
          offset: input.start,
          columns: { order: true, id: true },
        });

        if (boundaryRow) {
          // Fetch rows starting from the boundary using keyset pagination
          rowsData = await ctx.db.query.rows.findMany({
            where: and(
              eq(rows.tableId, input.tableId),
              or(
                gt(rows.order, boundaryRow.order),
                and(eq(rows.order, boundaryRow.order), gte(rows.id, boundaryRow.id))
              )
            ),
            orderBy: [asc(rows.order), asc(rows.id)],
            limit: input.limit,
          });
        } else {
          rowsData = [];
        }
      } else {
        // Standard offset pagination for filtered/sorted queries or lower offsets
        rowsData = await ctx.db.query.rows.findMany({
          where: whereClause,
          orderBy,
          limit: input.limit,
          offset: input.start,
        });
      }

      let total = -1;
      if (input.includeTotal !== false) {
        // Use cached count when available to avoid expensive COUNT(*) on every request
        const countCacheKey = `${input.tableId}:${normalizedSearchQuery}:${JSON.stringify(input.filterGroups ?? [])}:${JSON.stringify(input.filters ?? [])}`;
        const cached = getCachedCount(countCacheKey);
        if (cached !== null) {
          total = cached;
        } else {
          total =
            (await ctx.db.select({ count: count() }).from(rows).where(whereClause))[0]
              ?.count ?? 0;
          setCachedCount(countCacheKey, total);
        }
      }

      return {
        start: input.start,
        rows: rowsData,
        total,
      };
    }),

  /**
   * Count rows for a table with filters/search applied.
   * Kept separate from getWindow so row fetches stay fast.
   */
  getCount: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        searchQuery: z.string().trim().max(200).optional(),
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
        await verifyTableOwnership(ctx, input.tableId);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return { total: 0 };
        }
        throw error;
      }

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
                    columnKind: condition.columnKind,
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
              columnKind: filter.columnKind,
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

      const whereClause = and(
        eq(rows.tableId, input.tableId),
        combinedFilterExpression,
        searchExpression,
      );

      const countCacheKey = `${input.tableId}:${normalizedSearchQuery}:${JSON.stringify(input.filterGroups ?? [])}:${JSON.stringify(input.filters ?? [])}`;
      const cached = getCachedCount(countCacheKey);
      if (cached !== null) {
        return { total: cached };
      }

      const total =
        (await ctx.db.select({ count: count() }).from(rows).where(whereClause))[0]
          ?.count ?? 0;
      setCachedCount(countCacheKey, total);

      return { total };
    }),

  /**
   * Return the 0-based row indices (in the current sort/filter order) of rows
   * whose cell text matches a search query.  The client uses these to navigate
   * through ALL matches — not just the ones currently in the render window.
   */
  searchMatchIndices: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        searchQuery: z.string().trim().min(1).max(200),
        sort: z.array(sortConditionInputSchema).max(10).optional(),
        filterGroups: z
          .array(
            z.object({
              join: filterJoinSchema.optional(),
              conditions: z.array(filterConditionInputSchema).max(30),
            }),
          )
          .max(12)
          .optional(),
        limit: z.number().int().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        await verifyTableOwnership(ctx, input.tableId);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return { indices: [] };
        }
        throw error;
      }

      const normalizedSearchQuery = input.searchQuery.trim();
      if (normalizedSearchQuery.length === 0) {
        return { indices: [] };
      }

      // Build filter expression (same logic as getCount / getWindow)
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
                    columnKind: condition.columnKind,
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
        return undefined;
      })();

      // Build ORDER BY fragments for the ROW_NUMBER window function.
      const normalizedSortRules = input.sort ?? [];
      const sortFragments = normalizedSortRules.map((sortRule) => {
        const sortCellExpr = sql`LOWER(${rows.cells} ->> ${sortRule.columnId})`;
        const sortNumericExpr =
          sortRule.columnKind === "number"
            ? sql`CASE WHEN trim(${rows.cells} ->> ${sortRule.columnId}) ~ ${`^-?[0-9]+(\\.[0-9]+)?$`} THEN trim(${rows.cells} ->> ${sortRule.columnId})::numeric ELSE NULL END`
            : undefined;
        const valueExpr = sortNumericExpr ?? sortCellExpr;
        return sortRule.direction === "desc"
          ? sql`${valueExpr} DESC`
          : sql`${valueExpr} ASC`;
      });

      const sortDirection = normalizedSortRules[0]?.direction ?? "asc";
      const orderSuffix =
        sortDirection === "desc"
          ? [sql`${rows.order} DESC`, sql`${rows.id} DESC`]
          : [sql`${rows.order} ASC`, sql`${rows.id} ASC`];

      const orderByParts = [...sortFragments, ...orderSuffix];
      const orderByFragment = sql.join(orderByParts, sql`, `);

      const baseWhere = and(
        eq(rows.tableId, input.tableId),
        combinedFilterExpression,
      );

      const limitFragment =
        typeof input.limit === "number" ? sql`LIMIT ${input.limit}` : sql``;

      // Use a subquery: assign ROW_NUMBER in the filtered+sorted order,
      // then select only rows whose cells text matches the search.
      const result = await ctx.db.execute(
        sql`SELECT (sub.rn - 1)::integer AS idx
            FROM (
              SELECT ${rows.cells},
                     ROW_NUMBER() OVER (ORDER BY ${orderByFragment}) AS rn
              FROM ${rows}
              WHERE ${baseWhere ?? sql`TRUE`}
            ) sub
            WHERE sub.cells::text ILIKE ${`%${normalizedSearchQuery}%`}
            ORDER BY sub.rn
            ${limitFragment}`,
      );

      // drizzle-orm/postgres-js execute returns an array-like RowList.
      const resultRows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];
      const indices = (resultRows as { idx: number }[]).map((r) => Number(r.idx));
      return { indices };
    }),

  /**
   * Prebuild per-column indexes for faster first filter/sort.
   */
  prepareIndexes: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await verifyTableOwnership(ctx, input.tableId);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return { ok: false };
        }
        throw error;
      }

      if (preparedTableIndexes.has(input.tableId)) {
        return { ok: true, skipped: true };
      }
      preparedTableIndexes.add(input.tableId);

      const tableColumns = await ctx.db.query.columns.findMany({
        where: eq(columns.tableId, input.tableId),
        orderBy: asc(columns.order),
      });

      await Promise.all(
        tableColumns.map((column) =>
          ensureColumnIndexes(ctx, input.tableId, column.id, column.type),
        ),
      );

      return { ok: true };
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
        clientUiId: z.string().optional(),
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

      // Invalidate count cache for this table
      invalidateCountCache(input.tableId);

      return { ...newRow, clientUiId: input.clientUiId ?? null };
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
          .set({ order: sql`${rows.order} + 1`, updatedAt: sql`now()` })
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

      // Invalidate count cache for this table
      invalidateCountCache(anchor.tableId);

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
      // Verify row ownership and get tableId for cache invalidation
      const row = await verifyRowOwnership(ctx, input.id);

      await ctx.db.delete(rows).where(eq(rows.id, input.id));

      // Invalidate count cache for this table
      invalidateCountCache(row.tableId);

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

      // Invalidate count cache for this table
      invalidateCountCache(input.tableId);

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
        cells: z.record(z.string(), cellValueSchema).optional().default({}),
        generateFaker: z.boolean().optional(),
        fields: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              kind: z.enum(["singleLineText", "number"]),
            }),
          )
          .optional(),
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
      const chunkSize = 5000;

      const generateFakerCells = () => {
        const cells: Record<string, string> = {};
        (input.fields ?? []).forEach((field) => {
          const label = field.label.toLowerCase();
          if (label.includes("status")) {
            cells[field.id] = faker.helpers.arrayElement([
              "Planned",
              "In progress",
              "Review",
              "Done",
            ]);
            return;
          }
          if (label.includes("assignee") || label.includes("owner") || label.includes("assigned")) {
            cells[field.id] = faker.person.firstName();
            return;
          }
          if (label.includes("note") || label.includes("notes")) {
            cells[field.id] = faker.company.buzzPhrase();
            return;
          }
          if (label.includes("attachment") || label.includes("file")) {
            const filesCount = faker.number.int({ min: 0, max: 3 });
            cells[field.id] = filesCount <= 0 ? "—" : `${filesCount} file${filesCount === 1 ? "" : "s"}`;
            return;
          }
          if (label.includes("name") || label.includes("title")) {
            cells[field.id] = faker.company.buzzPhrase();
            return;
          }
          if (field.kind === "number") {
            cells[field.id] = String(faker.number.int({ min: 1, max: 10_000 }));
            return;
          }
          cells[field.id] = faker.word.words({ count: { min: 2, max: 4 } });
        });
        return cells;
      };

      const shouldGenerateFaker = Boolean(input.generateFaker && input.fields?.length);
      const baseCells = input.cells ?? {};

      while (inserted < input.count) {
        const currentChunkSize = Math.min(chunkSize, input.count - inserted);
        const rowsToInsert = Array.from({ length: currentChunkSize }, () => ({
          tableId: input.tableId,
          cells: shouldGenerateFaker ? generateFakerCells() : baseCells,
          order: nextOrder++,
        }));

        try {
          await ctx.db.insert(rows).values(rowsToInsert);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("bulkCreateGenerated failed", {
            tableId: input.tableId,
            chunkSize: currentChunkSize,
            nextOrder: nextOrder - currentChunkSize,
            error,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "bulkCreateGenerated failed",
            cause: error,
          });
        }
        inserted += currentChunkSize;
      }

      const total =
        (await ctx.db.select({ count: count() }).from(rows).where(eq(rows.tableId, input.tableId)))[0]
          ?.count ?? 0;
      invalidateCountCache(input.tableId);
      return { inserted, total };
    }),
});
