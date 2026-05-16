import type { ListRole } from "@/lib/permissions";

export type ShoppingUser = {
  id: string;
  email: string;
  name: string;
};

export type ShoppingListSummary = {
  id: string;
  name: string;
  ownerId: string;
  role: ListRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ShoppingItem = {
  id: string;
  listId: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ShoppingListMember = {
  listId: string;
  userId: string;
  role: ListRole;
  email: string;
  name: string;
};

export type ShoppingListDetail = ShoppingListSummary & {
  items: ShoppingItem[];
  members: ShoppingListMember[];
};

export type ShoppingRepository = {
  createUser(input: { id?: string; email: string; name: string }): Promise<ShoppingUser>;
  findUserByEmail(email: string): Promise<ShoppingUser | null>;
  findUserById(userId: string): Promise<ShoppingUser | null>;
  createList(input: { name: string; ownerId: string }): Promise<ShoppingListSummary>;
  listListsForUser(userId: string): Promise<ShoppingListSummary[]>;
  getListForUser(input: { listId: string; userId: string }): Promise<ShoppingListDetail | null>;
  getRole(input: { listId: string; userId: string }): Promise<ListRole | null>;
  renameList(input: { listId: string; name: string }): Promise<ShoppingListSummary>;
  deleteList(listId: string): Promise<void>;
  createItem(input: {
    listId: string;
    name: string;
    quantity?: string | null;
    createdById: string;
  }): Promise<ShoppingItem>;
  updateItem(input: {
    itemId: string;
    name?: string;
    quantity?: string | null;
    checked?: boolean;
  }): Promise<ShoppingItem>;
  deleteItem(itemId: string): Promise<void>;
  setMemberRole(input: {
    listId: string;
    actorId: string;
    targetUserEmail: string;
    role: "editor" | "viewer";
  }): Promise<ShoppingListMember>;
};
