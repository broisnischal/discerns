import { defineRelations } from "drizzle-orm";

import * as schema from "./";

// https://orm.drizzle.team/docs/relations-v2
export const relations = defineRelations(schema, (r) => ({
  item: {
    owner: r.one.user({ from: r.item.ownerId, to: r.user.id }),
    versions: r.many.itemVersion({ from: r.item.id, to: r.itemVersion.itemId }),
    members: r.many.itemMember({ from: r.item.id, to: r.itemMember.itemId }),
    invites: r.many.itemInvite({ from: r.item.id, to: r.itemInvite.itemId }),
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
