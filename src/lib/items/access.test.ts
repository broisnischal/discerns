import { describe, expect, test } from "vite-plus/test";

import { allowedVisibility, canEdit, canManage, resolveAccess } from "./access";

describe("resolveAccess", () => {
  const base = { ownerId: "owner", visibility: "private" as const, memberRole: null };

  test.each([
    ["owner of a private item", base, "owner", "owner"],
    ["stranger on a private item", base, "stranger", null],
    ["signed-out viewer on a private item", base, null, null],
    ["viewer collaborator", { ...base, memberRole: "viewer" as const }, "bob", "viewer"],
    ["editor collaborator", { ...base, memberRole: "editor" as const }, "bob", "editor"],
    ["stranger on a link item", { ...base, visibility: "link" as const }, "stranger", "public"],
    [
      "signed-out viewer on a public item",
      { ...base, visibility: "public" as const },
      null,
      "public",
    ],
    [
      "collaborator role wins over public",
      { ...base, visibility: "public" as const, memberRole: "editor" as const },
      "bob",
      "editor",
    ],
  ])("%s", (_, item, userId, expected) => {
    expect(resolveAccess(item, userId)).toBe(expected);
  });
});

test("only owners and editors can edit", () => {
  expect([
    canEdit("owner"),
    canEdit("editor"),
    canEdit("viewer"),
    canEdit("public"),
    canEdit(null),
  ]).toEqual([true, true, false, false, false]);
});

test("only owners can manage sharing", () => {
  expect([canManage("owner"), canManage("editor")]).toEqual([true, false]);
});

test("env items are always private", () => {
  expect(allowedVisibility("env", "public")).toBe("private");
  expect(allowedVisibility("env", "link")).toBe("private");
  expect(allowedVisibility("prompt", "public")).toBe("public");
});
