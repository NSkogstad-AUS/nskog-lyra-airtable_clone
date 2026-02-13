import { sql } from "drizzle-orm";
import { createHash } from "crypto";
import type { ProtectedTRPCContext } from "~/server/api/trpc";

const ensuredIndexKeys = new Set<string>();
const ensuredTrgm = { value: false };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_REGEX.test(value);

const shortHash = (value: string) =>
  createHash("sha1").update(value).digest("hex").slice(0, 8);

const makeIndexName = (prefix: string, tableId: string, columnId: string) =>
  `${prefix}_${shortHash(tableId)}_${shortHash(columnId)}`;

export const ensureColumnIndexes = async (
  ctx: ProtectedTRPCContext,
  tableId: string,
  columnId: string,
  type: "text" | "number",
): Promise<void> => {
  if (!isUuid(tableId) || !isUuid(columnId)) return;
  const key = `${tableId}:${columnId}:${type}`;
  if (ensuredIndexKeys.has(key)) return;

  try {
    if (type === "text") {
      if (!ensuredTrgm.value) {
        await ctx.db.execute(sql.raw("CREATE EXTENSION IF NOT EXISTS pg_trgm"));
        ensuredTrgm.value = true;
      }
      const trgmName = makeIndexName("row_txt_trgm", tableId, columnId);
      const sortName = makeIndexName("row_txt_sort", tableId, columnId);
      await ctx.db.execute(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS ${trgmName} ON "row" USING gin (LOWER((cells ->> '${columnId}')) gin_trgm_ops) WHERE "tableId" = '${tableId}'`,
        ),
      );
      await ctx.db.execute(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS ${sortName} ON "row" (LOWER((cells ->> '${columnId}'))) WHERE "tableId" = '${tableId}'`,
        ),
      );
    }

    if (type === "number") {
      const numName = makeIndexName("row_num", tableId, columnId);
      await ctx.db.execute(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS ${numName} ON "row" (CASE WHEN trim((cells ->> '${columnId}')) ~ '^-?[0-9]+(\\\\.[0-9]+)?$' THEN trim((cells ->> '${columnId}'))::numeric ELSE NULL END) WHERE "tableId" = '${tableId}'`,
        ),
      );
    }
  } catch {
    // Index creation is best-effort; ignore failures (e.g. insufficient permissions).
  } finally {
    ensuredIndexKeys.add(key);
  }
};
