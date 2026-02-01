import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { bases } from "~/server/db/schema";

export const baseRouter = createTRPCRouter({
  /**
   * List all bases for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.bases.findMany({
      where: eq(bases.userId, ctx.session.user.id),
      orderBy: (bases, { desc }) => [desc(bases.updatedAt)],
    });
  }),

  /**
   * Get a single base by ID (with ownership check)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.query.bases.findFirst({
        where: and(eq(bases.id, input.id), eq(bases.userId, ctx.session.user.id)),
      });

      return base ?? null;
    }),

  /**
   * Create a new base
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [newBase] = await ctx.db
        .insert(bases)
        .values({
          name: input.name,
          userId: ctx.session.user.id,
        })
        .returning();

      return newBase;
    }),

  /**
   * Update a base's name (with ownership check)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedBase] = await ctx.db
        .update(bases)
        .set({ name: input.name })
        .where(and(eq(bases.id, input.id), eq(bases.userId, ctx.session.user.id)))
        .returning();

      return updatedBase;
    }),

  /**
   * Delete a base (with ownership check)
   * Cascades to all tables, columns, rows, and views
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(bases)
        .where(and(eq(bases.id, input.id), eq(bases.userId, ctx.session.user.id)));

      return { success: true };
    }),
});
