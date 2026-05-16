import { describe, expect, it } from "vitest";
import {
  assertListAccess,
  canRolePerform,
  scopeForAction,
  type ListAction,
  type ListRole,
} from "./permissions";

describe("list role permissions", () => {
  const matrix: Record<ListRole, ListAction[]> = {
    admin: [
      "lists:read",
      "lists:create",
      "lists:update",
      "lists:delete",
      "lists:share",
      "items:create",
      "items:update",
      "items:delete",
    ],
    editor: ["lists:read", "items:create", "items:update", "items:delete"],
    viewer: ["lists:read"],
  };

  it.each(Object.entries(matrix))("%s can only perform its allowed actions", (role, allowed) => {
    const actions: ListAction[] = [
      "lists:read",
      "lists:create",
      "lists:update",
      "lists:delete",
      "lists:share",
      "items:create",
      "items:update",
      "items:delete",
    ];

    for (const action of actions) {
      expect(canRolePerform(role as ListRole, action)).toBe(allowed.includes(action));
    }
  });

  it("requires both OAuth scope and list membership for MCP access", () => {
    expect(
      assertListAccess({
        action: "items:create",
        role: "editor",
        scopes: ["lists:update"],
      }),
    ).toEqual({ ok: true });

    expect(
      assertListAccess({
        action: "lists:delete",
        role: "editor",
        scopes: ["lists:delete"],
      }),
    ).toMatchObject({ ok: false, status: 403, reason: "forbidden_role" });

    expect(
      assertListAccess({
        action: "items:update",
        role: "editor",
        scopes: ["lists:read"],
      }),
    ).toMatchObject({
      ok: false,
      status: 403,
      reason: "insufficient_scope",
      requiredScope: "lists:update",
    });

    expect(
      assertListAccess({
        action: "lists:read",
        role: null,
        scopes: ["lists:read"],
      }),
    ).toMatchObject({ ok: false, status: 404, reason: "not_a_member" });
  });

  it("maps item mutations to update scope to avoid over-broad grants", () => {
    expect(scopeForAction("items:create")).toBe("lists:update");
    expect(scopeForAction("items:update")).toBe("lists:update");
    expect(scopeForAction("items:delete")).toBe("lists:update");
  });
});
