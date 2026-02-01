import { eq, asc, sql, count } from "drizzle-orm";
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

export const rowRouter = createTRPCRouter({
  /**
   * List all rows for a table with pagination
   */
  listByTableId: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        limit: z.number().int().min(1).max(1000).default(100),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Get rows with pagination
      const rowsData = await ctx.db.query.rows.findMany({
        where: eq(rows.tableId, input.tableId),
        orderBy: asc(rows.order),
        limit: input.limit,
        offset: input.offset,
      });

      // Get total count
      const totalResult = await ctx.db
        .select({ count: count() })
        .from(rows)
        .where(eq(rows.tableId, input.tableId));

      return {
        rows: rowsData,
        total: totalResult[0]?.count ?? 0,
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
});
