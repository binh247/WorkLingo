"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Token } from "@/lib/db/types";

export interface SentenceViewProps {
  tokens: Token[];
  onWordClick?: (token: Token, index: number) => void;
  /** Lemma cần nhấn mạnh (vd câu i+1 ở Phase 3). */
  highlightWords?: Set<string>;
  /** lemma → trạng thái: learning (xanh) / known (xám mờ). */
  statusMap?: Map<string, "new" | "learning" | "known">;
  className?: string;
}

/**
 * Render câu tiếng Nhật + furigana (ruby) ĐỌC THẲNG TỪ tokens — KHÔNG gọi API,
 * KHÔNG Kuromoji (docs/02 §5). Mỗi từ click được. Dùng lại ở màn Học (Phase 3).
 */
export function SentenceView({
  tokens,
  onWordClick,
  highlightWords,
  statusMap,
  className,
}: SentenceViewProps) {
  return (
    <span className={cn("font-jp text-lg leading-loose text-ink", className)}>
      {tokens.map((t, i) => {
        const clickable = !!onWordClick && t.worthLearning;
        const status = statusMap?.get(t.lemma || t.surface);
        const hot =
          t.worthLearning ||
          (highlightWords ? highlightWords.has(t.lemma) : false);
        const showFurigana = t.reading && t.reading !== t.surface;
        const content = showFurigana ? (
          <ruby>
            {t.surface}
            <rt>{t.reading}</rt>
          </ruby>
        ) : (
          t.surface
        );
        return (
          <span
            key={i}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onWordClick!(t, i) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onWordClick!(t, i);
                    }
                  }
                : undefined
            }
            className={cn(
              clickable && "cursor-pointer rounded-md transition-colors",
              hot && "bg-[#FFF4CC] px-0.5 font-bold hover:bg-[#FFE894]",
              status === "learning" &&
                "bg-[#E8F9DC] underline decoration-brand decoration-2",
              status === "known" && "text-ink-muted opacity-60",
            )}
          >
            {content}
          </span>
        );
      })}
    </span>
  );
}

export default SentenceView;
