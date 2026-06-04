"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Button3D } from "@/components/Button3D";
import Link from "next/link";
import { registerAction } from "./actions";

export function AuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      if (mode === "register") {
        const res = await registerAction(email, password, name);
        if (!res.ok) {
          setError(res.error ?? "Đăng ký thất bại");
          return;
        }
      }
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email hoặc mật khẩu không đúng (hoặc tài khoản bị khoá)");
        return;
      }
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {mode === "register" && (
        <input
          className="wl-input"
          placeholder="Tên hiển thị"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <input
        className="wl-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="wl-input"
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {error && (
        <p className="text-sm font-bold text-danger" role="alert">
          {error}
        </p>
      )}
      <Button3D variant="primary" disabled={pending} onClick={submit}>
        {pending
          ? "Đang xử lý…"
          : mode === "login"
            ? "Đăng nhập"
            : "Đăng ký"}
      </Button3D>

      {googleEnabled && (
        <Button3D
          variant="neutral"
          disabled={pending}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Đăng nhập với Google
        </Button3D>
      )}

      <div className="flex items-center justify-between text-sm font-bold text-ink-muted">
        <button
          type="button"
          className="underline"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Tạo tài khoản mới" : "Đã có tài khoản? Đăng nhập"}
        </button>
        <Link href="/forgot" className="underline">
          Quên mật khẩu?
        </Link>
      </div>
    </div>
  );
}
