"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** Giá trị 0–100 */
  value: number;
  className?: string;
  /** Màu thanh chạy (mặc định brand) */
  barClassName?: string;
}

/**
 * Thanh tiến độ kiểu Duolingo — animate width mượt (<300ms).
 * Tôn trọng prefers-reduced-motion.
 */
export function ProgressBar({ value, className, barClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-4 w-full overflow-hidden rounded-full bg-[#E5E5E5]",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full bg-brand", barClassName)}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      />
    </div>
  );
}

export default ProgressBar;
