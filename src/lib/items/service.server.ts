import "@tanstack/react-start/server-only";
import { and, desc, eq, exists, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { createError } from "evlog";

import { assertCanCreateItem, assertCanCreateProject } from "#/lib/billing/billing.server.ts";
import { decrypt, encrypt } from "#/lib/crypto.server.ts";
import { db } from "#/lib/db/index.ts";
import {
  item,
  itemInvite,
  itemMember,
  itemVersion,
  logEntry,
  project,
  projectMember,
  user,
} from "#/lib/db/schema/index.ts";
import type { ChangeSource, MemberRole } from "#/lib/db/schema/types.ts";
import { serverEnv } from "#/lib/env.server.ts";
import {
  allowedVisibility,
  canEdit,
  canManage,
  projectKey,
  resolveAccess,
  type Access,
} from "#/lib/items/access.ts";
import {
  appendLogSchema,
  itemInputSchema,
  itemPatchSchema,
  listItemsSchema,
  MAX_LOG_BYTES,
  MAX_LOG_ENTRIES,
  projectInputSchema,
  projectPatchSchema,
  shareItemSchema,
  shareProjectSchema,
  tailLogSchema,
  type AppendLogInput,
  type ItemInput,
  type ItemPatch,
  type ListItemsInput,
  type ProjectInput,
  type ProjectPatch,
  type ShareItemInput,
  type ShareProjectInput,
  type TailLogInput,
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
      projectRole: projectMember.role,
      project: { id: project.id, name: project.name, key: project.key },
      owner: { id: user.id, name: user.name, email: user.email, image: user.image },
    })
    .from(item)
    .innerJoin(user, eq(user.id, item.ownerId))
    .leftJoin(itemMember, and(eq(itemMember.itemId, item.id), eq(itemMember.userId, userId ?? "")))
    .leftJoin(project, eq(project.id, item.projectId))
    .leftJoin(
      projectMember,
      and(eq(projectMember.projectId, item.projectId), eq(projectMember.userId, userId ?? "")),
    )
    .where(eq(item.id, id))
    .get();

  if (!row) throw notFound();
  const access = resolveAccess(
    {
      ownerId: row.item.ownerId,
      visibility: row.item.visibility,
      memberRole: row.memberRole,
      projectRole: row.projectRole,
    },
    userId,
  );
  if (!access) throw notFound();
  return { ...row, project: row.project?.id ? row.project : null, access };
}

/** Projects the user owns or belongs to, with their role on each. */
function accessibleProjects(userId: string) {
  return db
    .select({
      id: project.id,
      name: project.name,
      key: project.key,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      memberRole: projectMember.role,
      ownerName: user.name,
      ownerEmail: user.email,
      itemCount: sql<number>`(select count(*) from ${item} where ${item.projectId} = ${project.id})`,
    })
    .from(project)
    .innerJoin(user, eq(user.id, project.ownerId))
    .leftJoin(
      projectMember,
      and(eq(projectMember.projectId, project.id), eq(projectMember.userId, userId)),
    )
    .where(or(eq(project.ownerId, userId), sql`${projectMember.userId} is not null`));
}

type ProjectRow = Awaited<ReturnType<typeof accessibleProjects>>[number];

const withProjectAccess = (row: ProjectRow, userId: string) => ({
  ...row,
  access: (row.ownerId === userId ? "owner" : row.memberRole) as "owner" | MemberRole,
});

/**
 * Finds one of the user's projects by id, key, git remote URL, or name. Agents pass
 * whatever it has for the repo it is working in, so all of those must work.
 */
async function resolveProject(userId: string, ref: string) {
  const key = projectKey(ref);
  const name = ref.trim().toLowerCase();
  const rows = await accessibleProjects(userId);
  const match =
    rows.find((p) => p.id === ref.trim()) ??
    rows.find((p) => p.key === key) ??
    rows.find((p) => p.name.toLowerCase() === name);
  if (!match) {
    throw createError({
      message: "Project not found",
      status: 404,
      why: `No project matches "${ref}"`,
      fix: "Call list_projects to see them, or create_project to start one",
    });
  }
  return withProjectAccess(match, userId);
}

/** A project the actor may file items into: owners and editors only. */
async function projectForWriting(userId: string, ref: string) {
  const found = await resolveProject(userId, ref);
  if (!canEdit(found.access))
    throw forbidden("Only project owners and editors can add items to it");
  return found;
}

