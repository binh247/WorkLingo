"use client";

import * as React from "react";
import { makeCloze } from "@/lib/srs/cloze";
import { cn } from "@/lib/utils";
import type { ReviewItem } from "@/components/ReviewCard";

export type NotePoolItem = {
  targetWord: string;
  reading: string;
  meaning: string;
};

type Option = { text: string; ok: boolean; jp: boolean };

const TYPE_BADGE: Record<ReviewItem["type"], { tag: string; color: string }> = {
  recognition: { tag: "Nhận diện", color: "bg-info/10 text-info-dark" },
  cloze: { tag: "Điền câu", color: "bg-xp/20 text-yellow-700" },
  production: { tag: "Sản sinh", color: "bg-brand/10 text-brand-dark" },
  reading: { tag: "Cách đọc", color: "bg-info/10 text-info-dark" },
};

const QUESTION: Record<ReviewItem["type"], string> = {
  recognition: "Từ tô màu nghĩa là gì?",
  cloze: "Điền từ còn thiếu vào chỗ trống",
  production: "Từ này trong tiếng Nhật là gì?",
  reading: "Từ này đọc như thế nào?",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Đáp án đúng + tối đa 3 đáp án nhiễu lấy từ kho từ của user. */
function buildOptions(item: ReviewItem, pool: NotePoolItem[]): Option[] {
  let correct: string;
  let candidates: string[];
  let jp: boolean;
  switch (item.type) {
    case "recognition":
      correct = item.meaning;
      candidates = pool.map((p) => p.meaning);
      jp = false;
      break;
    case "cloze":
    case "production":
      correct = item.targetWord;
      candidates = pool.map((p) => p.targetWord);
      jp = true;
      break;
    case "reading":
      correct = item.reading || item.targetWord;
      candidates = pool.map((p) => p.reading).filter(Boolean);
      jp = true;
      break;
  }
  const distractors = shuffle(
    [...new Set(candidates)].filter((c) => c && c !== correct),
  ).slice(0, 3);
  return shuffle([
    { text: correct, ok: true, jp },
    ...distractors.map((t) => ({ text: t, ok: false, jp })),
  ]);
}

/** Mặt câu hỏi (prompt) theo loại thẻ. */
function Prompt({ item }: { item: ReviewItem }) {
  if (item.type === "recognition") {
    const parts = item.sentenceText.split(item.targetWord);
    return (
      <p className="font-jp text-center text-2xl leading-relaxed sm:text-3xl">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {p}
            {i < parts.length - 1 && (
              <span className="font-extrabold text-info">
                {item.targetWord}
              </span>
            )}
          </React.Fragment>
        ))}
      </p>
    );
  }
  if (item.type === "cloze") {
    const { text } = makeCloze(item.sentenceText, item.targetWord);
    return (
      <p className="font-jp text-center text-2xl leading-relaxed sm:text-3xl">
        {text}
      </p>
    );
  }
  if (item.type === "production") {
    return (
      <p className="text-center text-2xl font-extrabold leading-relaxed sm:text-3xl">
        “{item.meaning}”
      </p>
    );
  }
  return (
    <p className="font-jp text-center text-4xl font-black leading-relaxed">
      {item.targetWord}
    </p>
  );
}

