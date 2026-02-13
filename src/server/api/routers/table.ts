import { eq, and, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  type ProtectedTRPCContext,
} from "~/server/api/trpc";
import { tables, bases, columns, views } from "~/server/db/schema";
import { ensureColumnIndexes } from "~/server/db/indexes";

/**
 * Helper function to verify that the user owns the base
 */
async function verifyBaseOwnership(ctx: ProtectedTRPCContext, baseId: string) {
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

export const tableRouter = createTRPCRouter({
  /**
   * List all tables for a base (with ownership check)
   */
  listByBaseId: protectedProcedure
    .input(z.object({ baseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify base ownership
      await verifyBaseOwnership(ctx, input.baseId);

      // Query tables
      return await ctx.db.query.tables.findMany({
        where: eq(tables.baseId, input.baseId),
        orderBy: asc(tables.order),
      });
    }),

  /**
   * Get lightweight bootstrap data for a table in one request.
   * Includes table metadata, columns, and views.
   */
  getBootstrap: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const table = await verifyTableOwnership(ctx, input.tableId);

      const [tableColumns, tableViews] = await Promise.all([
        ctx.db.query.columns.findMany({
          where: eq(columns.tableId, input.tableId),
          orderBy: asc(columns.order),
        }),
        ctx.db.query.views.findMany({
          where: eq(views.tableId, input.tableId),
          orderBy: asc(views.order),
        }),
      ]);

      tableColumns.forEach((column) => {
        void ensureColumnIndexes(ctx, input.tableId, column.id, column.type);
      });

      return {
        table: {
          id: table.id,
          name: table.name,
          baseId: table.baseId,
          order: table.order,
        },
        columns: tableColumns,
        views: tableViews,
      };
    }),

  /**
   * Get a single table by ID (with ownership check)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyTableOwnership(ctx, input.id);

      const table = await ctx.db.query.tables.findFirst({
        where: eq(tables.id, input.id),
      });

      return table ?? null;
    }),

  /**
   * Create a new table in a base
   */
  create: protectedProcedure
    .input(
      z.object({
        baseId: z.string().uuid(),
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify base ownership
      await verifyBaseOwnership(ctx, input.baseId);

      // Get the max order value for tables in this base
      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${tables.order}), -1)` })
        .from(tables)
        .where(eq(tables.baseId, input.baseId));

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      // Create table
      const [newTable] = await ctx.db
        .insert(tables)
        .values({
          baseId: input.baseId,
          name: input.name,
          order: nextOrder,
        })
        .returning();

      return newTable;
    }),

  /**
   * Update a table (name and/or order)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        order: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.id);

      const updateData: { name?: string; order?: number } = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.order !== undefined) updateData.order = input.order;

      const [updatedTable] = await ctx.db
        .update(tables)
        .set(updateData)
        .where(eq(tables.id, input.id))
        .returning();

      return updatedTable;
    }),

  /**
   * Delete a table (with ownership check)
   * Cascades to all columns, rows, and views
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.id);

      await ctx.db.delete(tables).where(eq(tables.id, input.id));

      return { success: true };
    }),

  /**
   * Reorder tables in a base
   */
  reorder: protectedProcedure
    .input(
      z.object({
        baseId: z.string().uuid(),
        tableIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify base ownership
      await verifyBaseOwnership(ctx, input.baseId);

      // Update order for each table
      await Promise.all(
        input.tableIds.map((tableId, index) =>
          ctx.db
            .update(tables)
            .set({ order: index })
            .where(and(eq(tables.id, tableId), eq(tables.baseId, input.baseId))),
        ),
      );

      return { success: true };
    }),
});
