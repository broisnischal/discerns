import "@tanstack/react-start/server-only";
import { and, desc, eq, exists, like, or, sql, type SQL } from "drizzle-orm";
import { createError } from "evlog";

import { decrypt, encrypt } from "#/lib/crypto.server.ts";
import { db } from "#/lib/db/index.ts";
import { item, itemInvite, itemMember, itemVersion, user } from "#/lib/db/schema/index.ts";
import type { ChangeSource, MemberRole } from "#/lib/db/schema/types.ts";
import { serverEnv } from "#/lib/env.server.ts";
import {
  allowedVisibility,
  canEdit,
  canManage,
  resolveAccess,
  type Access,
} from "#/lib/items/access.ts";
import {
  itemInputSchema,
  itemPatchSchema,
  listItemsSchema,
  shareItemSchema,
  type ItemInput,
  type ItemPatch,
  type ListItemsInput,
  type ShareItemInput,
} from "#/lib/items/schemas.ts";

export interface Actor {
  userId: string;
  source: ChangeSource;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function newId(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

export function itemUrl(id: string) {
  return new URL(`/p/${id}`, serverEnv().BASE_URL).toString();
}

const notFound = () =>
  createError({
    message: "Item not found",
    status: 404,
    why: "It does not exist, or it has not been shared with this account",
  });

const forbidden = (message: string) => createError({ message, status: 403 });

async function sealContent(content: string, encrypted: boolean) {
  return encrypted ? encrypt(content, serverEnv().ENCRYPTION_KEY) : content;
}

async function openContent(content: string, encrypted: boolean) {
  return encrypted ? decrypt(content, serverEnv().ENCRYPTION_KEY) : content;
}

/** Loads an item with the caller's access level. Throws 404 when the caller can't see it. */
async function loadItem(id: string, userId: string | null) {
  const row = await db
    .select({
      item,
      memberRole: itemMember.role,
      owner: { id: user.id, name: user.name, email: user.email, image: user.image },
    })
    .from(item)
    .innerJoin(user, eq(user.id, item.ownerId))
    .leftJoin(itemMember, and(eq(itemMember.itemId, item.id), eq(itemMember.userId, userId ?? "")))
    .where(eq(item.id, id))
    .get();

  if (!row) throw notFound();
  const access = resolveAccess(
    { ownerId: row.item.ownerId, visibility: row.item.visibility, memberRole: row.memberRole },
    userId,
  );
  if (!access) throw notFound();
  return { ...row, access };
}

export async function createItem(actor: Actor, input: ItemInput) {
  const data = itemInputSchema.parse(input);
  const id = newId();
  const encrypted = data.kind === "env";
  const content = await sealContent(data.content, encrypted);
  const visibility = allowedVisibility(data.kind, data.visibility);

  await db.batch([
    db.insert(item).values({
      id,
      ownerId: actor.userId,
      kind: data.kind,
      title: data.title,
      content,
      encrypted,
      language: data.language ?? null,
      tags: data.tags,
      visibility,
    }),
    db.insert(itemVersion).values({
      id: newId(16),
      itemId: id,
      version: 1,
      title: data.title,
      content,
      encrypted,
      authorId: actor.userId,
      source: actor.source,
    }),
  ]);

  return { id, url: itemUrl(id), version: 1, visibility };
}

export async function getItem(id: string, userId: string | null) {
  const { item: row, owner, access } = await loadItem(id, userId);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: await openContent(row.content, row.encrypted),
    language: row.language,
    tags: row.tags,
    visibility: row.visibility,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner,
    access,
    url: itemUrl(row.id),
  };
}
export type ItemDetail = Awaited<ReturnType<typeof getItem>>;

export async function updateItem(actor: Actor, patch: ItemPatch) {
  const data = itemPatchSchema.parse(patch);
  const { item: current, access } = await loadItem(data.id, actor.userId);
  if (!canEdit(access)) throw forbidden("Only the owner and editors can change this item");
  if (data.visibility && !canManage(access)) {
    throw forbidden("Only the owner can change who can see this item");
  }

  const title = data.title ?? current.title;
  const content =
    data.content === undefined
      ? current.content
      : await sealContent(data.content, current.encrypted);
  const contentChanged = data.content !== undefined || title !== current.title;
  const version = contentChanged ? current.version + 1 : current.version;

  const update = db
    .update(item)
    .set({
      title,
      content,
      version,
      language: data.language === undefined ? current.language : data.language,
      tags: data.tags ?? current.tags,
      visibility: data.visibility
        ? allowedVisibility(current.kind, data.visibility)
        : current.visibility,
    })
    .where(and(eq(item.id, current.id), eq(item.version, current.version)));

  if (contentChanged) {
    // The unique (item_id, version) index makes a concurrent edit fail the whole batch.
    await db
      .batch([
        update,
        db.insert(itemVersion).values({
          id: newId(16),
          itemId: current.id,
          version,
          title,
          content,
          encrypted: current.encrypted,
          authorId: actor.userId,
          source: actor.source,
        }),
      ])
      .catch((error: unknown) => {
        throw createError({
          message: "Someone else saved this item at the same time",
          status: 409,
          fix: "Reload it and apply the change again",
          cause: error instanceof Error ? error : undefined,
        });
      });
  } else {
    await update;
  }

  return { id: current.id, url: itemUrl(current.id), version };
}

export async function deleteItem(actor: Actor, id: string) {
  const { access } = await loadItem(id, actor.userId);
  if (!canManage(access)) throw forbidden("Only the owner can delete this item");
  await db.delete(item).where(eq(item.id, id));
}

export async function listItems(userId: string, input: ListItemsInput = {}) {
  const data = listItemsSchema.parse(input);

  const isMember = exists(
    db
      .select({ one: sql`1` })
      .from(itemMember)
      .where(and(eq(itemMember.itemId, item.id), eq(itemMember.userId, userId))),
  );
  const filters: (SQL | undefined)[] = [
    data.scope === "mine"
      ? eq(item.ownerId, userId)
      : data.scope === "shared"
        ? isMember
        : or(eq(item.ownerId, userId), isMember),
    data.kind ? eq(item.kind, data.kind) : undefined,
    data.tag
      ? exists(
          db
            .select({ one: sql`1` })
            .from(sql`json_each(${item.tags})`)
            .where(sql`value = ${data.tag}`),
        )
      : undefined,
  ];
  if (data.owner) {
    const pattern = `%${data.owner.toLowerCase()}%`;
    filters.push(
      or(like(sql`lower(${user.email})`, pattern), like(sql`lower(${user.name})`, pattern)),
    );
  }
  if (data.query) {
    const pattern = `%${data.query.toLowerCase()}%`;
    filters.push(
      or(
        like(sql`lower(${item.title})`, pattern),
        like(sql`lower(${item.tags})`, pattern),
        and(eq(item.encrypted, false), like(sql`lower(${item.content})`, pattern)),
      ),
    );
  }

  const rows = await db
    .select({
      id: item.id,
      kind: item.kind,
      title: item.title,
      tags: item.tags,
      visibility: item.visibility,
      version: item.version,
      updatedAt: item.updatedAt,
      ownerId: item.ownerId,
      ownerName: user.name,
      ownerEmail: user.email,
      ownerImage: user.image,
      memberRole: itemMember.role,
      preview: sql<string>`case when ${item.encrypted} then '' else substr(${item.content}, 1, 240) end`,
    })
    .from(item)
    .innerJoin(user, eq(user.id, item.ownerId))
    .leftJoin(itemMember, and(eq(itemMember.itemId, item.id), eq(itemMember.userId, userId)))
    .where(and(...filters))
    .orderBy(desc(item.updatedAt))
    .limit(data.limit)
    .offset(data.offset);

  return rows.map(({ memberRole, ...row }) => ({
    ...row,
    access: (row.ownerId === userId ? "owner" : memberRole) as Access,
    url: itemUrl(row.id),
  }));
}
export type ItemSummary = Awaited<ReturnType<typeof listItems>>[number];

export async function listVersions(userId: string, id: string) {
  const { access } = await loadItem(id, userId);
  // History is for the people working on the item, not for link viewers.
  if (access === "public") throw forbidden("History is only visible to collaborators");

  return db
    .select({
      version: itemVersion.version,
      title: itemVersion.title,
      source: itemVersion.source,
      createdAt: itemVersion.createdAt,
      authorName: user.name,
    })
    .from(itemVersion)
    .leftJoin(user, eq(user.id, itemVersion.authorId))
    .where(eq(itemVersion.itemId, id))
    .orderBy(desc(itemVersion.version));
}

export async function getVersion(userId: string, id: string, version: number) {
  const { access } = await loadItem(id, userId);
  if (access === "public") throw forbidden("History is only visible to collaborators");

  const row = await db
    .select()
    .from(itemVersion)
    .where(and(eq(itemVersion.itemId, id), eq(itemVersion.version, version)))
    .get();
  if (!row) throw createError({ message: "Version not found", status: 404 });

  return {
    version: row.version,
    title: row.title,
    content: await openContent(row.content, row.encrypted),
    source: row.source,
    createdAt: row.createdAt,
  };
}

export async function restoreVersion(actor: Actor, id: string, version: number) {
  const old = await getVersion(actor.userId, id, version);
  return updateItem(actor, { id, title: old.title, content: old.content });
}

export async function listCollaborators(userId: string, id: string) {
  const { access, owner } = await loadItem(id, userId);
  if (access === "public") throw forbidden("Only collaborators can see who has access");

  const [members, invites] = await Promise.all([
    db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: itemMember.role,
      })
      .from(itemMember)
      .innerJoin(user, eq(user.id, itemMember.userId))
      .where(eq(itemMember.itemId, id)),
    canManage(access)
      ? db
          .select({
            id: itemInvite.id,
            email: itemInvite.email,
            role: itemInvite.role,
            token: itemInvite.token,
          })
          .from(itemInvite)
          .where(eq(itemInvite.itemId, id))
      : [],
  ]);

  return {
    owner,
    members,
    invites: invites.map(({ token, ...invite }) => ({ ...invite, url: inviteUrl(token) })),
  };
}

