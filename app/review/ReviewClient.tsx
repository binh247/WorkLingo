"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button3D } from "@/components/Button3D";
import { ReviewCard, type ReviewItem } from "@/components/ReviewCard";
import { Celebration } from "@/components/Celebration";
import { ProgressBar } from "@/components/ProgressBar";
import { playCorrect, playWrong, playComplete } from "@/lib/sound";
import type { Rating } from "@/lib/srs";
import { submitReview } from "./actions";

export function ReviewClient({
  items,
  soundEnabled,
}: {
  items: ReviewItem[];
  soundEnabled: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = React.useState<ReviewItem[]>(items);
  const [idx, setIdx] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [reviewed, setReviewed] = React.useState(0);
  const [xp, setXp] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const total = items.length;

  if (total === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-black text-ink">Hết thẻ đến hạn!</h1>
        <p className="font-bold text-ink-muted">Quay lại sau nhé.</p>
        <Button3D variant="primary" onClick={() => router.push("/")}>
          Về trang chủ
        </Button3D>
      </div>
    );
  }

  if (done) {
    return (
      <Celebration
        reviewed={reviewed}
        xp={xp}
        streak={streak}
        onDone={() => router.push("/")}
      />
    );
  }

  const current = queue[idx];

  async function onRate(rating: Rating) {
    const card = queue[idx];
    if (rating >= 3) playCorrect(soundEnabled);
    else playWrong(soundEnabled);

    // optimistic: sang thẻ kế tiếp ngay
    const isLast = idx + 1 >= queue.length;
    setReviewed((n) => n + 1);

    try {
      const res = await submitReview(card.cardId, rating);
      setXp((x) => x + res.xpGained);
      setStreak(res.streak);
    } catch {
      /* giữ UX mượt; lỗi mạng hiếm */
    }

    // Again → xếp lại cuối hàng đợi 1 lần trong buổi
    if (rating === 1) {
      setQueue((q) => [...q, card]);
    }

    if (isLast && rating !== 1) {
      playComplete(soundEnabled);
      setDone(true);
    } else {
      setIdx((i) => i + 1);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <ProgressBar value={(reviewed / Math.max(total, 1)) * 100} />
        <div className="mt-1 text-center text-sm font-bold text-ink-muted">
          {Math.min(reviewed + 1, total)} / {total}
        </div>
      </div>
      <ReviewCard item={current} onRate={onRate} />
    </main>
  );
}