/** Untitled saves get a title from their first meaningful line, or from kind and date. */
function deriveTitle(kind: string, content: string) {
  const line = content
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s`]+/, "").trim())
    .find((l) => l.length > 0 && !/^[A-Z0-9_]+=/.test(l));
  if (line) return line.length > 80 ? `${line.slice(0, 77).trimEnd()}…` : line;
  const label = kind.charAt(0).toUpperCase() + kind.slice(1);
  return `${label} · ${new Date().toISOString().slice(0, 10)}`;
}

export async function createItem(actor: Actor, input: ItemInput) {
  const data = itemInputSchema.parse(input);
  await assertCanCreateItem(actor.userId);
  const id = newId();
  const encrypted = data.kind === "env";
  const isLog = data.kind === "log";
  const projectId = data.project ? (await projectForWriting(actor.userId, data.project)).id : null;
  const title = data.title || deriveTitle(data.kind, data.content);
  // A log's text lives in log_entry rows; the item row only carries its metadata.
  const content = isLog ? "" : await sealContent(data.content, encrypted);
  const visibility = allowedVisibility(data.kind, data.visibility);

  await db.batch([
    db.insert(item).values({
      id,
      ownerId: actor.userId,
      projectId,
      kind: data.kind,
      title,
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
      title,
      content,
      encrypted,
      authorId: actor.userId,
      source: actor.source,
    }),
  ]);
  if (isLog && data.content.trim()) await appendLog(actor, { id, text: data.content });

  return { id, url: itemUrl(id), version: 1, visibility };
}

export async function getItem(id: string, userId: string | null) {
  const { item: row, owner, access, project: found } = await loadItem(id, userId);
  const log = row.kind === "log" ? await latestLogEntries(row.id, 200) : null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: log
      ? log.entries.map((entry) => entry.body).join("\n")
      : await openContent(row.content, row.encrypted),
    /** Logs only: the seq of the last entry, to pass as `after` when tailing. */
    cursor: log?.cursor,
    language: row.language,
    tags: row.tags,
    visibility: row.visibility,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner,
    project: found,
    access,
    url: itemUrl(row.id),
  };
}
export type ItemDetail = Awaited<ReturnType<typeof getItem>>;

export async function updateItem(actor: Actor, patch: ItemPatch) {
  const data = itemPatchSchema.parse(patch);
  const { item: current, access } = await loadItem(data.id, actor.userId);
  if (!canEdit(access)) throw forbidden("Only the owner and editors can change this item");
  if (current.kind === "log" && data.content !== undefined) {
    throw createError({
      message: "Logs are append-only",
      status: 400,
      fix: "Use append_log to add to it, or start a new log",
    });
  }
  if (data.visibility && !canManage(access)) {
    throw forbidden("Only the owner can change who can see this item");
  }

  const projectId =
    data.project === undefined
      ? current.projectId
      : data.project === null
        ? null
        : (await projectForWriting(actor.userId, data.project)).id;

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
      projectId,
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

async function latestLogEntries(itemId: string, limit: number) {
  const rows = await db
    .select({ seq: logEntry.seq, body: logEntry.body })
    .from(logEntry)
    .where(eq(logEntry.itemId, itemId))
    .orderBy(desc(logEntry.seq))
    .limit(limit);
  rows.reverse();
  return { entries: rows, cursor: rows.at(-1)?.seq ?? 0 };
}

/** Adds an entry to a log. Owners and editors only; the item's updatedAt moves so lists resort. */
export async function appendLog(actor: Actor, input: AppendLogInput) {
  const data = appendLogSchema.parse(input);
  const { item: current, access } = await loadItem(data.id, actor.userId);
  if (current.kind !== "log") throw createError({ message: "Not a log item", status: 400 });
  if (!canEdit(access)) throw forbidden("Only the owner and editors can add to this log");

  const usage = await db
    .select({
      count: sql<number>`count(*)`,
      bytes: sql<number>`coalesce(sum(length(${logEntry.body})), 0)`,
    })
    .from(logEntry)
    .where(eq(logEntry.itemId, current.id))
    .get();
  if (
    (usage?.count ?? 0) >= MAX_LOG_ENTRIES ||
    (usage?.bytes ?? 0) + data.text.length > MAX_LOG_BYTES
  ) {
    throw createError({ message: "This log is full", status: 413, fix: "Start a new log item" });
  }

  // seq comes from the row itself so concurrent writers can't both read the same max.
  // If two still collide, the unique index rejects one and it retries once.
  const insert = () =>
    db.batch([
      db.insert(logEntry).values({
        id: newId(16),
        itemId: current.id,
        seq: sql`(select coalesce(max(${logEntry.seq}), 0) + 1 from ${logEntry} where ${logEntry.itemId} = ${current.id})`,
        body: data.text,
        authorId: actor.userId,
        source: actor.source,
      }),
      db.update(item).set({ updatedAt: new Date() }).where(eq(item.id, current.id)),
    ]);
  await insert().catch(insert);

  const latest = await db
    .select({ seq: logEntry.seq })
    .from(logEntry)
    .where(eq(logEntry.itemId, current.id))
    .orderBy(desc(logEntry.seq))
    .limit(1)
    .get();
  return { id: current.id, url: itemUrl(current.id), cursor: latest?.seq ?? 0 };
}

/** Entries after a cursor, oldest first. Anyone who can see the item can tail it. */
export async function tailLog(userId: string | null, input: TailLogInput) {
  const data = tailLogSchema.parse(input);
  const { item: current } = await loadItem(data.id, userId);
  if (current.kind !== "log") throw createError({ message: "Not a log item", status: 400 });

  const entries = await db
    .select({
      seq: logEntry.seq,
      body: logEntry.body,
      source: logEntry.source,
      createdAt: logEntry.createdAt,
      authorName: user.name,
    })
    .from(logEntry)
    .leftJoin(user, eq(user.id, logEntry.authorId))
    .where(and(eq(logEntry.itemId, current.id), sql`${logEntry.seq} > ${data.after}`))
    .orderBy(logEntry.seq)
    .limit(data.limit);

  return {
    entries,
    cursor: entries.at(-1)?.seq ?? data.after,
    /** False when more entries were already waiting; call again with the new cursor. */
    caughtUp: entries.length < data.limit,
  };
}
export type LogTail = Awaited<ReturnType<typeof tailLog>>;

/** Turns free text into a safe FTS5 query: each word quoted, as a prefix, all required. */
function ftsQuery(text: string) {
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_.-]+/u)
    .filter(Boolean)
    .slice(0, 8);
  return tokens.map((token) => `"${token.replaceAll('"', "")}"*`).join(" ");
}

