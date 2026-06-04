"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { cn } from "@/lib/utils";
import type { SuggestedWord } from "@/lib/study/word-selection";
import type { WordStatus } from "@/lib/repositories/userWords";

export interface SuggestedWordsProps {
  suggestions: SuggestedWord[];
  statusMap: Map<string, WordStatus>;
  enabledCount: number;
  saving?: boolean;
  onSaveAll: (lemmas: string[]) => void;
  onToggleSkip: (lemma: string) => void;
}

/** Khối "✨ N từ đáng học cho bạn" (docs/07 Bước 4 / 08 §2.1). */
export function SuggestedWords({
  suggestions,
  statusMap,
  enabledCount,
  saving,
  onSaveAll,
  onToggleSkip,
}: SuggestedWordsProps) {
  const active = suggestions.filter(
    (s) => statusMap.get(s.lemma) !== "known",
  );
  if (suggestions.length === 0) return null;

  return (
    <div className="wl-card flex flex-col gap-3 p-4">
      <div className="font-extrabold text-ink">
        ✨ Tài liệu này có {active.length} từ đáng học cho bạn:
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const known = statusMap.get(s.lemma) === "known";
          const learning = statusMap.get(s.lemma) === "learning";
          return (
            <button
              key={s.lemma}
              type="button"
              onClick={() => onToggleSkip(s.lemma)}
              className={cn(
                "wl-chip font-jp",
                learning && "wl-chip-on",
                known && "opacity-40 line-through",
              )}
              title={s.meaning_vi}
            >
              {s.surface}
              <span className="ml-1 text-xs text-ink-muted">{s.reading}</span>
            </button>
          );
        })}
      </div>

      {enabledCount >= 3 && (
        <p className="text-xs font-bold text-danger">
          Đang bật {enabledCount} loại thẻ → mỗi từ sẽ thành {enabledCount} thẻ
          ôn. Cân nhắc giảm trong Cài đặt.
        </p>
      )}

      <Button3D
        variant="primary"
        disabled={saving || active.length === 0}
        onClick={() => onSaveAll(active.map((s) => s.lemma))}
      >
        ✓ Lưu tất cả ({active.length})
      </Button3D>
    </div>
  );
}

export default SuggestedWords;
