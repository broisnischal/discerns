export const APP_NAME = "discerns";
export const APP_DESCRIPTION =
  "Save prompts, memories, snippets, and env files, share them with your team, and let Claude, Cursor, Codex, and other coding agents read and write them over MCP.";

/** Where legal and support questions go. Needs a mailbox or Cloudflare Email Routing rule. */
export const CONTACT_EMAIL = "support@discerns.app";
/** Enterprise enquiries open a pre-addressed email with a subject the inbox can filter on. */
export const ENTERPRISE_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("discerns Enterprise")}`;
/** Shown on the legal pages; bump when the terms or privacy policy change. */
export const LEGAL_UPDATED = "October 7, 2026";

export const PLUGIN_NAME = "discerns";
export const MARKETPLACE_NAME = "discerns";
/** GitHub `owner/repo` that hosts .claude-plugin/marketplace.json. Empty until published. */
export const MARKETPLACE_REPO: string = "";
/** Built by `vpr skill:pack` from plugins/discerns/skills/discerns. */
export const SKILL_ZIP_PATH = "/downloads/discerns-skill.zip";
