"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import { Button3D } from "@/components/Button3D";

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Celebration({
  reviewed,
  xp,
  streak,
  onDone,
}: {
  reviewed: number;
  xp: number;
  streak: number;
  onDone: () => void;
}) {
  React.useEffect(() => {
    if (reduceMotion) return;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="text-2xl font-black text-brand">Hoàn thành buổi ôn!</h1>
      <div className="wl-card flex w-full justify-around p-5 font-extrabold">
        <div>
          <div className="text-2xl text-ink">{reviewed}</div>
          <div className="text-xs text-ink-muted">thẻ đã ôn</div>
        </div>
        <div>
          <div className="text-2xl text-xp">+{xp}</div>
          <div className="text-xs text-ink-muted">XP</div>
        </div>
        <div>
          <div className="text-2xl text-danger">🔥 {streak}</div>
          <div className="text-xs text-ink-muted">ngày streak</div>
        </div>
      </div>
      <Button3D variant="primary" className="w-full" onClick={onDone}>
        Về trang chủ
      </Button3D>
    </div>
  );
}

export default Celebration;
