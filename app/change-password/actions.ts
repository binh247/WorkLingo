"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/session";
import { getUserById, setUserPasswordHash } from "@/lib/repositories/users";

export type ChangeResult = { ok: boolean; error?: string };

/** Đổi mật khẩu (docs/04 F1c). User Google chưa có hash → cho đặt mới. */
export async function changePasswordAction(
  current: string,
  next: string,
  confirm: string,
): Promise<ChangeResult> {
  const user = await requireUser();
  if (next.length < 8) return { ok: false, error: "Mật khẩu mới tối thiểu 8 ký tự" };
  if (next !== confirm) return { ok: false, error: "Xác nhận không khớp" };

  const u = await getUserById(user.id);
  if (!u) return { ok: false, error: "Không tìm thấy tài khoản" };

  if (u.passwordHash) {
    const ok = await bcrypt.compare(current, u.passwordHash);
    if (!ok) return { ok: false, error: "Mật khẩu hiện tại không đúng" };
  }
  const hash = await bcrypt.hash(next, 10);
  await setUserPasswordHash(user.id, hash);
  return { ok: true };
}
