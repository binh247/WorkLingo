"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button3D } from "@/components/Button3D";
import { resetPasswordAction } from "./actions";

export function ResetForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await resetPasswordAction(email, token, pw, confirm);
      if (res.ok) router.push("/login");
      else setError(res.error ?? "Lỗi");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="wl-input"
        type="password"
        placeholder="Mật khẩu mới (≥8 ký tự)"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      <input
        className="wl-input"
        type="password"
        placeholder="Xác nhận mật khẩu mới"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && <p className="text-sm font-bold text-danger">{error}</p>}
      <Button3D variant="primary" disabled={pending} onClick={submit}>
        {pending ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
      </Button3D>
    </div>
  );
}
