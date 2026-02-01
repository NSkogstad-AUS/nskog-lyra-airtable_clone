import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * NextAuth.js Tables
 * Required for user authentication and session management
 */

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_userId_idx").on(account.userId),
  }),
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  }),
);

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

/**
 * Application Tables
 */

// Column type enum
export const columnTypeEnum = pgEnum("column_type", ["text", "number"]);

// Bases table
export const bases = pgTable(
  "base",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (base) => ({
    userIdIdx: index("base_userId_idx").on(base.userId),
  }),
);

// Tables table
export const tables = pgTable(
  "table",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baseId: uuid("baseId")
      .notNull()
      .references(() => bases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    baseIdIdx: index("table_baseId_idx").on(table.baseId),
  }),
);

// Columns table
export const columns = pgTable(
  "column",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableId: uuid("tableId")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: columnTypeEnum("type").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (column) => ({
    tableIdIdx: index("column_tableId_idx").on(column.tableId),
  }),
);

// Rows table
export const rows = pgTable(
  "row",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableId: uuid("tableId")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    cells: jsonb("cells").notNull().default({}),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (row) => ({
    tableIdIdx: index("row_tableId_idx").on(row.tableId),
    cellsIdx: index("row_cells_idx").using("gin", row.cells),
  }),
);

// Views table
export const views = pgTable(
  "view",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableId: uuid("tableId")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    filters: jsonb("filters").notNull().default([]),
    sort: jsonb("sort"),
    hiddenColumnIds: jsonb("hiddenColumnIds").notNull().default([]),
    searchQuery: text("searchQuery"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (view) => ({
    tableIdIdx: index("view_tableId_idx").on(view.tableId),
  }),
);

/**
 * Relations
 */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  bases: many(bases),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const basesRelations = relations(bases, ({ one, many }) => ({
  user: one(users, {
    fields: [bases.userId],
    references: [users.id],
  }),
  tables: many(tables),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  base: one(bases, {
    fields: [tables.baseId],
    references: [bases.id],
  }),
  columns: many(columns),
  rows: many(rows),
  views: many(views),
}));

export const columnsRelations = relations(columns, ({ one }) => ({
  table: one(tables, {
    fields: [columns.tableId],
    references: [tables.id],
  }),
}));

export const rowsRelations = relations(rows, ({ one }) => ({
  table: one(tables, {
    fields: [rows.tableId],
    references: [tables.id],
  }),
}));

export const viewsRelations = relations(views, ({ one }) => ({
  table: one(tables, {
    fields: [views.tableId],
    references: [tables.id],
  }),
}));
