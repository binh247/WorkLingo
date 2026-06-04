"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { Card } from "@/components/Card";
import { updateAppSettingAction } from "./actions";
import type { AppSetting } from "@/lib/db/schema";

export function AdminSettings({ settings }: { settings: AppSetting[] }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-black text-ink">Cấu hình hệ thống</h2>
      <div className="flex flex-col gap-3">
        {settings.map((s) => (
          <SettingRow key={s.key} setting={s} />
        ))}
      </div>
    </Card>
  );
}

function SettingRow({ setting }: { setting: AppSetting }) {
  const initial =
    setting.type === "string"
      ? String(setting.value)
      : JSON.stringify(setting.value);
  const [val, setVal] = React.useState(initial);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateAppSettingAction(setting.key, val, setting.type);
      setMsg(res.ok ? "✓ Đã lưu" : (res.error ?? "Lỗi"));
    });
  }

  return (
    <div className="flex flex-col gap-1 border-b border-[#EEE] pb-2">
      <label className="text-sm font-extrabold text-ink">
        {setting.key}{" "}
        <span className="font-bold text-ink-muted">({setting.type})</span>
      </label>
      {setting.description && (
        <p className="text-xs text-ink-muted">{setting.description}</p>
      )}
      <div className="flex gap-2">
        <input
          className="wl-input font-mono text-sm"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <Button3D variant="primary" size="sm" disabled={pending} onClick={save}>
          Lưu
        </Button3D>
      </div>
      {msg && <span className="text-xs font-bold text-brand-dark">{msg}</span>}
    </div>
  );
}
