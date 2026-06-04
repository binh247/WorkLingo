"use client";

import * as React from "react";
import { Volume2, Plus, X } from "lucide-react";
import { Button3D } from "@/components/Button3D";
import { speakWord } from "@/lib/tts";
import type { Token } from "@/lib/db/types";
import type { WordStatus } from "@/lib/repositories/userWords";

export interface WordPopupProps {
  token: Token;
  status?: WordStatus;
  saving?: boolean;
  onSave: () => void;
  onMarkKnown: () => void;
  onClose: () => void;
}

/**
 * Popup nghĩa từ — ĐỌC THẲNG từ token (0 request API). docs/02 §5.
 * Nút 🔊 đọc theo reading kana; Lưu thẻ / Đã biết.
 */
export function WordPopup({
  token,
  status,
  saving,
  onSave,
  onMarkKnown,
  onClose,
}: WordPopupProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
    >
      <div
        className="wl-card bounce-in m-3 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-2 flex items-start justify-between">
          <div className="font-jp">
            <div className="text-3xl font-black text-ink">{token.surface}</div>
            <div className="text-sm font-bold text-ink-muted">
              {token.reading}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Phát âm"
              className="wl-chip"
              onClick={() => speakWord(token.reading || token.surface)}
            >
              <Volume2 size={18} />
            </button>
            <button aria-label="Đóng" className="wl-chip" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <p className="text-base font-bold text-ink">{token.meaning_vi}</p>
        <p className="mb-4 text-sm text-ink-muted">{token.pos}</p>

        <div className="flex gap-2">
          {status === "learning" ? (
            <span className="wl-badge bg-brand/15 text-brand-dark">
              Đã lưu thẻ
            </span>
          ) : (
            <Button3D
              variant="primary"
              className="flex-1"
              disabled={saving}
              onClick={onSave}
            >
              <Plus size={18} /> Lưu thẻ
            </Button3D>
          )}
          <Button3D
            variant="neutral"
            disabled={saving || status === "known"}
            onClick={onMarkKnown}
          >
            {status === "known" ? "Đã biết" : "Đã biết / Bỏ qua"}
          </Button3D>
        </div>
      </div>
    </div>
  );
}

export default WordPopup;
