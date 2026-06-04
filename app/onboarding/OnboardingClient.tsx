"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button3D } from "@/components/Button3D";
import { Card } from "@/components/Card";
import { setJlptLevelAction } from "./actions";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export function OnboardingClient() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function choose(level: string | null) {
    startTransition(async () => {
      await setJlptLevelAction(level);
      router.push("/import");
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-2">
        {LEVELS.map((l) => (
          <Button3D
            key={l}
            variant="info"
            disabled={pending}
            onClick={() => choose(l)}
          >
            {l}
          </Button3D>
        ))}
      </div>
      <Button3D variant="neutral" disabled={pending} onClick={() => choose(null)}>
        Bỏ qua / Tôi không chắc
      </Button3D>
    </Card>
  );
}
