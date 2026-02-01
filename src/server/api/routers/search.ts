import { eq, and, sql, or, ilike } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rows, tables, bases } from "~/server/db/schema";

/**
 * Helper function to verify that the user owns the base
 */
async function verifyBaseOwnership(
  ctx: { db: any; session: { user: { id: string } } },
  baseId: string,
) {
  const base = await ctx.db.query.bases.findFirst({
    where: and(eq(bases.id, baseId), eq(bases.userId, ctx.session.user.id)),
  });

  if (!base) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this base",
    });
  }

  return base;
}

/**
 * Helper function to verify that the user owns the table (through base ownership)
 */
async function verifyTableOwnership(
  ctx: { db: any; session: { user: { id: string } } },
  tableId: string,
) {
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

export const searchRouter = createTRPCRouter({
  /**
   * Search across all tables in a base
   * Uses JSONB text search for cell values
   */
  searchInBase: protectedProcedure
    .input(
      z.object({
        baseId: z.string().uuid(),
        query: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify base ownership
      await verifyBaseOwnership(ctx, input.baseId);

      // Get all tables in the base
      const tablesInBase = await ctx.db.query.tables.findMany({
        where: eq(tables.baseId, input.baseId),
      });

      // Search in each table
      const results = await Promise.all(
        tablesInBase.map(async (table) => {
          // Search for rows where the JSONB cells contain the search query
          // Using PostgreSQL's ->> operator to convert JSONB values to text for searching
          const matchingRows = await ctx.db
            .select()
            .from(rows)
            .where(
              and(
                eq(rows.tableId, table.id),
                sql`${rows.cells}::text ILIKE ${"%" + input.query + "%"}`,
              ),
            )
            .limit(input.limit);

          return {
            tableId: table.id,
            tableName: table.name,
            rows: matchingRows,
          };
        }),
      );

      // Filter out tables with no results
      return results.filter((result) => result.rows.length > 0);
    }),

  /**
   * Search within a specific table
   * Uses JSONB text search for cell values
   */
  searchInTable: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        query: z.string().min(1),
        limit: z.number().int().min(1).max(1000).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Search for rows where the JSONB cells contain the search query
      const matchingRows = await ctx.db
        .select()
        .from(rows)
        .where(
          and(
            eq(rows.tableId, input.tableId),
            sql`${rows.cells}::text ILIKE ${"%" + input.query + "%"}`,
          ),
        )
        .limit(input.limit);

      return matchingRows;
    }),
});
