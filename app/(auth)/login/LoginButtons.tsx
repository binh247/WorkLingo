"use client";

import { signIn } from "next-auth/react";
import { Button3D } from "@/components/Button3D";

export function LoginButtons() {
  return (
    <Button3D
      variant="primary"
      className="w-full"
      onClick={() => signIn("credentials", { callbackUrl: "/import" })}
    >
      Đăng nhập (dev)
    </Button3D>
  );
}
