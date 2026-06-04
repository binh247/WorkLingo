/**
 * Khởi tạo Drizzle + postgres.js từ DATABASE_URL.
 * Đây là nơi DUY NHẤT biết DB cụ thể (chống lock-in — docs/02-architecture §3).
 * Server tự host long-running → dùng connection pool (max 10), cổng 5432.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu DATABASE_URL trong môi trường (.env).");
}

// Tránh tạo nhiều pool khi hot-reload ở dev.
const globalForDb = globalThis as unknown as {
  __wlClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__wlClient ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__wlClient = client;

export const db = drizzle(client, { schema });
export { schema };