function inviteUrl(token: string) {
  return new URL(`/invite/${token}`, serverEnv().BASE_URL).toString();
}

/**
 * Gives an email access to an item. People who already have an account get access
 * right away; anyone else gets an invite that is claimed when they sign in.
 */
export async function shareItem(actor: Actor, input: ShareItemInput) {
  const data = shareItemSchema.parse(input);
  const { access, owner } = await loadItem(data.id, actor.userId);
  if (!canManage(access)) throw forbidden("Only the owner can share this item");
  if (data.email === owner.email.toLowerCase()) {
    throw createError({ message: "You already own this item", status: 400 });
  }

  const existing = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(sql`lower(${user.email})`, data.email))
    .get();

  if (existing) {
    await addMember(data.id, existing.id, data.role, actor.userId);
    return {
      status: "added" as const,
      email: existing.email,
      name: existing.name,
      role: data.role,
    };
  }

  const token = newId(32);
  await db
    .insert(itemInvite)
    .values({
      id: newId(16),
      itemId: data.id,
      email: data.email,
      role: data.role,
      token,
      invitedBy: actor.userId,
    })
    .onConflictDoUpdate({
      target: [itemInvite.itemId, itemInvite.email],
      set: { role: data.role },
    });
  const invite = await db
    .select({ token: itemInvite.token })
    .from(itemInvite)
    .where(and(eq(itemInvite.itemId, data.id), eq(itemInvite.email, data.email)))
    .get();

  return {
    status: "invited" as const,
    email: data.email,
    role: data.role,
    inviteUrl: inviteUrl(invite?.token ?? token),
  };
}

