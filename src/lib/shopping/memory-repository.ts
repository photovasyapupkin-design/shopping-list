import type { ListRole } from "@/lib/permissions";
import type {
  ShoppingItem,
  ShoppingListMember,
  ShoppingListSummary,
  ShoppingRepository,
  ShoppingUser,
} from "./types";

type MemberRecord = {
  listId: string;
  userId: string;
  role: ListRole;
};

function now() {
  return new Date();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createMemoryShoppingRepository(): ShoppingRepository {
  const users = new Map<string, ShoppingUser>();
  const lists = new Map<string, Omit<ShoppingListSummary, "role">>();
  const members = new Map<string, MemberRecord>();
  const items = new Map<string, ShoppingItem>();

  const seedUsers: ShoppingUser[] = [
    { id: "user_admin", email: "admin@example.test", name: "Admin User" },
    { id: "user_viewer", email: "viewer@example.test", name: "Viewer User" },
  ];

  for (const user of seedUsers) {
    users.set(user.id, user);
  }

  const memberKey = (listId: string, userId: string) => `${listId}:${userId}`;

  async function memberToDetail(member: MemberRecord): Promise<ShoppingListMember> {
    const user = users.get(member.userId);
    if (!user) {
      throw new Error(`User ${member.userId} is missing for member record`);
    }

    return {
      listId: member.listId,
      userId: member.userId,
      role: member.role,
      email: user.email,
      name: user.name,
    };
  }

  async function toSummary(
    list: Omit<ShoppingListSummary, "role">,
    role: ListRole,
  ): Promise<ShoppingListSummary> {
    return { ...list, role };
  }

  return {
    async createUser(input) {
      const id = input.id ?? createId("user");
      const user = { id, email: input.email.toLowerCase(), name: input.name };
      users.set(id, user);
      return user;
    },

    async findUserByEmail(email) {
      const normalized = email.toLowerCase();
      return [...users.values()].find((user) => user.email === normalized) ?? null;
    },

    async findUserById(userId) {
      return users.get(userId) ?? null;
    },

    async createList(input) {
      const timestamp = now();
      const list = {
        id: createId("list"),
        name: input.name,
        ownerId: input.ownerId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      lists.set(list.id, list);
      members.set(memberKey(list.id, input.ownerId), {
        listId: list.id,
        userId: input.ownerId,
        role: "admin",
      });
      return toSummary(list, "admin");
    },

    async listListsForUser(userId) {
      return Promise.all(
        [...members.values()]
          .filter((member) => member.userId === userId)
          .map((member) => {
            const list = lists.get(member.listId);
            if (!list) {
              throw new Error(`List ${member.listId} is missing for member record`);
            }
            return toSummary(list, member.role);
          }),
      );
    },

    async getListForUser({ listId, userId }) {
      const membership = members.get(memberKey(listId, userId));
      const list = lists.get(listId);
      if (!membership || !list) {
        return null;
      }

      return {
        ...(await toSummary(list, membership.role)),
        items: [...items.values()].filter((item) => item.listId === listId),
        members: await Promise.all(
          [...members.values()]
            .filter((member) => member.listId === listId)
            .map((member) => memberToDetail(member)),
        ),
      };
    },

    async getRole({ listId, userId }) {
      return members.get(memberKey(listId, userId))?.role ?? null;
    },

    async renameList({ listId, name }) {
      const list = lists.get(listId);
      if (!list) {
        throw new Error("List not found");
      }
      const updated = { ...list, name, updatedAt: now() };
      lists.set(listId, updated);
      return toSummary(updated, "admin");
    },

    async deleteList(listId) {
      lists.delete(listId);
      for (const key of [...members.keys()]) {
        if (key.startsWith(`${listId}:`)) {
          members.delete(key);
        }
      }
      for (const item of [...items.values()]) {
        if (item.listId === listId) {
          items.delete(item.id);
        }
      }
    },

    async createItem(input) {
      const timestamp = now();
      const item = {
        id: createId("item"),
        listId: input.listId,
        name: input.name,
        quantity: input.quantity ?? null,
        checked: false,
        createdById: input.createdById,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      items.set(item.id, item);
      return item;
    },

    async updateItem(input) {
      const item = items.get(input.itemId);
      if (!item) {
        throw new Error("Item not found");
      }
      const updated = {
        ...item,
        name: input.name ?? item.name,
        quantity: input.quantity === undefined ? item.quantity : input.quantity,
        checked: input.checked ?? item.checked,
        updatedAt: now(),
      };
      items.set(input.itemId, updated);
      return updated;
    },

    async deleteItem(itemId) {
      items.delete(itemId);
    },

    async setMemberRole(input) {
      const target = await this.findUserByEmail(input.targetUserEmail);
      if (!target) {
        throw new Error("User must be registered before sharing");
      }
      const membership = {
        listId: input.listId,
        userId: target.id,
        role: input.role,
      };
      members.set(memberKey(input.listId, target.id), membership);
      return memberToDetail(membership);
    },
  };
}

let repository: ShoppingRepository | null = null;

export function getMemoryShoppingRepository() {
  repository ??= createMemoryShoppingRepository();
  return repository;
}
