"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chỉ báo COMBO kiểu Duolingo — hiện khi trả lời đúng liên tiếp (≥2).
 * Mỗi lần combo tăng, chip remount (key={combo}) để replay hiệu ứng:
 *  - tia chớp đánh xuống (.combo-bolt) + lóe sáng nền (.combo-flash)
 *  - số combo nảy (.combo-bump)
 * Càng nhiều combo càng "nóng": 🔥 → ⚡ → glow đập liên tục.
 */
function tierOf(combo: number): 0 | 1 | 2 | 3 {
  if (combo >= 8) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1;
  return 0;
}

export function ComboMeter({ combo }: { combo: number }) {
  if (combo < 2) return null;

  const tier = tierOf(combo);
  const hot = tier >= 2; // dùng tia chớp ⚡ + màu vàng
  const color = hot
    ? "text-xp"
    : tier === 1
      ? "text-orange-500"
      : "text-orange-400";
  const ring = hot
    ? "border-xp bg-xp/10"
    : "border-orange-300 bg-orange-50";

  return (
    <div
      key={combo}
      // Trang trí thuần: remount theo key làm live region đọc không ổn định,
      // và đã có dòng feedback "Combo ×N" (live region thật) trong ReviewQuiz.
      aria-hidden="true"
      className={cn(
        "combo-pop relative inline-flex items-center overflow-hidden rounded-full border-2 px-4 py-1 font-black shadow-sm",
        ring,
        tier >= 3 && "combo-hot",
      )}
    >
      {/* Lóe sáng nền (sau nội dung nhờ thứ tự DOM + nội dung relative) */}
      <span className="combo-flash pointer-events-none absolute inset-0" />
      <span className="relative inline-flex items-center gap-1.5">
        <span className={cn("combo-bolt text-xl leading-none", color)}>
          {hot ? "⚡" : "🔥"}
        </span>
        <span className={cn("text-xs uppercase tracking-wider", color)}>
          Combo
        </span>
        <span className={cn("combo-bump text-lg leading-none", color)}>
          ×{combo}
        </span>
      </span>
    </div>
  );
}

export default ComboMeter;
