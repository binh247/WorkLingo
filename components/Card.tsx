import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Bỏ padding mặc định nếu cần tự kiểm soát */
  noPadding?: boolean;
}

/**
 * Khối/thẻ nội dung chuẩn WorkLingo (.wl-card): nền trắng, viền 2px, bo 1.5rem.
 */
export function Card({ className, noPadding, ...props }: CardProps) {
  return (
    <div
      className={cn("wl-card", !noPadding && "p-5", className)}
      {...props}
    />
  );
}

export default Card;
