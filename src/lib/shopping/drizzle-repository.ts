import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { listItems, listMembers, shoppingLists, users } from "@/lib/db/schema";
import type { ListRole } from "@/lib/permissions";
import type {
  ShoppingItem,
  ShoppingListDetail,
  ShoppingListMember,
  ShoppingListSummary,
  ShoppingRepository,
  ShoppingUser,
} from "./types";

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeRole(role: string): ListRole {
  if (role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  throw new Error(`Invalid role: ${role}`);
}

export class DrizzleShoppingRepository implements ShoppingRepository {
  async createUser(input: { id?: string; email: string; name: string }): Promise<ShoppingUser> {
    const db = getDb();
    const user = {
      id: input.id ?? id("user"),
      email: input.email.toLowerCase(),
      name: input.name,
      emailVerified: false,
      updatedAt: new Date(),
    };

    const [row] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: { email: user.email, name: user.name, updatedAt: user.updatedAt },
      })
      .returning();

    return { id: row.id, email: row.email, name: row.name };
  }

  async findUserByEmail(email: string): Promise<ShoppingUser | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return row ? { id: row.id, email: row.email, name: row.name } : null;
  }

  async findUserById(userId: string): Promise<ShoppingUser | null> {
    const db = getDb();
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return row ? { id: row.id, email: row.email, name: row.name } : null;
  }

  async createList(input: { name: string; ownerId: string }): Promise<ShoppingListSummary> {
    const db = getDb();
    const listId = id("list");
    const [list] = await db
      .insert(shoppingLists)
      .values({ id: listId, name: input.name, ownerId: input.ownerId })
      .returning();

    await db.insert(listMembers).values({
      listId,
      userId: input.ownerId,
      role: "admin",
    });

    return { ...list, role: "admin" };
  }

  async listListsForUser(userId: string): Promise<ShoppingListSummary[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        ownerId: shoppingLists.ownerId,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        role: listMembers.role,
      })
      .from(shoppingLists)
      .innerJoin(listMembers, eq(shoppingLists.id, listMembers.listId))
      .where(eq(listMembers.userId, userId))
      .orderBy(desc(shoppingLists.updatedAt));

    return rows.map((row) => ({ ...row, role: normalizeRole(row.role) }));
  }

  async getListForUser(input: { listId: string; userId: string }): Promise<ShoppingListDetail | null> {
    const role = await this.getRole(input);
    if (!role) {
      return null;
    }

    const db = getDb();
    const [list] = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.id, input.listId))
      .limit(1);

    if (!list) {
      return null;
    }

    const itemRows = await db.select().from(listItems).where(eq(listItems.listId, input.listId));
    const memberRows = await db
      .select({
        listId: listMembers.listId,
        userId: listMembers.userId,
        role: listMembers.role,
        email: users.email,
        name: users.name,
      })
      .from(listMembers)
      .innerJoin(users, eq(users.id, listMembers.userId))
      .where(eq(listMembers.listId, input.listId));

    return {
      ...list,
      role,
      items: itemRows,
      members: memberRows.map((member) => ({ ...member, role: normalizeRole(member.role) })),
    };
  }

  async getRole(input: { listId: string; userId: string }): Promise<ListRole | null> {
    const db = getDb();
    const [row] = await db
      .select({ role: listMembers.role })
      .from(listMembers)
      .where(and(eq(listMembers.listId, input.listId), eq(listMembers.userId, input.userId)))
      .limit(1);
    return row ? normalizeRole(row.role) : null;
  }

  async renameList(input: { listId: string; name: string }): Promise<ShoppingListSummary> {
    const db = getDb();
    const [row] = await db
      .update(shoppingLists)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(shoppingLists.id, input.listId))
      .returning();
    return { ...row, role: "admin" };
  }

  async deleteList(listId: string): Promise<void> {
    await getDb().delete(shoppingLists).where(eq(shoppingLists.id, listId));
  }

  async createItem(input: {
    listId: string;
    name: string;
    quantity?: string | null;
    createdById: string;
  }): Promise<ShoppingItem> {
    const [row] = await getDb()
      .insert(listItems)
      .values({
        id: id("item"),
        listId: input.listId,
        name: input.name,
        quantity: input.quantity ?? null,
        createdById: input.createdById,
      })
      .returning();
    return row;
  }

  async updateItem(input: {
    itemId: string;
    name?: string;
    quantity?: string | null;
    checked?: boolean;
  }): Promise<ShoppingItem> {
    const [row] = await getDb()
      .update(listItems)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
        ...(input.checked === undefined ? {} : { checked: input.checked }),
        updatedAt: new Date(),
      })
      .where(eq(listItems.id, input.itemId))
      .returning();
    return row;
  }

  async deleteItem(itemId: string): Promise<void> {
    await getDb().delete(listItems).where(eq(listItems.id, itemId));
  }

  async setMemberRole(input: {
    listId: string;
    targetUserEmail: string;
    role: "editor" | "viewer";
  }): Promise<ShoppingListMember> {
    const target = await this.findUserByEmail(input.targetUserEmail);
    if (!target) {
      throw new Error("User must be registered before sharing");
    }

    await getDb()
      .insert(listMembers)
      .values({ listId: input.listId, userId: target.id, role: input.role })
      .onConflictDoUpdate({
        target: [listMembers.listId, listMembers.userId],
        set: { role: input.role, updatedAt: new Date() },
      });

    return {
      listId: input.listId,
      userId: target.id,
      role: input.role,
      email: target.email,
      name: target.name,
    };
  }
}
