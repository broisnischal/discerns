import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import { authRelations } from "#/lib/db/schema/auth.schema.ts";
import { relations } from "#/lib/db/schema/relations.ts";

// The D1 binding is a stateless handle, so one module-scoped client is fine.
// D1 has no interactive transactions: use db.batch([...]) for atomic writes.
export const db = drizzle(env.DB, {
  // authRelations uses defineRelationsPart,
  // so it must come after the main relations.
  // https://orm.drizzle.team/docs/relations-v2#relations-parts
  relations: { ...relations, ...authRelations },
});
