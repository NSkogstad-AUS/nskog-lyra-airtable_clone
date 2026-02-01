import { eq, and, asc, desc, sql, count } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { views, tables, rows } from "~/server/db/schema";

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
 * Helper function to verify view ownership
 */
async function verifyViewOwnership(
  ctx: { db: any; session: { user: { id: string } } },
  viewId: string,
) {
  const view = await ctx.db.query.views.findFirst({
    where: eq(views.id, viewId),
    with: {
      table: {
        with: {
          base: true,
        },
      },
    },
  });

  if (!view) {
    throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
  }

  if (view.table.base.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this view",
    });
  }

  return view;
}

export const viewRouter = createTRPCRouter({
  /**
   * List all views for a table
   */
  listByTableId: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Query views
      return await ctx.db.query.views.findMany({
        where: eq(views.tableId, input.tableId),
        orderBy: (views, { asc }) => [asc(views.name)],
      });
    }),

  /**
   * Get a single view by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyViewOwnership(ctx, input.id);

      const view = await ctx.db.query.views.findFirst({
        where: eq(views.id, input.id),
      });

      return view ?? null;
    }),

  /**
   * Create a new view
   */
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        name: z.string().min(1).max(255),
        filters: z.any().optional(), // TODO: Add proper filter schema
        sort: z.any().optional(), // TODO: Add proper sort schema
        hiddenColumnIds: z.array(z.string().uuid()).optional(),
        searchQuery: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Create view
      const [newView] = await ctx.db
        .insert(views)
        .values({
          tableId: input.tableId,
          name: input.name,
          filters: input.filters ?? [],
          sort: input.sort ?? null,
          hiddenColumnIds: input.hiddenColumnIds ?? [],
          searchQuery: input.searchQuery ?? null,
        })
        .returning();

      return newView;
    }),

  /**
   * Update a view
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        filters: z.any().optional(),
        sort: z.any().optional(),
        hiddenColumnIds: z.array(z.string().uuid()).optional(),
        searchQuery: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify view ownership
      await verifyViewOwnership(ctx, input.id);

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.filters !== undefined) updateData.filters = input.filters;
      if (input.sort !== undefined) updateData.sort = input.sort;
      if (input.hiddenColumnIds !== undefined) updateData.hiddenColumnIds = input.hiddenColumnIds;
      if (input.searchQuery !== undefined) updateData.searchQuery = input.searchQuery;

      const [updatedView] = await ctx.db
        .update(views)
        .set(updateData)
        .where(eq(views.id, input.id))
        .returning();

      return updatedView;
    }),

  /**
   * Delete a view
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify view ownership
      await verifyViewOwnership(ctx, input.id);

      await ctx.db.delete(views).where(eq(views.id, input.id));

      return { success: true };
    }),

  /**
   * Apply view filters and return rows
   * Basic implementation - can be enhanced with complex filtering later
   */
  applyView: protectedProcedure
    .input(
      z.object({
        viewId: z.string().uuid(),
        limit: z.number().int().min(1).max(1000).default(100),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify view ownership and get view data
      const view = await verifyViewOwnership(ctx, input.viewId);

      // Get rows from the table
      // TODO: Apply filters, sorting, and search from view configuration
      // For now, return all rows with basic pagination
      const rowsData = await ctx.db.query.rows.findMany({
        where: eq(rows.tableId, view.tableId),
        orderBy: asc(rows.order),
        limit: input.limit,
        offset: input.offset,
      });

      // Get total count
      const totalResult = await ctx.db
        .select({ count: count() })
        .from(rows)
        .where(eq(rows.tableId, view.tableId));

      return {
        rows: rowsData,
        total: totalResult[0]?.count ?? 0,
      };
    }),
});
