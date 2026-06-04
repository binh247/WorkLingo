/**
 * Gửi email. MVP: nếu chưa cấu hình SMTP → log ra console (dev fallback).
 * GĐ sau cắm nodemailer/SMTP thật qua SMTP_* env.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const hasSmtp = !!process.env.SMTP_HOST;
  if (!hasSmtp) {
    console.log(
      `\n[EMAIL · console fallback]\n  To: ${opts.to}\n  Subject: ${opts.subject}\n  ${opts.text}\n`,
    );
    return;
  }
  // TODO: nodemailer transport từ SMTP_HOST/PORT/USER/PASS/FROM.
  console.log(`[EMAIL] gửi tới ${opts.to} (SMTP cấu hình — chưa nối transport).`);
}
