import type { Config } from "drizzle-kit";

// Migrations are generated here and applied with wrangler:
//   vpr db:generate && vpr db:migrate:local   (or db:migrate:remote)
export default {
  out: "./drizzle",
  schema: "./src/lib/db/schema/index.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "sqlite",
} satisfies Config;
