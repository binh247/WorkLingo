"use server";

import { headers } from "next/headers";
import { getUserByEmail } from "@/lib/repositories/users";
import { createResetToken } from "@/lib/repositories/password-reset";
import { sendEmail } from "@/lib/email";

/** Luôn trả thông báo trung lập (không lộ email tồn tại hay không). */
export async function requestResetAction(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const user = await getUserByEmail(e);
  if (user) {
    const token = await createResetToken(e);
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const link = `${proto}://${host}/reset-password?email=${encodeURIComponent(e)}&token=${token}`;
    await sendEmail({
      to: e,
      subject: "Đặt lại mật khẩu WorkLingo",
      text: `Mở liên kết để đặt lại mật khẩu (hết hạn 30 phút): ${link}`,
    });
  }
}