export function ReviewQuiz({
  item,
  pool,
  onCheck,
  onNext,
}: {
  item: ReviewItem;
  pool: NotePoolItem[];
  /** Gọi khi KIỂM TRA — parent ghi review, cập nhật tim/combo & trả XP + combo. */
  onCheck: (correct: boolean) => Promise<{ xp: number; combo: number }>;
  /** Gọi khi TIẾP TỤC — parent sang thẻ kế / kết thúc. */
  onNext: () => void;
}) {
  const options = React.useMemo(() => buildOptions(item, pool), [item, pool]);
  // Component được parent render với key={cardId} → tự remount mỗi thẻ,
  // nên state dưới đây luôn khởi tạo lại; không cần effect reset.
  const [selected, setSelected] = React.useState(-1);
  const [checked, setChecked] = React.useState(false);
  const [gainedXp, setGainedXp] = React.useState(0);
  const [gainedCombo, setGainedCombo] = React.useState(0);

  const correctIdx = options.findIndex((o) => o.ok);
  const isCorrect = selected === correctIdx;

  // Parent (ReviewClient) lo confetti + hiệu ứng tim/combo trên header.
  const doCheck = React.useCallback(async () => {
    if (checked || selected < 0) return;
    setChecked(true);
    const res = await onCheck(isCorrect);
    setGainedXp(res.xp);
    setGainedCombo(res.combo);
  }, [checked, selected, isCorrect, onCheck]);

  // Phím tắt: 1-4 chọn, Enter = KIỂM TRA/TIẾP TỤC. Nhường Enter cho control
  // đang focus (nút đáp án, ×, toggle…) — preventDefault vô điều kiện sẽ
  // nuốt thao tác bàn phím chuẩn và có thể nộp nhầm đáp án đang chọn dở.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) {
        // Giữ Enter: chặn cả native click lặp (focus đang ở nút TIẾP TỤC
        // sau KIỂM TRA) để không lướt qua màn feedback ngoài ý muốn.
        if (e.key === "Enter") e.preventDefault();
        return;
      }
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("input, textarea, select")) return;
      if (!checked && e.key >= "1" && e.key <= String(options.length)) {
        setSelected(Number(e.key) - 1);
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (target?.closest("button, a")) return; // để control tự xử lý
        e.preventDefault();
        if (!checked) doCheck();
        else onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checked, options.length, doCheck, onNext]);

  // Sau KIỂM TRA, nút cũ unmount → focus rơi về body; chuyển focus sang
  // TIẾP TỤC để bàn phím/screen reader không mất ngữ cảnh.
  const nextBtnRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (checked) nextBtnRef.current?.focus();
  }, [checked]);

  const badge = TYPE_BADGE[item.type];

  return (
    <div className="flex flex-1 flex-col">
      {/* Stage */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8">
        <div className="mx-auto w-full max-w-2xl py-4 sm:py-8">
          <div className="bounce-in">
            <div className="mb-5 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
                  badge.color,
                )}
              >
                {badge.tag}
              </span>
            </div>
            <h2 className="mb-6 text-center text-xl font-extrabold sm:text-2xl">
              {QUESTION[item.type]}
            </h2>
            <div className="mb-7 flex min-h-[120px] items-center justify-center rounded-3xl border-2 border-[#F2F2F2] bg-[#FAFAFA] px-5 py-8 sm:py-10">
              <Prompt item={item} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {options.map((o, i) => {
                const picked = selected === i;
                let cls =
                  "border-[#E5E5E5] bg-white hover:bg-[#FAFAFA] active:scale-[0.98]";
                if (checked) {
                  if (o.ok) cls = "border-brand bg-brand/10 text-brand-dark";
                  else if (picked)
                    cls = "border-danger bg-danger/10 text-danger shake";
                  else cls = "border-[#E5E5E5] opacity-60";
                } else if (picked) {
                  cls = "border-info bg-info/5";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={checked}
                    onClick={() => !checked && setSelected(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition-all",
                      cls,
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm",
                        picked && !checked
                          ? "border-info text-info"
                          : "border-[#E5E5E5] text-ink-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={o.jp ? "font-jp" : undefined}>
                      {o.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: feedback + nút hành động */}
      <div
        className={cn(
          "border-t-2 border-[#F2F2F2] transition-colors duration-300",
          checked && (isCorrect ? "bg-brand/10" : "bg-danger/10"),
        )}
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-8">
          {/* Live region tồn tại sẵn trong DOM → screen reader đọc kết quả
              đúng/sai + đáp án ngay khi xuất hiện. */}
          <div role="status">
          {checked && (
            <div className="mb-4 flex items-center gap-3">
              {isCorrect ? (
                <>
                  <span className="text-2xl">✓</span>
                  <div className="font-extrabold text-brand-dark">
                    Chính xác!{" "}
                    {gainedXp > 0 && (
                      <span className="text-xp">+{gainedXp} XP</span>
                    )}
                    {gainedCombo >= 2 && (
                      <span className="ml-2 text-orange-500">
                        · {gainedCombo >= 5 ? "⚡" : "🔥"} Combo ×{gainedCombo}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-2xl">✕</span>
                  <div className="font-extrabold text-danger">
                    Chưa đúng — đáp án:{" "}
                    <span
                      className={cn(
                        "underline decoration-2 underline-offset-2",
                        options[correctIdx]?.jp && "font-jp",
                      )}
                    >
                      {options[correctIdx]?.text}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          </div>
          {!checked ? (
            <button
              type="button"
              disabled={selected < 0}
              onClick={doCheck}
              className={cn(
                "btn-3d w-full py-4 text-lg tracking-wide sm:text-xl",
                selected < 0
                  ? "cursor-not-allowed border-[#E5E5E5] bg-[#E5E5E5] text-ink-muted"
                  : "btn-primary",
              )}
            >
              KIỂM TRA
            </button>
          ) : (
            <button
              ref={nextBtnRef}
              type="button"
              onClick={onNext}
              className={cn(
                "btn-3d w-full py-4 text-lg tracking-wide text-white sm:text-xl",
                isCorrect
                  ? "border-brand-dark bg-brand"
                  : "border-danger-dark bg-danger",
              )}
            >
              TIẾP TỤC
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewQuiz;
