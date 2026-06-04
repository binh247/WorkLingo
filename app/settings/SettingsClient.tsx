"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";
import { updateSettingsAction } from "./actions";

const CARD_TYPES = [
  { key: "recognition", label: "Nhận diện (từ → nghĩa)" },
  { key: "cloze", label: "Điền khuyết (cloze)" },
  { key: "production", label: "Sản sinh (nghĩa → từ)" },
  { key: "reading", label: "Đọc (kanji → cách đọc)" },
] as const;

export function SettingsClient({
  enabledCardTypes,
  soundEnabled,
  cardCounts,
}: {
  enabledCardTypes: string[];
  soundEnabled: boolean;
  cardCounts: Record<string, number>;
}) {
  const [enabled, setEnabled] = React.useState<Set<string>>(
    () => new Set(enabledCardTypes),
  );
  const [sound, setSound] = React.useState(soundEnabled);
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [confirm, setConfirm] = React.useState<string | null>(null);

  function toggleType(key: string) {
    const isOn = enabled.has(key);
    if (isOn && cardCounts[key] > 0) {
      // Tắt loại đang có thẻ → xác nhận (docs/09 §5)
      setConfirm(key);
      return;
    }
    applyToggle(key);
  }

  function applyToggle(key: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setConfirm(null);
  }

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateSettingsAction({
        enabledCardTypes: [...enabled],
        soundEnabled: sound,
      });
      setSaved(true);
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-extrabold text-ink">Loại thẻ</h2>
        {CARD_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => toggleType(t.key)}
            className={cn(
              "flex items-center justify-between rounded-2xl border-2 p-3 text-left font-bold transition-colors",
              enabled.has(t.key)
                ? "border-brand bg-[#E8F9DC] text-brand-dark"
                : "border-[#E5E5E5] text-ink-muted",
            )}
          >
            <span>{t.label}</span>
            <span className="text-sm">
              {enabled.has(t.key) ? "Bật" : "Tắt"}
              {cardCounts[t.key] > 0 && (
                <span className="ml-1 text-ink-muted">
                  ({cardCounts[t.key]} thẻ)
                </span>
              )}
            </span>
          </button>
        ))}
        {enabled.size >= 3 && (
          <p className="text-xs font-bold text-danger">
            Bật {enabled.size} loại = mỗi từ thành {enabled.size} thẻ ôn.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-ink">Âm thanh phản hồi</h2>
        <Button3D
          variant={sound ? "primary" : "neutral"}
          size="sm"
          onClick={() => setSound((v) => !v)}
        >
          {sound ? "Bật" : "Tắt"}
        </Button3D>
      </div>

      <Button3D variant="primary" disabled={pending} onClick={save}>
        {pending ? "Đang lưu…" : "Lưu cài đặt"}
      </Button3D>
      {saved && (
        <p className="text-center text-sm font-bold text-brand-dark">
          Đã lưu!
        </p>
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setConfirm(null)}
        >
          <div
            className="wl-card m-3 max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 font-bold text-ink">
              Tắt loại thẻ này sẽ ẩn{" "}
              <b>{cardCounts[confirm]} thẻ</b> khỏi hàng đợi ôn (không xóa, giữ
              tiến độ). Tiếp tục?
            </p>
            <div className="flex gap-2">
              <Button3D
                variant="danger"
                className="flex-1"
                onClick={() => applyToggle(confirm)}
              >
                Tắt &amp; ẩn thẻ
              </Button3D>
              <Button3D variant="neutral" onClick={() => setConfirm(null)}>
                Hủy
              </Button3D>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
