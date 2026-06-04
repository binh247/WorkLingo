"use server";

import bcrypt from "bcryptjs";
import { consumeResetToken } from "@/lib/repositories/password-reset";
import { getUserByEmail, setUserPasswordHash } from "@/lib/repositories/users";

export type ResetResult = { ok: boolean; error?: string };

export async function resetPasswordAction(
  email: string,
  token: string,
  password: string,
  confirm: string,
): Promise<ResetResult> {
  if (password.length < 8)
    return { ok: false, error: "Mật khẩu tối thiểu 8 ký tự" };
  if (password !== confirm) return { ok: false, error: "Xác nhận không khớp" };

  const valid = await consumeResetToken(email, token);
  if (!valid) return { ok: false, error: "Liên kết hết hạn hoặc không hợp lệ" };

  const user = await getUserByEmail(email.toLowerCase());
  if (!user) return { ok: false, error: "Tài khoản không tồn tại" };

  const hash = await bcrypt.hash(password, 10);
  await setUserPasswordHash(user.id, hash);
  return { ok: true };
}
