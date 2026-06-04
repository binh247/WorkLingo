"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { Card } from "@/components/Card";
import { setUserRoleAction, toggleUserDisabledAction } from "./actions";

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  disabled: boolean;
  streak: number | null;
};

export function AdminUsers({ users }: { users: Row[] }) {
  const [q, setQ] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const filtered = users.filter(
    (u) =>
      !q ||
      u.email?.toLowerCase().includes(q.toLowerCase()) ||
      u.name?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-ink">Người dùng</h2>
        <input
          className="wl-input max-w-48"
          placeholder="Tìm email/tên…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE] pb-2"
          >
            <div>
              <div className="font-extrabold text-ink">
                {u.name ?? "(chưa đặt tên)"}{" "}
                {u.role === "admin" && (
                  <span className="wl-badge bg-xp/30 text-ink">admin</span>
                )}
                {u.disabled && (
                  <span className="wl-badge bg-danger/15 text-danger">khoá</span>
                )}
              </div>
              <div className="text-xs font-bold text-ink-muted">
                {u.email} · 🔥 {u.streak ?? 0}
              </div>
            </div>
            <div className="flex gap-2">
              <Button3D
                variant="neutral"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    setUserRoleAction(u.id, u.role === "admin" ? "user" : "admin"),
                  )
                }
              >
                {u.role === "admin" ? "Bỏ admin" : "Cấp admin"}
              </Button3D>
              <Button3D
                variant={u.disabled ? "info" : "danger"}
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    toggleUserDisabledAction(u.id, !u.disabled),
                  )
                }
              >
                {u.disabled ? "Mở khoá" : "Khoá"}
              </Button3D>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
