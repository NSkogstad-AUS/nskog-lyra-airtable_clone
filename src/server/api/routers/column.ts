import { eq, and, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { columns, tables, bases } from "~/server/db/schema";

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

/**
 * Helper function to verify column ownership
 */
async function verifyColumnOwnership(
  ctx: { db: any; session: { user: { id: string } } },
  columnId: string,
) {
  const column = await ctx.db.query.columns.findFirst({
    where: eq(columns.id, columnId),
    with: {
      table: {
        with: {
          base: true,
        },
      },
    },
  });

  if (!column) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });
  }

  if (column.table.base.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this column",
    });
  }

  return column;
}

export const columnRouter = createTRPCRouter({
  /**
   * List all columns for a table
   */
  listByTableId: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Query columns
      return await ctx.db.query.columns.findMany({
        where: eq(columns.tableId, input.tableId),
        orderBy: asc(columns.order),
      });
    }),

  /**
   * Get a single column by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyColumnOwnership(ctx, input.id);

      const column = await ctx.db.query.columns.findFirst({
        where: eq(columns.id, input.id),
      });

      return column ?? null;
    }),

  /**
   * Create a new column
   */
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        name: z.string().min(1).max(255),
        type: z.enum(["text", "number"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Get the max order value for columns in this table
      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${columns.order}), -1)` })
        .from(columns)
        .where(eq(columns.tableId, input.tableId));

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      // Create column
      const [newColumn] = await ctx.db
        .insert(columns)
        .values({
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          order: nextOrder,
        })
        .returning();

      return newColumn;
    }),

  /**
   * Update a column
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(["text", "number"]).optional(),
        order: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify column ownership
      await verifyColumnOwnership(ctx, input.id);

      const updateData: { name?: string; type?: "text" | "number"; order?: number } = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.order !== undefined) updateData.order = input.order;

      const [updatedColumn] = await ctx.db
        .update(columns)
        .set(updateData)
        .where(eq(columns.id, input.id))
        .returning();

      return updatedColumn;
    }),

  /**
   * Delete a column
   * Note: Cell data with this columnId will remain in rows (orphaned)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify column ownership
      await verifyColumnOwnership(ctx, input.id);

      await ctx.db.delete(columns).where(eq(columns.id, input.id));

      return { success: true };
    }),

  /**
   * Reorder columns in a table
   */
  reorder: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        columnIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Update order for each column
      await Promise.all(
        input.columnIds.map((columnId, index) =>
          ctx.db
            .update(columns)
            .set({ order: index })
            .where(and(eq(columns.id, columnId), eq(columns.tableId, input.tableId))),
        ),
      );

      return { success: true };
    }),
});
