import type { ItemKind, ItemVisibility, MemberRole } from "#/lib/db/schema/types.ts";

export type Access = "owner" | MemberRole | "public" | null;

interface AccessInput {
  ownerId: string;
  visibility: ItemVisibility;
  /** The viewer's collaborator role on this item, if any. */
  memberRole: MemberRole | null;
}

export function resolveAccess(item: AccessInput, userId: string | null): Access {
  if (userId && item.ownerId === userId) return "owner";
  if (userId && item.memberRole) return item.memberRole;
  if (item.visibility !== "private") return "public";
  return null;
}

export const canEdit = (access: Access) => access === "owner" || access === "editor";
export const canManage = (access: Access) => access === "owner";

/** Env items hold secrets, so they never leave the owner and named collaborators. */
export function allowedVisibility(kind: ItemKind, visibility: ItemVisibility): ItemVisibility {
  return kind === "env" ? "private" : visibility;
}
