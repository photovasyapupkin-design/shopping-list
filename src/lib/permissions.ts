export const listRoles = ["admin", "editor", "viewer"] as const;
export type ListRole = (typeof listRoles)[number];

export const oauthScopes = [
  "lists:read",
  "lists:create",
  "lists:update",
  "lists:delete",
  "lists:share",
] as const;
export type OAuthScope = (typeof oauthScopes)[number];

export type ListAction =
  | OAuthScope
  | "items:create"
  | "items:update"
  | "items:delete";

type AccessFailureReason = "insufficient_scope" | "forbidden_role" | "not_a_member";

export type AccessDecision =
  | { ok: true }
  | {
      ok: false;
      status: 403 | 404;
      reason: AccessFailureReason;
      requiredScope?: OAuthScope;
    };

const rolePermissions: Record<ListRole, Set<ListAction>> = {
  admin: new Set([
    "lists:read",
    "lists:create",
    "lists:update",
    "lists:delete",
    "lists:share",
    "items:create",
    "items:update",
    "items:delete",
  ]),
  editor: new Set(["lists:read", "items:create", "items:update", "items:delete"]),
  viewer: new Set(["lists:read"]),
};

export function isListRole(value: string): value is ListRole {
  return listRoles.includes(value as ListRole);
}

export function canRolePerform(role: ListRole, action: ListAction) {
  return rolePermissions[role].has(action);
}

export function scopeForAction(action: ListAction): OAuthScope {
  if (action.startsWith("items:")) {
    return "lists:update";
  }

  return action as OAuthScope;
}

export function assertListAccess({
  action,
  role,
  scopes,
}: {
  action: ListAction;
  role: ListRole | null;
  scopes?: OAuthScope[];
}): AccessDecision {
  const requiredScope = scopeForAction(action);

  if (scopes && !scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      reason: "insufficient_scope",
      requiredScope,
    };
  }

  if (!role) {
    return {
      ok: false,
      status: 404,
      reason: "not_a_member",
    };
  }

  if (!canRolePerform(role, action)) {
    return {
      ok: false,
      status: 403,
      reason: "forbidden_role",
    };
  }

  return { ok: true };
}