export async function listItems(userId: string, input: ListItemsInput = {}) {
  const data = listItemsSchema.parse(input);

  const isMember = or(
    exists(
      db
        .select({ one: sql`1` })
        .from(itemMember)
        .where(and(eq(itemMember.itemId, item.id), eq(itemMember.userId, userId))),
    ),
    exists(
      db
        .select({ one: sql`1` })
        .from(projectMember)
        .where(and(eq(projectMember.projectId, item.projectId), eq(projectMember.userId, userId))),
    ),
  );
  const projectFilter =
    data.project === undefined
      ? undefined
      : data.project === "unfiled"
        ? isNull(item.projectId)
        : eq(item.projectId, (await resolveProject(userId, data.project)).id);
  const filters: (SQL | undefined)[] = [
    data.scope === "mine"
      ? eq(item.ownerId, userId)
      : data.scope === "shared"
        ? isMember
        : or(eq(item.ownerId, userId), isMember),
    projectFilter,
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
    const match = ftsQuery(data.query);
    if (match) {
      // item_fts is maintained by triggers (see the item_fts migration); prefix tokens make
      // search-as-you-type match partial words.
      filters.push(sql`${item.id} in (select item_id from item_fts where item_fts match ${match})`);
    }
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
      projectRole: projectMember.role,
      projectId: item.projectId,
      projectName: project.name,
      preview: sql<string>`case when ${item.encrypted} then '' else substr(${item.content}, 1, 240) end`,
    })
    .from(item)
    .innerJoin(user, eq(user.id, item.ownerId))
    .leftJoin(itemMember, and(eq(itemMember.itemId, item.id), eq(itemMember.userId, userId)))
    .leftJoin(project, eq(project.id, item.projectId))
    .leftJoin(
      projectMember,
      and(eq(projectMember.projectId, item.projectId), eq(projectMember.userId, userId)),
    )
    .where(and(...filters))
    .orderBy(desc(item.updatedAt))
    .limit(data.limit)
    .offset(data.offset);

  return rows.map(({ memberRole, projectRole, ...row }) => ({
    ...row,
    access: resolveAccess(
      { ownerId: row.ownerId, visibility: row.visibility, memberRole, projectRole },
      userId,
    ) as Exclude<Access, null | "public">,
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

export async function listProjects(userId: string) {
  const rows = await accessibleProjects(userId);
  return rows
    .map((row) => withProjectAccess(row, userId))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
export type ProjectSummary = Awaited<ReturnType<typeof listProjects>>[number];

export async function createProject(actor: Actor, input: ProjectInput) {
  const data = projectInputSchema.parse(input);
  await assertCanCreateProject(actor.userId);
  const key = data.key ? projectKey(data.key) : null;
  const id = newId();
  await db
    .insert(project)
    .values({ id, ownerId: actor.userId, name: data.name, key })
    .catch((error: unknown) => {
      throw createError({
        message: "You already have a project for this repository",
        status: 409,
        fix: "Use list_projects to find it",
        cause: error instanceof Error ? error : undefined,
      });
    });
  return { id, name: data.name, key };
}

export async function updateProject(actor: Actor, patch: ProjectPatch) {
  const data = projectPatchSchema.parse(patch);
  const found = await resolveProject(actor.userId, data.id);
  if (!canManage(found.access)) throw forbidden("Only the owner can change this project");
  await db
    .update(project)
    .set({
      name: data.name ?? found.name,
      key: data.key === undefined ? found.key : data.key ? projectKey(data.key) : null,
    })
    .where(eq(project.id, found.id));
  return { id: found.id };
}

/** Deletes the folder only; its items stay and become unfiled. */
export async function deleteProject(actor: Actor, id: string) {
  const found = await resolveProject(actor.userId, id);
  if (!canManage(found.access)) throw forbidden("Only the owner can delete this project");
  await db.delete(project).where(eq(project.id, found.id));
}

export async function listProjectMembers(userId: string, id: string) {
  const found = await resolveProject(userId, id);
  const members = await db
    .select({
      userId: projectMember.userId,
      role: projectMember.role,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(eq(projectMember.projectId, found.id));
  return {
    owner: { name: found.ownerName, email: found.ownerEmail },
    members,
  };
}

/** Project sharing needs an existing account; the person's whole folder appears at once. */
export async function shareProject(actor: Actor, input: ShareProjectInput) {
  const data = shareProjectSchema.parse(input);
  const found = await resolveProject(actor.userId, data.id);
  if (!canManage(found.access)) throw forbidden("Only the owner can share this project");
  const target = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(sql`lower(${user.email})`, data.email))
    .get();
  if (!target) {
    throw createError({
      message: "No account with that email yet",
      status: 404,
      fix: "Ask them to sign in once, or share a single item to send an invite link",
    });
  }
  if (target.id === found.ownerId) {
    throw createError({ message: "You already own this project", status: 400 });
  }
  await db
    .insert(projectMember)
    .values({ projectId: found.id, userId: target.id, role: data.role })
    .onConflictDoUpdate({
      target: [projectMember.projectId, projectMember.userId],
      set: { role: data.role },
    });
  return { status: "added" as const, email: target.email, name: target.name, role: data.role };
}

export async function unshareProject(actor: Actor, id: string, email: string) {
  const found = await resolveProject(actor.userId, id);
  const target = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email.trim().toLowerCase()))
    .get();
  const removingSelf = target?.id === actor.userId;
  if (!canManage(found.access) && !removingSelf)
    throw forbidden("Only the owner can change who has access");
  await db
    .delete(projectMember)
    .where(and(eq(projectMember.projectId, found.id), eq(projectMember.userId, target?.id ?? "")));
}

/**
 * Everything an agent should know when it starts working in a project: the memories and
 * prompts filed there, which env items exist, and the tail of the most recent log.
 */
export async function getProjectContext(userId: string, ref: string) {
  const found = await resolveProject(userId, ref);
  const items = await listItems(userId, { project: found.id, limit: 100 });
  const latestLog = items.find((row) => row.kind === "log");
  const log = latestLog ? await tailLog(userId, { id: latestLog.id, after: 0, limit: 1000 }) : null;
  const recentLog = log ? log.entries.slice(-20) : [];
  const memories = await Promise.all(
    items
      .filter((row) => row.kind === "memory")
      .slice(0, 20)
      .map((row) => getItem(row.id, userId)),
  );
  return {
    project: { id: found.id, name: found.name, key: found.key, access: found.access },
    memories: memories.map((m) => ({ id: m.id, title: m.title, content: m.content, url: m.url })),
    prompts: items
      .filter((row) => row.kind === "prompt")
      .map((row) => ({ id: row.id, title: row.title, tags: row.tags, url: row.url })),
    envs: items
      .filter((row) => row.kind === "env")
      .map((row) => ({ id: row.id, title: row.title, url: row.url })),
    code: items
      .filter((row) => row.kind === "code")
      .map((row) => ({ id: row.id, title: row.title, tags: row.tags, url: row.url })),
    latestLog: latestLog
      ? {
          id: latestLog.id,
          title: latestLog.title,
          url: latestLog.url,
          cursor: log?.cursor ?? 0,
          recent: recentLog,
        }
      : null,
    itemCount: items.length,
  };
}

/**
 * People connected to this user through sharing in either direction, with what is shared.
 * Any of them can be added to a project without typing an email.
 */
export async function listContacts(userId: string) {
  const sharedByMe = db
    .select({ id: itemMember.userId })
    .from(itemMember)
    .innerJoin(item, eq(item.id, itemMember.itemId))
    .where(eq(item.ownerId, userId));
  const sharedWithMe = db
    .select({ id: item.ownerId })
    .from(itemMember)
    .innerJoin(item, eq(item.id, itemMember.itemId))
    .where(eq(itemMember.userId, userId));
  const inMyProjects = db
    .select({ id: projectMember.userId })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(eq(project.ownerId, userId));
  const ownersOfMyProjects = db
    .select({ id: project.ownerId })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(eq(projectMember.userId, userId));

  const [people, itemsSharedByMe, itemsSharedWithMe, projects] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image })
      .from(user)
      .where(
        and(
          sql`${user.id} != ${userId}`,
          or(
            sql`${user.id} in ${sharedByMe}`,
            sql`${user.id} in ${sharedWithMe}`,
            sql`${user.id} in ${inMyProjects}`,
            sql`${user.id} in ${ownersOfMyProjects}`,
          ),
        ),
      ),
    db
      .select({ userId: itemMember.userId, count: sql<number>`count(*)` })
      .from(itemMember)
      .innerJoin(item, eq(item.id, itemMember.itemId))
      .where(eq(item.ownerId, userId))
      .groupBy(itemMember.userId),
    db
      .select({ ownerId: item.ownerId, count: sql<number>`count(*)` })
      .from(itemMember)
      .innerJoin(item, eq(item.id, itemMember.itemId))
      .where(eq(itemMember.userId, userId))
      .groupBy(item.ownerId),
    // Every project I can see, with all of its people, to find the ones we share.
    db
      .select({
        projectId: project.id,
        name: project.name,
        ownerId: project.ownerId,
        memberId: projectMember.userId,
      })
      .from(project)
      .leftJoin(projectMember, eq(projectMember.projectId, project.id))
      .where(
        or(
          eq(project.ownerId, userId),
          sql`${project.id} in ${db
            .select({ id: projectMember.projectId })
            .from(projectMember)
            .where(eq(projectMember.userId, userId))}`,
        ),
      ),
  ]);

  const byMe = new Map(itemsSharedByMe.map((r) => [r.userId, r.count]));
  const withMe = new Map(itemsSharedWithMe.map((r) => [r.ownerId, r.count]));
  return people
    .map((person) => ({
      ...person,
      itemsISharedWithThem: byMe.get(person.id) ?? 0,
      itemsTheyShared: withMe.get(person.id) ?? 0,
      sharedProjects: [
        ...new Map(
          projects
            .filter((p) => p.ownerId === person.id || p.memberId === person.id)
            .map((p) => [p.projectId, { id: p.projectId, name: p.name }]),
        ).values(),
      ],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export type Contact = Awaited<ReturnType<typeof listContacts>>[number];

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
