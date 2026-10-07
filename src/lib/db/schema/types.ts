export const ITEM_KINDS = ["text", "prompt", "memory", "env", "code", "log"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/**
 * - private: owner and collaborators only
 * - link: anyone with the link can view
 * - public: anyone with the link can view, and it shows on the owner's profile
 */
export const ITEM_VISIBILITIES = ["private", "link", "public"] as const;
export type ItemVisibility = (typeof ITEM_VISIBILITIES)[number];

export const MEMBER_ROLES = ["viewer", "editor"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export type ChangeSource = "web" | "mcp";
