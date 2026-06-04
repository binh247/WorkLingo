"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  getEnabledCardTypes,
  updateUserSettings,
} from "@/lib/repositories/settings";
import { setSuspendedByType, type CardType } from "@/lib/repositories/cards";

const ALL: CardType[] = ["recognition", "cloze", "production", "reading"];

/** Cập nhật loại thẻ + âm thanh. Loại vừa tắt → suspend card (không xóa, docs/09 §5). */
export async function updateSettingsAction(input: {
  enabledCardTypes: string[];
  soundEnabled: boolean;
}): Promise<void> {
  const user = await requireUser();
  const prev = new Set(await getEnabledCardTypes(user.id));
  const next = new Set(
    input.enabledCardTypes.filter((t) => ALL.includes(t as CardType)),
  );

  await updateUserSettings(user.id, {
    enabledCardTypes: [...next],
    soundEnabled: input.soundEnabled,
  });

  const turnedOff = ALL.filter((t) => prev.has(t) && !next.has(t));
  const turnedOn = ALL.filter((t) => !prev.has(t) && next.has(t));
  if (turnedOff.length) await setSuspendedByType(user.id, turnedOff, true);
  if (turnedOn.length) await setSuspendedByType(user.id, turnedOn, false);

  revalidatePath("/settings");
  revalidatePath("/study");
}