function addMember(itemId: string, userId: string, role: MemberRole, invitedBy: string | null) {
  return db
    .insert(itemMember)
    .values({ itemId, userId, role, invitedBy })
    .onConflictDoUpdate({ target: [itemMember.itemId, itemMember.userId], set: { role } });
}

/** Removes a collaborator or a pending invite. Collaborators may also remove themselves. */
export async function unshareItem(actor: Actor, id: string, email: string) {
  const { access } = await loadItem(id, actor.userId);
  const target = email.trim().toLowerCase();
  const member = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, target))
    .get();

  const removingSelf = member?.id === actor.userId;
  if (!canManage(access) && !removingSelf)
    throw forbidden("Only the owner can change who has access");

  await db.batch([
    db
      .delete(itemMember)
      .where(and(eq(itemMember.itemId, id), eq(itemMember.userId, member?.id ?? ""))),
    db.delete(itemInvite).where(and(eq(itemInvite.itemId, id), eq(itemInvite.email, target))),
  ]);
}

export async function acceptInvite(userId: string, token: string) {
  const invite = await db.select().from(itemInvite).where(eq(itemInvite.token, token)).get();
  if (!invite) throw createError({ message: "This invite link is no longer valid", status: 404 });

  const owned = await db
    .select({ id: item.id })
    .from(item)
    .where(and(eq(item.id, invite.itemId), eq(item.ownerId, userId)))
    .get();
  if (!owned) {
    await addMember(invite.itemId, userId, invite.role, invite.invitedBy);
  }
  await db.delete(itemInvite).where(eq(itemInvite.id, invite.id));
  return { itemId: invite.itemId };
}

/** Converts every pending invite for this email into collaborator access. */
export async function claimInvites(userId: string, email: string) {
  const invites = await db
    .select()
    .from(itemInvite)
    .where(eq(itemInvite.email, email.toLowerCase()));
  if (invites.length === 0) return;

  // Both statements run in one D1 transaction, so order doesn't matter.
  await db.batch([
    db.delete(itemInvite).where(eq(itemInvite.email, email.toLowerCase())),
    ...invites.map((invite) => addMember(invite.itemId, userId, invite.role, invite.invitedBy)),
  ]);
}

export async function getProfile(userId: string) {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .get();
}

/** People who have shared at least one item with this user, for "shared by" filters. */
export async function listSharers(userId: string) {
  return db
    .selectDistinct({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(itemMember)
    .innerJoin(item, eq(item.id, itemMember.itemId))
    .innerJoin(user, eq(user.id, item.ownerId))
    .where(eq(itemMember.userId, userId))
    .orderBy(user.name);
}
