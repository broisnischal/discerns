import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { _getUser } from "#/lib/auth/functions.ts";
import { authMiddleware, freshAuthMiddleware } from "#/lib/auth/middleware.ts";
import { getBilling } from "#/lib/billing/billing.server.ts";
import { serverEnv } from "#/lib/env.server.ts";
import {
  appendLogSchema,
  itemIdSchema,
  itemInputSchema,
  itemPatchSchema,
  listItemsSchema,
  projectInputSchema,
  projectPatchSchema,
  projectRefSchema,
  shareItemSchema,
  shareProjectSchema,
  tailLogSchema,
} from "#/lib/items/schemas.ts";
import * as items from "#/lib/items/service.server.ts";

const versionSchema = z.object({ id: itemIdSchema, version: z.number().int().min(1) });
const idSchema = z.object({ id: itemIdSchema });

export const $listItems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(listItemsSchema)
  .handler(({ context, data }) => items.listItems(context.user.id, data));

export const $listSharers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => items.listSharers(context.user.id));

// Public and link items are readable without signing in, so no auth middleware here.
export const $getItem = createServerFn({ method: "GET" })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const user = await _getUser();
    return items.getItem(data.id, user?.id ?? null);
  });

export const $createItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(itemInputSchema)
  .handler(({ context, data }) =>
    items.createItem({ userId: context.user.id, source: "web" }, data),
  );

export const $updateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(itemPatchSchema)
  .handler(({ context, data }) =>
    items.updateItem({ userId: context.user.id, source: "web" }, data),
  );

export const $deleteItem = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(idSchema)
  .handler(({ context, data }) =>
    items.deleteItem({ userId: context.user.id, source: "web" }, data.id),
  );

export const $listVersions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(idSchema)
  .handler(({ context, data }) => items.listVersions(context.user.id, data.id));

export const $getVersion = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(versionSchema)
  .handler(({ context, data }) => items.getVersion(context.user.id, data.id, data.version));

export const $restoreVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(versionSchema)
  .handler(({ context, data }) =>
    items.restoreVersion({ userId: context.user.id, source: "web" }, data.id, data.version),
  );

export const $listCollaborators = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(idSchema)
  .handler(({ context, data }) => items.listCollaborators(context.user.id, data.id));

export const $shareItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(shareItemSchema)
  .handler(({ context, data }) =>
    items.shareItem({ userId: context.user.id, source: "web" }, data),
  );

export const $unshareItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: itemIdSchema, email: z.email() }))
  .handler(({ context, data }) =>
    items.unshareItem({ userId: context.user.id, source: "web" }, data.id, data.email),
  );

export const $acceptInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ token: z.string().min(16).max(64) }))
  .handler(({ context, data }) => items.acceptInvite(context.user.id, data.token));

export const $appendLog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(appendLogSchema)
  .handler(({ context, data }) =>
    items.appendLog({ userId: context.user.id, source: "web" }, data),
  );

// Link and public logs can be tailed without signing in, like $getItem.
export const $tailLog = createServerFn({ method: "GET" })
  .validator(tailLogSchema)
  .handler(async ({ data }) => {
    const user = await _getUser();
    return items.tailLog(user?.id ?? null, data);
  });

export const $listProjects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => items.listProjects(context.user.id));

export const $createProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(projectInputSchema)
  .handler(({ context, data }) =>
    items.createProject({ userId: context.user.id, source: "web" }, data),
  );

export const $updateProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(projectPatchSchema)
  .handler(({ context, data }) =>
    items.updateProject({ userId: context.user.id, source: "web" }, data),
  );

export const $deleteProject = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(idSchema)
  .handler(({ context, data }) =>
    items.deleteProject({ userId: context.user.id, source: "web" }, data.id),
  );

export const $listProjectMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: projectRefSchema }))
  .handler(({ context, data }) => items.listProjectMembers(context.user.id, data.id));

export const $shareProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(shareProjectSchema)
  .handler(({ context, data }) =>
    items.shareProject({ userId: context.user.id, source: "web" }, data),
  );

export const $unshareProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: itemIdSchema, email: z.email() }))
  .handler(({ context, data }) =>
    items.unshareProject({ userId: context.user.id, source: "web" }, data.id, data.email),
  );

export const $listContacts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => items.listContacts(context.user.id));

export const $getBilling = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => getBilling(context.user.id));

/** Public: which offers the pricing section can show. No user data. */
export const $getPricing = createServerFn({ method: "GET" }).handler(() => {
  const env = serverEnv();
  return {
    yearly: Boolean(env.DODO_PRO_YEARLY_PRODUCT_ID),
    intro: Boolean(env.DODO_INTRO_DISCOUNT_CODE),
  };
});
