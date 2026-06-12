/**
 * Gửi email. MVP: nếu chưa cấu hình SMTP → log ra console (dev fallback).
 * Cấu hình SMTP đọc từ app_settings (smtp_host/port/user/pass/from) qua lib/config.
 * GĐ sau cắm nodemailer/SMTP thật.
 */
import { getConfig } from "@/lib/config";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const smtpHost = await getConfig<string>("smtp_host");
  if (!smtpHost) {
    console.log(
      `\n[EMAIL · console fallback]\n  To: ${opts.to}\n  Subject: ${opts.subject}\n  ${opts.text}\n`,
    );
    return;
  }
  // TODO: nodemailer transport từ smtp_host/port/user/pass/from (app_settings).
  console.log(`[EMAIL] gửi tới ${opts.to} (SMTP cấu hình — chưa nối transport).`);
}
