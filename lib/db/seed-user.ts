/**
 * Seed user test (dev) — idempotent. Đặt sẵn mật khẩu để test đăng nhập thật.
 * Email: dev@worklingo.local | Mật khẩu: devpass123 | role: admin (để test /admin)
 * Chạy: npx tsx lib/db/seed-user.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

const DEV_USER_EMAIL = "dev@worklingo.local";
const DEV_PASSWORD = "devpass123";

async function main() {
  const hash = await bcrypt.hash(DEV_PASSWORD, 10);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);

  let userId: string;
  if (existing[0]) {
    userId = existing[0].id;
    await db
      .update(users)
      .set({ passwordHash: hash, role: "admin" })
      .where(eq(users.id, userId));
    console.log(`User test cập nhật: ${DEV_USER_EMAIL} (role=admin)`);
  } else {
    const [u] = await db
      .insert(users)
      .values({
        email: DEV_USER_EMAIL,
        name: "Dev User",
        role: "admin",
        passwordHash: hash,
      })
      .returning({ id: users.id });
    userId = u.id;
    console.log(`Đã tạo user test: ${DEV_USER_EMAIL} (role=admin)`);
  }
  console.log(`DEV_USER_ID=${userId}`);
  console.log(`Đăng nhập: ${DEV_USER_EMAIL} / ${DEV_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-user lỗi:", err);
  process.exit(1);
});
