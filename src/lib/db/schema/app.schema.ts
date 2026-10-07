import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";
import type { ChangeSource, ItemKind, ItemVisibility, MemberRole } from "./types";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

/**
 * A folder of items, usually one per repository. `key` is the normalized git remote
 * (github.com/acme/api) so an agent can find the project from the repo it is working in.
 */
export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("project_owner_key_idx").on(t.ownerId, t.key)],
);

/** Membership in a project grants that role on every item in it. */
export const projectMember = sqliteTable(
  "project_member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull().default("viewer"),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    index("project_member_user_idx").on(t.userId),
  ],
);

export const item = sqliteTable(
  "item",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    kind: text("kind").$type<ItemKind>().notNull().default("text"),
    title: text("title").notNull(),
    // Env items hold AES-GCM ciphertext here; see lib/crypto.server.ts.
    content: text("content").notNull(),
    encrypted: integer("encrypted", { mode: "boolean" }).notNull().default(false),
    language: text("language"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    visibility: text("visibility").$type<ItemVisibility>().notNull().default("private"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("item_owner_updated_idx").on(t.ownerId, t.updatedAt),
    index("item_visibility_idx").on(t.visibility),
    index("item_project_idx").on(t.projectId),
  ],
);

/** Every saved state of an item, including the first one. */
export const itemVersion = sqliteTable(
  "item_version",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    encrypted: integer("encrypted", { mode: "boolean" }).notNull().default(false),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    source: text("source").$type<ChangeSource>().notNull().default("web"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("item_version_item_version_idx").on(t.itemId, t.version)],
);

export const itemMember = sqliteTable(
  "item_member",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull().default("viewer"),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.userId] }),
    index("item_member_user_idx").on(t.userId),
  ],
);

/**
 * An invite for an email that has no account yet. It turns into an item_member
 * row when someone signs in with that email, or opens the invite link.
 */
export const itemInvite = sqliteTable(
  "item_invite",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").$type<MemberRole>().notNull().default("viewer"),
    token: text("token").notNull().unique(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("item_invite_item_email_idx").on(t.itemId, t.email),
    index("item_invite_email_idx").on(t.email),
  ],
);

/**
 * One appended line (or block) of a `log` item. Logs are append-only: agents and
 * collaborators add entries while they work, and everyone tails them by `seq`.
 */
export const logEntry = sqliteTable(
  "log_entry",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    body: text("body").notNull(),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    source: text("source").$type<ChangeSource>().notNull().default("web"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("log_entry_item_seq_idx").on(t.itemId, t.seq)],
);

/**
 * The user's paid plan, mirrored from Dodo Payments webhooks. One row per user; the
 * latest subscription wins. Plan logic lives in lib/billing.
 */
export const subscription = sqliteTable("subscription", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dodoSubscriptionId: text("dodo_subscription_id").notNull(),
  productId: text("product_id").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});
