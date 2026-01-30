import { baseRouter } from "~/server/api/routers/base";
import { columnRouter } from "~/server/api/routers/column";
import { formRouter } from "~/server/api/routers/form";
import { postRouter } from "~/server/api/routers/post";
import { rowRouter } from "~/server/api/routers/row";
import { searchRouter } from "~/server/api/routers/search";
import { tableRouter } from "~/server/api/routers/table";
import { viewRouter } from "~/server/api/routers/view";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  bases: baseRouter,
  tables: tableRouter,
  columns: columnRouter,
  rows: rowRouter,
  views: viewRouter,
  search: searchRouter,
  forms: formRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
