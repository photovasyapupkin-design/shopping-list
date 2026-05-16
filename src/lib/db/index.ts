import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let sqlClient: postgres.Sql | null = null;
let dbClient: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database access.");
  }

  sqlClient ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  dbClient ??= drizzle(sqlClient, { schema });

  return dbClient;
}
