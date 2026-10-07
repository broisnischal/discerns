import type { ItemKind, ItemVisibility, MemberRole } from "#/lib/db/schema/types.ts";

export type Access = "owner" | MemberRole | "public" | null;

interface AccessInput {
  ownerId: string;
  visibility: ItemVisibility;
  /** The viewer's collaborator role on this item, if any. */
  memberRole: MemberRole | null;
  /** The viewer's role on the item's project, if the item is in one they belong to. */
  projectRole?: MemberRole | null;
}

const ROLE_RANK: Record<MemberRole, number> = { viewer: 1, editor: 2 };

export function resolveAccess(item: AccessInput, userId: string | null): Access {
  if (userId && item.ownerId === userId) return "owner";
  if (userId) {
    // A direct share and a project share may both apply; the stronger role wins.
    const roles = [item.memberRole, item.projectRole ?? null].filter(
      (role): role is MemberRole => role !== null,
    );
    if (roles.length) return roles.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0]!;
  }
  if (item.visibility !== "private") return "public";
  return null;
}

export const canEdit = (access: Access) => access === "owner" || access === "editor";
export const canManage = (access: Access) => access === "owner";

/** Env items hold secrets, so they never leave the owner and named collaborators. */
export function allowedVisibility(kind: ItemKind, visibility: ItemVisibility): ItemVisibility {
  return kind === "env" ? "private" : visibility;
}

/** Turns a git remote or free-form name into a stable project key, e.g. github.com/acme/api. */
export function projectKey(input: string) {
  let value = input.trim();
  const ssh = /^(?:ssh:\/\/)?(?:[\w.-]+@)?([\w.-]+)[:/](.+)$/i.exec(value);
  if (value.includes("://") || /^[\w.-]+@[\w.-]+:/.test(value)) {
    try {
      const url = new URL(value.includes("://") ? value : `ssh://${value.replace(":", "/")}`);
      value = `${url.hostname}${url.pathname}`;
    } catch {
      if (ssh) value = `${ssh[1]}/${ssh[2]}`;
    }
  }
  return value
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}
