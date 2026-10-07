import { defineRelations } from "drizzle-orm";

import * as schema from "./";

// https://orm.drizzle.team/docs/relations-v2
export const relations = defineRelations(schema, (r) => ({
  project: {
    owner: r.one.user({ from: r.project.ownerId, to: r.user.id }),
    items: r.many.item({ from: r.project.id, to: r.item.projectId }),
    members: r.many.projectMember({ from: r.project.id, to: r.projectMember.projectId }),
  },
  projectMember: {
    project: r.one.project({ from: r.projectMember.projectId, to: r.project.id }),
    user: r.one.user({ from: r.projectMember.userId, to: r.user.id }),
  },
  item: {
    owner: r.one.user({ from: r.item.ownerId, to: r.user.id }),
    project: r.one.project({ from: r.item.projectId, to: r.project.id }),
    versions: r.many.itemVersion({ from: r.item.id, to: r.itemVersion.itemId }),
    members: r.many.itemMember({ from: r.item.id, to: r.itemMember.itemId }),
    invites: r.many.itemInvite({ from: r.item.id, to: r.itemInvite.itemId }),
    entries: r.many.logEntry({ from: r.item.id, to: r.logEntry.itemId }),
  },
  logEntry: {
    item: r.one.item({ from: r.logEntry.itemId, to: r.item.id }),
    author: r.one.user({ from: r.logEntry.authorId, to: r.user.id }),
  },
  itemVersion: {
    item: r.one.item({ from: r.itemVersion.itemId, to: r.item.id }),
    author: r.one.user({ from: r.itemVersion.authorId, to: r.user.id }),
  },
  itemMember: {
    item: r.one.item({ from: r.itemMember.itemId, to: r.item.id }),
    user: r.one.user({ from: r.itemMember.userId, to: r.user.id }),
  },
  itemInvite: {
    item: r.one.item({ from: r.itemInvite.itemId, to: r.item.id }),
  },
}));
