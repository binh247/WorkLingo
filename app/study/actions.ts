"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { getEnabledCardTypes } from "@/lib/repositories/settings";
import { upsertNote } from "@/lib/repositories/notes";
import { createCardsForNote, type CardType } from "@/lib/repositories/cards";
import { markKnown, markLearning } from "@/lib/repositories/userWords";
import { createEmptyState } from "@/lib/srs";
import { db } from "@/lib/db";
import { sentences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALL_TYPES: CardType[] = [
  "recognition",
  "cloze",
  "production",
  "reading",
];

export type SaveWordInput = {
  sentenceId: string;
  surface: string;
  reading: string;
  lemma: string;
  meaning_vi: string;
};

/** Lưu 1 từ → 1 note + N cards theo loại đang bật + user_words=learning (QĐ-5/7). */
export async function saveWordAsCards(input: SaveWordInput): Promise<void> {
  const user = await requireUser();
  const enabled = (await getEnabledCardTypes(user.id)).filter((t) =>
    ALL_TYPES.includes(t as CardType),
  ) as CardType[];

  // cloze chỉ tạo khi surface nằm trong câu (QĐ-5).
  const [sent] = await db
    .select({ text: sentences.text })
    .from(sentences)
    .where(eq(sentences.id, input.sentenceId))
    .limit(1);
  let types = enabled;
  if (sent && !sent.text.includes(input.surface)) {
    types = types.filter((t) => t !== "cloze");
  }

  // Các thao tác đều idempotent (upsert note / chỉ tạo card loại còn thiếu).
  const note = await upsertNote(user.id, {
    sentenceId: input.sentenceId,
    targetWord: input.surface,
    reading: input.reading,
    meaning: input.meaning_vi,
  });
  const fsrsState = createEmptyState() as unknown as Record<string, unknown>;
  await createCardsForNote(user.id, note.id, types, fsrsState);
  await markLearning(user.id, input.lemma || input.surface);

  revalidatePath("/study");
}

/** "Đã biết / Bỏ qua" → user_words=known, không tạo thẻ (QĐ-6). */
export async function markWordKnown(lemma: string): Promise<void> {
  const user = await requireUser();
  await markKnown(user.id, lemma);
  revalidatePath("/study");
}

/** F7 (GĐ2): giải thích ngữ pháp câu bằng AI (on-demand, không lưu). */
export async function explainGrammarAction(
  sentenceText: string,
): Promise<{ summary: string; points: string[] }> {
  await requireUser();
  const { explainGrammar } = await import("@/lib/ai/grammar");
  return explainGrammar(sentenceText);
}
