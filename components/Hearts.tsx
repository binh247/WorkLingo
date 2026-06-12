"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Thanh trái tim kiểu Duolingo — 5 ô tim SVG.
 *  - Tim đầy: đỏ + glow nhẹ; còn ≤2 tim thì đập cảnh báo.
 *  - Mất 1 tim: tim ngoài cùng phồng lên rồi VỠ TAN kèm mảnh bắn ra,
 *    cả cụm rung 1 nhịp, để lại tim rỗng (xám).
 * Không chặn chơi khi hết tim — chỉ là động lực + hiệu ứng.
 */
const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

// Hướng bắn của các mảnh vỡ (toả đều quanh tim).
const SHARDS: { x: string; y: string }[] = [
  { x: "-15px", y: "-13px" },
  { x: "15px", y: "-13px" },
  { x: "-17px", y: "7px" },
  { x: "17px", y: "7px" },
  { x: "0px", y: "-19px" },
  { x: "0px", y: "15px" },
];

function Heart({
  filled,
  breaking,
  low,
}: {
  filled: boolean;
  breaking: boolean;
  low: boolean;
}) {
  return (
    <span className="relative inline-grid h-6 w-6 place-items-center sm:h-7 sm:w-7">
      {/* Nền: tim rỗng (xám) */}
      <svg viewBox="0 0 24 24" className="absolute h-full w-full" aria-hidden>
        <path d={HEART_PATH} fill="#E5E5E5" />
      </svg>

      {/* Tim đầy (đỏ) */}
      {filled && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={cn("heart-alive absolute h-full w-full", low && "heart-low")}
        >
          <path d={HEART_PATH} fill="#FF4B4B" />
        </svg>
      )}

      {/* Hiệu ứng vỡ khi vừa mất tim này */}
      {breaking && (
        <>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="heart-break absolute h-full w-full"
          >
            <path d={HEART_PATH} fill="#FF4B4B" />
          </svg>
          {SHARDS.map((s, i) => (
            <span
              key={i}
              className="heart-shard"
              style={{ "--sx": s.x, "--sy": s.y } as React.CSSProperties}
            />
          ))}
        </>
      )}
    </span>
  );
}

export function Hearts({ count, max = 5 }: { count: number; max?: number }) {
  const prev = React.useRef(count);
  const [breaking, setBreaking] = React.useState<number | null>(null);
  const [shaking, setShaking] = React.useState(false);

  // useLayoutEffect: gắn overlay vỡ TRƯỚC khi trình duyệt vẽ frame mới —
  // dùng useEffect sẽ lộ 1 frame tim xám trước khi animation vỡ bắt đầu.
  React.useLayoutEffect(() => {
    const prevCount = prev.current;
    prev.current = count;
    if (count < prevCount) {
      // Tim vừa mất nằm ở chỉ số `count` (0-based): trước có 0..prevCount-1 đầy.
      setBreaking(count);
      setShaking(true);
      const t1 = setTimeout(() => setBreaking(null), 620);
      const t2 = setTimeout(() => setShaking(false), 420);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [count]);

  const low = count > 0 && count <= 2;

  return (
    <div
      className={cn("flex shrink-0 items-center gap-0.5", shaking && "hearts-shake")}
      role="status"
    >
      {/* Live region chỉ đọc khi TEXT đổi (đổi aria-label không được đọc) */}
      <span className="sr-only">{`Còn ${count} trên ${max} tim`}</span>
      {Array.from({ length: max }).map((_, i) => (
        <Heart
          key={i}
          filled={i < count}
          breaking={breaking === i}
          low={low && i < count}
        />
      ))}
    </div>
  );
}

export default Hearts;
