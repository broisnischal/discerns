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

export const itemInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
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
  content: z.string().max(MAX_CONTENT_LENGTH, "Content is too large (512 KB max)").optional(),
  language: z.string().trim().max(40).nullish(),
  tags: tagsSchema.optional(),
  visibility: z.enum(ITEM_VISIBILITIES).optional(),
});
export type ItemPatch = z.input<typeof itemPatchSchema>;

export const listItemsSchema = z.object({
  scope: z.enum(["all", "mine", "shared"]).default("all"),
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
