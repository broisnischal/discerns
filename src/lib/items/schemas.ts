import { z } from "zod";

import { ITEM_KINDS, ITEM_VISIBILITIES, MEMBER_ROLES } from "#/lib/db/schema/types.ts";

// D1 caps a row at 2 MB; leave room for encryption overhead and the other columns.
export const MAX_CONTENT_LENGTH = 512 * 1024;

export const itemIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{6,32}$/, "Invalid item id");

const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(40))
  .max(20)
  .transform((tags) => [...new Set(tags)]);

/** A project id, its key (github.com/acme/api), a git remote URL, or its name. */
export const projectRefSchema = z.string().trim().min(1).max(300);

export const itemInputSchema = z.object({
  /** Optional: derived from the first line of content when left out. */
  title: z.string().trim().max(200).default(""),
  project: projectRefSchema.nullish(),
  content: z.string().max(MAX_CONTENT_LENGTH, "Content is too large (512 KB max)"),
  kind: z.enum(ITEM_KINDS).default("text"),
  language: z.string().trim().max(40).nullish(),
  tags: tagsSchema.default([]),
  visibility: z.enum(ITEM_VISIBILITIES).default("private"),
});
export type ItemInput = z.input<typeof itemInputSchema>;

export const itemPatchSchema = z.object({
  id: itemIdSchema,
  title: z.string().trim().min(1).max(200).optional(),
  /** Move to a project, or null to unfile. */
  project: projectRefSchema.nullable().optional(),
  content: z.string().max(MAX_CONTENT_LENGTH, "Content is too large (512 KB max)").optional(),
  language: z.string().trim().max(40).nullish(),
  tags: tagsSchema.optional(),
  visibility: z.enum(ITEM_VISIBILITIES).optional(),
});
export type ItemPatch = z.input<typeof itemPatchSchema>;

export const listItemsSchema = z.object({
  scope: z.enum(["all", "mine", "shared"]).default("all"),
  /** Only items in this project, or "unfiled" for items in no project. */
  project: projectRefSchema.optional(),
  kind: z.enum(ITEM_KINDS).optional(),
  /** Only items owned by this person (matched on email or name). */
  owner: z.string().trim().max(200).optional(),
  query: z.string().trim().max(200).optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).default(0),
});
export type ListItemsInput = z.input<typeof listItemsSchema>;

export const shareItemSchema = z.object({
  id: itemIdSchema,
  email: z.email().trim().toLowerCase(),
  role: z.enum(MEMBER_ROLES).default("viewer"),
});
export type ShareItemInput = z.input<typeof shareItemSchema>;

/** Caps keep a log well under D1's 2 MB row limit per entry and bounded in total. */
export const MAX_LOG_ENTRY_LENGTH = 64 * 1024;
export const MAX_LOG_ENTRIES = 5000;
export const MAX_LOG_BYTES = 4 * 1024 * 1024;

export const appendLogSchema = z.object({
  id: itemIdSchema,
  text: z.string().min(1).max(MAX_LOG_ENTRY_LENGTH, "Log entry is too large (64 KB max)"),
});
export type AppendLogInput = z.input<typeof appendLogSchema>;

export const tailLogSchema = z.object({
  id: itemIdSchema,
  /** Return entries with a seq greater than this. 0 reads from the start. */
  after: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(1000).default(500),
});
export type TailLogInput = z.input<typeof tailLogSchema>;

export const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  /** Git remote URL or normalized key; lets agents find the project from the repo. */
  key: z.string().trim().max(300).nullish(),
});
export type ProjectInput = z.input<typeof projectInputSchema>;

export const projectPatchSchema = z.object({
  id: itemIdSchema,
  name: z.string().trim().min(1).max(100).optional(),
  key: z.string().trim().max(300).nullable().optional(),
});
export type ProjectPatch = z.input<typeof projectPatchSchema>;

export const shareProjectSchema = z.object({
  id: itemIdSchema,
  email: z.email().trim().toLowerCase(),
  role: z.enum(MEMBER_ROLES).default("viewer"),
});
export type ShareProjectInput = z.input<typeof shareProjectSchema>;
