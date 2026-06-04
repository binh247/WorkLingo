import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "info" | "danger" | "xp" | "neutral";
type Size = "default" | "sm";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  info: "btn-info",
  danger: "btn-danger",
  xp: "btn-xp",
  neutral: "btn-neutral",
};

export interface Button3DProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Nút chữ ký Duolingo (.btn-3d) — nhấn lún xuống nhờ viền đáy 4px.
 * Variant màu + size đồng nhất toàn app (xem app/globals.css).
 */
export function Button3D({
  variant = "primary",
  size = "default",
  className,
  ...props
}: Button3DProps) {
  return (
    <button
      className={cn(
        "btn-3d",
        variantClass[variant],
        size === "sm" && "btn-sm",
        className,
      )}
      {...props}
    />
  );
}

export default Button3D;
