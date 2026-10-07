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

export const item = sqliteTable(
  "item",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
