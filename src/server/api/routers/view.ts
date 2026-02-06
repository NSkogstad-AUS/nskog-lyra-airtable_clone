import { eq, asc, count, sql, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  type ProtectedTRPCContext,
} from "~/server/api/trpc";
import { views, tables, rows, userViewFavorites } from "~/server/db/schema";

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
 * Helper function to verify view ownership
 */
async function verifyViewOwnership(ctx: ProtectedTRPCContext, viewId: string) {
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
   * List all views for a table (ordered by order field)
   */
  listByTableId: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Query views ordered by order field
      return await ctx.db.query.views.findMany({
        where: eq(views.tableId, input.tableId),
        orderBy: (views, { asc }) => [asc(views.order)],
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
        columnOrder: z.array(z.string().uuid()).optional(),
        searchQuery: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Get the max order value for views in this table
      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${views.order}), -1)` })
        .from(views)
        .where(eq(views.tableId, input.tableId));

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      // Create view with order
      const [newView] = await ctx.db
        .insert(views)
        .values({
          tableId: input.tableId,
          name: input.name,
          order: nextOrder,
          filters: input.filters ?? [],
          sort: input.sort ?? null,
          hiddenColumnIds: input.hiddenColumnIds ?? [],
          columnOrder: input.columnOrder ?? [],
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
        columnOrder: z.array(z.string().uuid()).optional(),
        searchQuery: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify view ownership. Treat missing views as a no-op to avoid
      // surfacing errors when a stale autosave races with a delete.
      try {
        await verifyViewOwnership(ctx, input.id);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return null;
        }
        throw error;
      }

      const updateData: {
        name?: string;
        filters?: unknown;
        sort?: unknown;
        hiddenColumnIds?: string[];
        columnOrder?: string[];
        searchQuery?: string | null;
      } = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.filters !== undefined) updateData.filters = input.filters;
      if (input.sort !== undefined) updateData.sort = input.sort;
      if (input.hiddenColumnIds !== undefined)
        updateData.hiddenColumnIds = input.hiddenColumnIds;
      if (input.columnOrder !== undefined)
        updateData.columnOrder = input.columnOrder;
      if (input.searchQuery !== undefined) updateData.searchQuery = input.searchQuery;

      // Guard against no-op payloads, which can generate invalid SQL updates.
      if (Object.keys(updateData).length === 0) {
        const currentView = await ctx.db.query.views.findFirst({
          where: eq(views.id, input.id),
        });
        return currentView ?? null;
      }

      const [updatedView] = await ctx.db
        .update(views)
        .set(updateData)
        .where(eq(views.id, input.id))
        .returning();

      return updatedView ?? null;
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
   * Reorder views within a table
   */
  reorder: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        viewIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Update order for each view in a transaction
      await ctx.db.transaction(async (tx) => {
        for (let i = 0; i < input.viewIds.length; i++) {
          const viewId = input.viewIds[i];
          if (!viewId) continue;
          await tx
            .update(views)
            .set({ order: i })
            .where(and(eq(views.id, viewId), eq(views.tableId, input.tableId)));
        }
      });

      return { success: true };
    }),

  /**
   * Add a view to user's favorites
   */
  addFavorite: protectedProcedure
    .input(z.object({ viewId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify view ownership
      await verifyViewOwnership(ctx, input.viewId);

      // Add to favorites (upsert to handle duplicates)
      await ctx.db
        .insert(userViewFavorites)
        .values({
          userId: ctx.session.user.id,
          viewId: input.viewId,
        })
        .onConflictDoNothing();

      return { success: true };
    }),

  /**
   * Remove a view from user's favorites
   */
  removeFavorite: protectedProcedure
    .input(z.object({ viewId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userViewFavorites)
        .where(
          and(
            eq(userViewFavorites.userId, ctx.session.user.id),
            eq(userViewFavorites.viewId, input.viewId),
          ),
        );

      return { success: true };
    }),

  /**
   * List user's favorite view IDs for a table
   */
  listFavorites: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      await verifyTableOwnership(ctx, input.tableId);

      // Get all views for this table
      const tableViews = await ctx.db.query.views.findMany({
        where: eq(views.tableId, input.tableId),
        columns: { id: true },
      });
      const tableViewIds = tableViews.map((v) => v.id);

      if (tableViewIds.length === 0) {
        return [];
      }

      // Get user's favorites that belong to this table
      const favorites = await ctx.db.query.userViewFavorites.findMany({
        where: and(
          eq(userViewFavorites.userId, ctx.session.user.id),
          inArray(userViewFavorites.viewId, tableViewIds),
        ),
        columns: { viewId: true },
      });

      return favorites.map((f) => f.viewId);
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
