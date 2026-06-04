"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = React.useTransition();

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await changePasswordAction(cur, next, confirm);
      if (res.ok) {
        setMsg({ ok: true, text: "Đã đổi mật khẩu!" });
        setCur("");
        setNext("");
        setConfirm("");
      } else {
        setMsg({ ok: false, text: res.error ?? "Lỗi" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="wl-input"
        type="password"
        placeholder="Mật khẩu hiện tại"
        value={cur}
        onChange={(e) => setCur(e.target.value)}
      />
      <input
        className="wl-input"
        type="password"
        placeholder="Mật khẩu mới (≥8 ký tự)"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <input
        className="wl-input"
        type="password"
        placeholder="Xác nhận mật khẩu mới"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {msg && (
        <p
          className={`text-sm font-bold ${msg.ok ? "text-brand-dark" : "text-danger"}`}
        >
          {msg.text}
        </p>
      )}
      <Button3D variant="primary" disabled={pending} onClick={submit}>
        {pending ? "Đang lưu…" : "Đổi mật khẩu"}
      </Button3D>
    </div>
  );
}
