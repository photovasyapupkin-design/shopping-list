import type { OAuthScope } from "@/lib/permissions";
import { assertListAccess } from "@/lib/permissions";
import type {
  ShoppingItem,
  ShoppingListDetail,
  ShoppingListMember,
  ShoppingListSummary,
  ShoppingRepository,
} from "./types";

export type ActorContext = {
  userId: string;
  scopes?: OAuthScope[];
};

export class ShoppingAccessError extends Error {
  constructor(
    public readonly status: 403 | 404,
    public readonly reason: string,
    public readonly requiredScope?: OAuthScope,
  ) {
    super(reason);
  }
}

function ensure(decision: ReturnType<typeof assertListAccess>) {
  if (!decision.ok) {
    throw new ShoppingAccessError(decision.status, decision.reason, decision.requiredScope);
  }
}

export async function listShoppingLists(
  repository: ShoppingRepository,
  actor: ActorContext,
): Promise<ShoppingListSummary[]> {
  if (actor.scopes && !actor.scopes.includes("lists:read")) {
    throw new ShoppingAccessError(403, "insufficient_scope", "lists:read");
  }
  return repository.listListsForUser(actor.userId);
}

export async function getShoppingList(
  repository: ShoppingRepository,
  actor: ActorContext,
  listId: string,
): Promise<ShoppingListDetail> {
  const role = await repository.getRole({ listId, userId: actor.userId });
  ensure(assertListAccess({ action: "lists:read", role, scopes: actor.scopes }));
  const list = await repository.getListForUser({ listId, userId: actor.userId });
  if (!list) {
    throw new ShoppingAccessError(404, "not_a_member");
  }
  return list;
}

export async function createShoppingList(
  repository: ShoppingRepository,
  actor: ActorContext,
  name: string,
): Promise<ShoppingListSummary> {
  if (actor.scopes && !actor.scopes.includes("lists:create")) {
    throw new ShoppingAccessError(403, "insufficient_scope", "lists:create");
  }
  return repository.createList({ name, ownerId: actor.userId });
}

export async function renameShoppingList(
  repository: ShoppingRepository,
  actor: ActorContext,
  listId: string,
  name: string,
): Promise<ShoppingListSummary> {
  const role = await repository.getRole({ listId, userId: actor.userId });
  ensure(assertListAccess({ action: "lists:update", role, scopes: actor.scopes }));
  return repository.renameList({ listId, name });
}

export async function deleteShoppingList(
  repository: ShoppingRepository,
  actor: ActorContext,
  listId: string,
) {
  const role = await repository.getRole({ listId, userId: actor.userId });
  ensure(assertListAccess({ action: "lists:delete", role, scopes: actor.scopes }));
  await repository.deleteList(listId);
}

export async function addItem(
  repository: ShoppingRepository,
  actor: ActorContext,
  input: { listId: string; name: string; quantity?: string | null },
): Promise<ShoppingItem> {
  const role = await repository.getRole({ listId: input.listId, userId: actor.userId });
  ensure(assertListAccess({ action: "items:create", role, scopes: actor.scopes }));
  return repository.createItem({ ...input, createdById: actor.userId });
}

export async function updateItem(
  repository: ShoppingRepository,
  actor: ActorContext,
  input: { listId: string; itemId: string; name?: string; quantity?: string | null; checked?: boolean },
): Promise<ShoppingItem> {
  const role = await repository.getRole({ listId: input.listId, userId: actor.userId });
  ensure(assertListAccess({ action: "items:update", role, scopes: actor.scopes }));
  return repository.updateItem(input);
}

export async function deleteItem(
  repository: ShoppingRepository,
  actor: ActorContext,
  input: { listId: string; itemId: string },
) {
  const role = await repository.getRole({ listId: input.listId, userId: actor.userId });
  ensure(assertListAccess({ action: "items:delete", role, scopes: actor.scopes }));
  await repository.deleteItem(input.itemId);
}

export async function shareList(
  repository: ShoppingRepository,
  actor: ActorContext,
  input: { listId: string; email: string; role: "editor" | "viewer" },
): Promise<ShoppingListMember> {
  const role = await repository.getRole({ listId: input.listId, userId: actor.userId });
  ensure(assertListAccess({ action: "lists:share", role, scopes: actor.scopes }));
  return repository.setMemberRole({
    listId: input.listId,
    actorId: actor.userId,
    targetUserEmail: input.email,
    role: input.role,
  });
}
