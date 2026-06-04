/**
 * Token đặt lại mật khẩu — lưu trong verification_tokens, identifier "reset:<email>".
 * Token hết hạn sau 30 phút, dùng một lần.
 */
import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { verificationTokens } from "@/lib/db/schema";

const PREFIX = "reset:";
const TTL_MS = 30 * 60 * 1000;

export async function createResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const identifier = PREFIX + email.toLowerCase();
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({
    identifier,
    token,
    expires: new Date(Date.now() + TTL_MS),
  });
  return token;
}

/** Kiểm tra + tiêu thụ token (xoá). Trả true nếu hợp lệ & còn hạn. */
export async function consumeResetToken(
  email: string,
  token: string,
): Promise<boolean> {
  const identifier = PREFIX + email.toLowerCase();
  const rows = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);
  if (!rows[0]) return false;
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, identifier));
  return true;
}
