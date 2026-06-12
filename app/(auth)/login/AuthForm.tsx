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
  const [showPw, setShowPw] = React.useState(false);
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
      <h2 className="mb-2 text-center text-xl font-extrabold text-ink">
        {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </h2>

      {mode === "register" && (
        <div>
          <label className="mb-1 ml-1 block text-sm font-bold text-ink-muted">
            Tên hiển thị
          </label>
          <input
            className="wl-input"
            placeholder="Tên của bạn"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="mb-1 ml-1 block text-sm font-bold text-ink-muted">
          Email
        </label>
        <input
          className="wl-input"
          type="email"
          autoComplete="email"
          placeholder="ban@congty.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 ml-1 block text-sm font-bold text-ink-muted">
          Mật khẩu
        </label>
        <div className="relative">
          <input
            className="wl-input pr-12"
            type={showPw ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button
            type="button"
            aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 select-none text-xl"
          >
            {showPw ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {mode === "login" && (
        <div className="text-right">
          <Link
            href="/forgot"
            className="text-sm font-bold text-info hover:text-info-dark"
          >
            Quên mật khẩu?
          </Link>
        </div>
      )}

      {error && (
        <p className="text-sm font-bold text-danger" role="alert">
          {error}
        </p>
      )}

      <Button3D
        variant="primary"
        className="w-full text-lg uppercase tracking-wide"
        disabled={pending}
        onClick={submit}
      >
        {pending
          ? "Đang xử lý…"
          : mode === "login"
            ? "Đăng nhập"
            : "Đăng ký"}
      </Button3D>

      {googleEnabled && (
        <>
          <div className="my-2 flex items-center gap-3">
            <div className="h-0.5 flex-1 rounded-full bg-[#E5E5E5]" />
            <span className="text-sm font-bold text-ink-muted">hoặc</span>
            <div className="h-0.5 flex-1 rounded-full bg-[#E5E5E5]" />
          </div>
          <Button3D
            variant="neutral"
            className="w-full"
            disabled={pending}
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Đăng nhập với Google
          </Button3D>
        </>
      )}

      <p className="mt-3 text-center text-sm font-bold text-ink-muted">
        {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <button
          type="button"
          className="font-extrabold text-brand hover:text-brand-dark"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Đăng ký" : "Đăng nhập"}
        </button>
      </p>
    </div>
  );
}
