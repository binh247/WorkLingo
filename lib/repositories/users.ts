/**
 * Repository: users (auth + admin). docs/03-data-model §4.
 */
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userStats, users } from "@/lib/db/schema";

export async function getUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUserWithPassword(input: {
  email: string;
  name?: string;
  passwordHash: string;
}) {
  const [u] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name ?? null,
      passwordHash: input.passwordHash,
    })
    .returning();
  return u;
}

export async function setUserPasswordHash(userId: string, hash: string) {
  await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.id, userId));
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  await db.update(users).set({ disabled }).where(eq(users.id, userId));
}

export async function listUsers(opts: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where = opts.search
    ? or(
        ilike(users.email, `%${opts.search}%`),
        ilike(users.name, `%${opts.search}%`),
      )
    : undefined;
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      disabled: users.disabled,
      createdAt: users.createdAt,
      streak: userStats.streak,
    })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function countUsers(): Promise<number> {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  return rows[0]?.n ?? 0;
}
