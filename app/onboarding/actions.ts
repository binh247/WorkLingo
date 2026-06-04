"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { setJlptLevel } from "@/lib/repositories/settings";
import { upsertStatus } from "@/lib/repositories/userWords";
import {
  getKnownLemmasForLevel,
  isJlptLevel,
} from "@/lib/study/jlpt-seed";

/** Ghi jlpt_level + seed user_words=known theo level (nhánh A). null = bỏ qua (nhánh B). */
export async function setJlptLevelAction(level: string | null): Promise<void> {
  const user = await requireUser();
  if (level === null) return; // Bỏ qua: không seed, dùng nhánh B (học dần)
  if (!isJlptLevel(level)) return;

  await setJlptLevel(user.id, level);
  const lemmas = getKnownLemmasForLevel(level);
  for (const lemma of lemmas) {
    await upsertStatus(user.id, lemma, "known");
  }
  revalidatePath("/study");
}
