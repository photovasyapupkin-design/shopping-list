import { DrizzleShoppingRepository } from "./drizzle-repository";
import { getMemoryShoppingRepository } from "./memory-repository";
import type { ShoppingRepository } from "./types";

let drizzleRepository: ShoppingRepository | null = null;

export function getShoppingRepository(): ShoppingRepository {
  if (!process.env.DATABASE_URL) {
    return getMemoryShoppingRepository();
  }

  drizzleRepository ??= new DrizzleShoppingRepository();
  return drizzleRepository;
}
