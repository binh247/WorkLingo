"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { requestResetAction } from "./actions";

export function ForgotForm() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      await requestResetAction(email);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <p className="text-center font-bold text-ink">
        Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại. Kiểm tra hộp thư
        (hoặc console server ở môi trường dev).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="wl-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button3D variant="primary" disabled={pending} onClick={submit}>
        {pending ? "Đang gửi…" : "Gửi liên kết"}
      </Button3D>
    </div>
  );
}
