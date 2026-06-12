"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { Button3D } from "@/components/Button3D";
import { cn } from "@/lib/utils";
import { updateSettingsAction } from "./actions";

const CARD_TYPES = [
  {
    key: "recognition",
    icon: "👀",
    label: "Nhận diện",
    desc: "Hiện kanji + câu gốc, bạn nhớ cách đọc và nghĩa.",
  },
  {
    key: "cloze",
    icon: "✏️",
    label: "Cloze (điền câu)",
    desc: "Che từ trong câu (＿＿), bạn điền lại từ còn thiếu.",
  },
  {
    key: "production",
    icon: "🗣️",
    label: "Sản sinh",
    desc: "Hiện nghĩa tiếng Việt, bạn tự nhớ ra từ tiếng Nhật.",
  },
  {
    key: "reading",
    icon: "📖",
    label: "Đọc (kanji → cách đọc)",
    desc: "Hiện kanji, bạn nhớ cách đọc (furigana).",
  },
] as const;

function Switch({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors duration-200",
        on ? "border-brand-dark bg-brand" : "border-[#D5D5D5] bg-[#E5E5E5]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
          on ? "left-6" : "left-0.5",
        )}
      />
    </button>
  );
}

export function SettingsClient({
  enabledCardTypes,
  soundEnabled,
  cardCounts,
  email,
}: {
  enabledCardTypes: string[];
  soundEnabled: boolean;
  cardCounts: Record<string, number>;
  email: string;
}) {
  const [enabled, setEnabled] = React.useState<Set<string>>(
    () => new Set(enabledCardTypes),
  );
  const [sound, setSound] = React.useState(soundEnabled);
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [confirm, setConfirm] = React.useState<string | null>(null);

  function toggleType(key: string) {
    if (enabled.has(key) && cardCounts[key] > 0) {
      setConfirm(key); // tắt loại đang có thẻ → xác nhận
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

  const count = enabled.size;

  return (
    <div className="flex flex-col gap-6">
      {/* Nhóm: Loại thẻ */}
      <section>
        <h2 className="mb-3 px-1 text-xs font-extrabold uppercase tracking-widest text-ink-muted">
          Loại thẻ
        </h2>
        <div className="divide-y-2 divide-[#F2F2F2] overflow-hidden rounded-3xl border-2 border-[#EEE] bg-white">
          {CARD_TYPES.map((t) => (
            <div key={t.key} className="flex items-start gap-4 p-5">
              <div className="mt-0.5 text-3xl leading-none">{t.icon}</div>
              <div className="flex-1">
                <p className="text-lg font-extrabold text-ink">
                  {t.label}
                  {cardCounts[t.key] > 0 && (
                    <span className="ml-2 text-sm font-bold text-ink-muted">
                      ({cardCounts[t.key]} thẻ)
                    </span>
                  )}
                </p>
                <p className="text-sm font-bold leading-snug text-ink-muted">
                  {t.desc}
                </p>
              </div>
              <div className="mt-1">
                <Switch
                  on={enabled.has(t.key)}
                  onClick={() => toggleType(t.key)}
                  label={`Bật/tắt loại thẻ ${t.label}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Cảnh báo động */}
        <div
          className={cn(
            "bounce-in mt-3 flex items-start gap-3 rounded-2xl border-2 px-4 py-3",
            count === 0
              ? "border-danger bg-danger/10"
              : "border-xp bg-xp/15",
          )}
        >
          <span className="text-xl leading-none">
            {count === 0 ? "🚫" : "⚠️"}
          </span>
          <p className="text-sm font-bold leading-snug text-ink">
            {count === 0 ? (
              <>
                <span className="font-extrabold text-danger">
                  Chưa bật loại thẻ nào
                </span>{" "}
                — sẽ không có thẻ nào được tạo để ôn.
              </>
            ) : (
              <>
                Bật <span className="font-extrabold text-yellow-700">{count}</span>{" "}
                loại = mỗi từ tạo{" "}
                <span className="font-extrabold text-yellow-700">{count}</span>{" "}
                thẻ ôn.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Nhóm: Học */}
      <section>
        <h2 className="mb-3 px-1 text-xs font-extrabold uppercase tracking-widest text-ink-muted">
          Học
        </h2>
        <div className="overflow-hidden rounded-3xl border-2 border-[#EEE] bg-white">
          <div className="flex items-center gap-4 p-5">
            <div className="text-3xl leading-none">🔊</div>
            <div className="flex-1">
              <p className="text-lg font-extrabold text-ink">Âm thanh</p>
              <p className="text-sm font-bold leading-snug text-ink-muted">
                Phát âm thanh phản hồi khi học và ôn.
              </p>
            </div>
            <Switch
              on={sound}
              onClick={() => setSound((v) => !v)}
              label="Bật/tắt âm thanh"
            />
          </div>
        </div>
      </section>

      {/* Lưu */}
      <div className="flex items-center gap-3">
        <Button3D
          variant="primary"
          className="flex-1"
          disabled={pending}
          onClick={save}
        >
          {pending ? "Đang lưu…" : "Lưu cài đặt"}
        </Button3D>
        {saved && (
          <span className="text-sm font-bold text-brand-dark">Đã lưu!</span>
        )}
      </div>

      {/* Nhóm: Tài khoản */}
      <section>
        <h2 className="mb-3 px-1 text-xs font-extrabold uppercase tracking-widest text-ink-muted">
          Tài khoản
        </h2>
        <div className="divide-y-2 divide-[#F2F2F2] overflow-hidden rounded-3xl border-2 border-[#EEE] bg-white">
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-brand bg-brand/15 text-2xl font-extrabold uppercase text-brand-dark">
              {email.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink-muted">{email}</p>
            </div>
          </div>
          <div className="p-5">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-3d w-full border-danger bg-white py-3.5 font-extrabold tracking-wide text-danger hover:bg-danger/5"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </section>

      {/* Nhóm: Dữ liệu */}
      <section>
        <h2 className="mb-3 px-1 text-xs font-extrabold uppercase tracking-widest text-ink-muted">
          Dữ liệu
        </h2>
        <div className="rounded-3xl border-2 border-[#EEE] bg-white p-5">
          <a
            href="/api/export/anki"
            download
            className="btn-3d btn-neutral w-full"
          >
            📤 Xuất thẻ sang Anki (TSV)
          </a>
        </div>
      </section>

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
              Tắt loại thẻ này sẽ ẩn <b>{cardCounts[confirm]} thẻ</b> khỏi hàng
              đợi ôn (không xóa, giữ tiến độ). Tiếp tục?
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
    </div>
  );
}
