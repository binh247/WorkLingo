"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Button3D } from "@/components/Button3D";
import { ReviewCard, type ReviewItem } from "@/components/ReviewCard";
import { ReviewQuiz, type NotePoolItem } from "@/components/ReviewQuiz";
import { Hearts } from "@/components/Hearts";
import { ComboMeter } from "@/components/ComboMeter";
import { playCorrect, playWrong, playComplete } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/srs";
import { submitReview } from "./actions";

type Mode = "quiz" | "self";

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ReviewClient({
  items,
  pool,
  soundEnabled,
}: {
  items: ReviewItem[];
  pool: NotePoolItem[];
  soundEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("quiz");
  const [queue, setQueue] = React.useState<ReviewItem[]>(items);
  const [idx, setIdx] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [reviewed, setReviewed] = React.useState(0);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [xp, setXp] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [hearts, setHearts] = React.useState(5);
  const [combo, setCombo] = React.useState(0);
  const [maxCombo, setMaxCombo] = React.useState(0);
  const [edgeFlash, setEdgeFlash] = React.useState(0);
  const lastRating = React.useRef<Rating>(3);
  // Chống double-fire: khoá khi commit đang chạy + mỗi vị trí queue chỉ ghi 1 lần
  // (double-click/giữ phím gây ghi đúp SRS/XP, nhảy cóc thẻ, crash hết queue).
  const busy = React.useRef(false);
  const committedIdx = React.useRef(-1);
  const total = items.length;

  // Overlay phủ toàn màn: làm trơ (inert) khung app phía sau để Tab/screen
  // reader không lọt vào sidebar vô hình; thoát hợp lệ qua nút ×.
  React.useEffect(() => {
    if (total === 0) return;
    const chrome = document.querySelectorAll<HTMLElement>("[data-app-chrome]");
    chrome.forEach((el) => (el.inert = true));
    return () => chrome.forEach((el) => (el.inert = false));
  }, [total]);

  // ----- Trạng thái rỗng -----
  if (total === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <div className="text-6xl">✅</div>
        <h1 className="text-xl font-black text-ink">Hết thẻ đến hạn!</h1>
        <p className="font-bold text-ink-muted">
          Bạn đã ôn hết hôm nay. Quay lại sau nhé.
        </p>
        <Button3D variant="primary" onClick={() => router.push("/dashboard")}>
          Về trang chủ
        </Button3D>
      </main>
    );
  }

  const current = queue[idx];

  /** Ghi 1 lượt ôn (đúng→Good, sai→Again hoặc rating tự chấm); trả XP + combo. */
  async function commit(
    card: ReviewItem,
    rating: Rating,
  ): Promise<{ xp: number; combo: number }> {
    // Mỗi vị trí queue chỉ ghi 1 lượt (chặn ghi đúp khi đổi chế độ sau
    // KIỂM TRA hoặc khi sự kiện bắn trùng).
    if (committedIdx.current === idx) return { xp: 0, combo };
    committedIdx.current = idx;

    const correct = rating >= 3;
    const wrong = rating === 1;

    // Combo + tim. Sai → mất 1 tim & reset combo; đúng → combo tăng.
    let nextCombo = combo;
    if (correct) {
      nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
    } else if (wrong) {
      nextCombo = 0;
      setCombo(0);
      setHearts((h) => Math.max(0, h - 1)); // hết tim VẪN ôn tiếp được
    }

    // Âm thanh: chuông đúng leo cao độ theo combo, sai là "womp" trầm.
    // Hard (rating 2) không đúng không sai → im lặng, khớp với tim/combo.
    if (correct) playCorrect(soundEnabled, nextCombo);
    else if (wrong) playWrong(soundEnabled);

    setReviewed((n) => n + 1);
    // Hard (rating 2) vẫn là nhớ được (FSRS) → tính vào độ chính xác,
    // nhất quán với việc Hard không trừ tim/không reset combo.
    if (rating >= 2) setCorrectCount((c) => c + 1);

    // Confetti leo thang theo combo; mốc 5/10/… lóe viền màn hình.
    if (correct && !reduceMotion) {
      const power = Math.min(nextCombo, 8);
      confetti({
        particleCount: 60 + power * 22,
        spread: 60 + power * 6,
        startVelocity: 35 + power * 3,
        origin: { y: 0.7 },
        colors: ["#58CC02", "#FFC800", "#1CB0F6", "#FF4B4B"],
      });
      if (nextCombo >= 5 && nextCombo % 5 === 0) setEdgeFlash((f) => f + 1);
    }

    try {
      const res = await submitReview(card.cardId, rating);
      setXp((x) => x + res.xpGained);
      setStreak(res.streak);
      return { xp: res.xpGained, combo: nextCombo };
    } catch {
      return { xp: 0, combo: nextCombo };
    }
  }

  function advance(card: ReviewItem, rating: Rating) {
    const isLast = idx + 1 >= queue.length;
    if (rating === 1) setQueue((q) => [...q, card]); // Again → cuối hàng đợi
    if (isLast && rating !== 1) {
      playComplete(soundEnabled);
      if (!reduceMotion) {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
      }
      setDone(true);
    } else {
      setIdx((i) => i + 1);
    }
  }

  // Chế độ tự chấm (FSRS): chấm xong sang thẻ luôn.
  async function onRate(rating: Rating) {
    if (busy.current) return; // chặn double-click/giữ phím trong lúc await
    busy.current = true;
    try {
      const card = current;
      await commit(card, rating);
      advance(card, rating);
    } finally {
      busy.current = false;
    }
  }

  // Chế độ trắc nghiệm: KIỂM TRA ghi review, TIẾP TỤC mới sang thẻ.
  function onCheck(correct: boolean): Promise<{ xp: number; combo: number }> {
    const rating: Rating = correct ? 3 : 1;
    lastRating.current = rating;
    return commit(current, rating);
  }
  function onNext() {
    advance(current, lastRating.current);
  }

  // ----- Màn kết thúc -----
  if (done) {
    // Tính trên TỔNG LƯỢT trả lời (gồm cả lượt ôn lại) — nếu chia cho total,
    // quiz mode luôn ra 100% vì thẻ sai được lặp tới khi đúng mới kết thúc.
    const acc = reviewed > 0 ? Math.round((correctCount / reviewed) * 100) : 0;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kết quả phiên ôn tập"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-4 text-center"
      >
        <div className="bounce-in flex w-full max-w-md flex-col items-center gap-4">
          <div className="text-7xl">🎉</div>
          <h1 className="text-3xl font-black text-ink">Hoàn thành! 🎉</h1>
          <p className="font-bold text-ink-muted">
            Bạn đã ôn xong {total} thẻ hôm nay. Giỏi lắm!
          </p>
          <div className="grid w-full grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-xp/40 bg-xp/10 py-5">
              <div className="text-xs font-extrabold uppercase tracking-wide text-yellow-700">
                Tổng XP
              </div>
              <div className="text-2xl font-extrabold text-xp">⭐ +{xp}</div>
            </div>
            <div className="rounded-2xl border-2 border-brand/40 bg-brand/10 py-5">
              <div className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                Độ chính xác
              </div>
              <div className="text-2xl font-extrabold text-brand-dark">
                {acc}%
              </div>
            </div>
          </div>
          {maxCombo >= 2 && (
            <div className="flex items-center gap-2 text-lg font-extrabold text-xp">
              ⚡ Combo cao nhất ×{maxCombo}
            </div>
          )}
          <Button3D
            variant="primary"
            className="px-10 py-4 text-lg"
            onClick={() => router.push("/dashboard")}
          >
            Về trang chủ 🔥 {streak}
          </Button3D>
        </div>
      </div>
    );
  }

  // Mẫu số là queue.length hiện tại: thẻ sai bị đẩy về cuối làm queue dài ra
  // → bar chỉ chạm 100% khi thật sự hết (không "đầy giả" lúc còn thẻ lặp).
  const progress = Math.min(100, (idx / Math.max(queue.length, 1)) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phiên ôn tập"
      className="fixed inset-0 z-50 flex flex-col bg-white text-ink"
    >
      {/* Lóe viền màn hình ở mốc combo lớn */}
      {edgeFlash > 0 && <div key={edgeFlash} className="edge-flash" />}

      {/* HEADER — bố cục Duolingo: × · progress · ❤️ hearts */}
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-2 pt-5 sm:gap-5 sm:px-8">
        <button
          type="button"
          aria-label="Đóng"
          onClick={() => router.push("/dashboard")}
          className="shrink-0 text-3xl font-extrabold leading-none text-ink-muted transition-transform hover:text-ink active:scale-90"
        >
          ×
        </button>
        <div
          role="progressbar"
          aria-label="Tiến độ ôn tập"
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-valuenow={idx}
          className="h-4 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]"
        >
          <div
            className="wl-progress-fill h-full rounded-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Hearts count={hearts} />
      </div>

      {/* Vùng combo tia chớp — luôn giữ chỗ để không xô layout */}
      <div className="mx-auto flex h-9 w-full max-w-3xl items-center justify-center px-4">
        <ComboMeter combo={combo} />
      </div>

      {/* Nút chuyển chế độ */}
      <div className="mx-auto mb-1 flex w-full max-w-3xl justify-center px-4">
        <div className="inline-flex rounded-full border-2 border-[#EEE] bg-[#F7F7F7] p-1 text-sm font-extrabold">
          {(
            [
              { k: "quiz", label: "Trắc nghiệm" },
              { k: "self", label: "Tự chấm" },
            ] as const
          ).map((m) => (
            <button
              key={m.k}
              type="button"
              aria-pressed={mode === m.k}
              onClick={() => setMode(m.k)}
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors",
                mode === m.k
                  ? "bg-white text-brand-dark shadow-sm"
                  : "text-ink-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* BODY theo chế độ */}
      {/* key kèm idx: thẻ sai bị đẩy về cuối có thể là thẻ KẾ TIẾP (cùng
          cardId) — không remount sẽ kẹt ở trạng thái đã trả lời mãi mãi. */}
      {mode === "quiz" ? (
        <ReviewQuiz
          key={`${current.cardId}:${idx}`}
          item={current}
          pool={pool}
          onCheck={onCheck}
          onNext={onNext}
        />
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <ReviewCard
            key={`${current.cardId}:${idx}`}
            item={current}
            onRate={onRate}
          />
        </div>
      )}
    </div>
  );
}
