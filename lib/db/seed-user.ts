/**
 * Seed user test (dev) — idempotent. Dùng cho dev-auth (QĐ-9) ở P2-P4.
 * In ra userId (để dùng làm DEV_USER_ID cho seed khác, vd seed-review ở P4).
 * Chạy: npx tsx lib/db/seed-user.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

const DEV_USER_EMAIL = "dev@worklingo.local";

async function main() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);

  let userId: string;
  if (existing[0]) {
    userId = existing[0].id;
    console.log(`User test đã tồn tại: ${DEV_USER_EMAIL}`);
  } else {
    const [u] = await db
      .insert(users)
      .values({ email: DEV_USER_EMAIL, name: "Dev User", role: "user" })
      .returning({ id: users.id });
    userId = u.id;
    console.log(`Đã tạo user test: ${DEV_USER_EMAIL}`);
  }
  console.log(`DEV_USER_ID=${userId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-user lỗi:", err);
  process.exit(1);
});
