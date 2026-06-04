"use server";

import bcrypt from "bcryptjs";
import {
  createUserWithPassword,
  getUserByEmail,
} from "@/lib/repositories/users";

export type RegisterResult = { ok: boolean; error?: string };

/** Đăng ký bằng email + mật khẩu (≥8 ký tự). */
export async function registerAction(
  email: string,
  password: string,
  name: string,
): Promise<RegisterResult> {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return { ok: false, error: "Email không hợp lệ" };
  if (password.length < 8)
    return { ok: false, error: "Mật khẩu tối thiểu 8 ký tự" };
  const existing = await getUserByEmail(e);
  if (existing) return { ok: false, error: "Email đã được đăng ký" };
  const hash = await bcrypt.hash(password, 10);
  await createUserWithPassword({ email: e, name: name.trim() || undefined, passwordHash: hash });
  return { ok: true };
}
