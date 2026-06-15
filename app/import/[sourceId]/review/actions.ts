"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  deleteSentence,
  setSentenceSkipped,
  updateSentenceText,
} from "@/lib/repositories/sources";

export async function updateSentenceTextAction(
  sourceId: string,
  sentenceId: string,
  text: string,
): Promise<void> {
  const user = await requireUser();
  const ok = await updateSentenceText(sentenceId, user.id, text);
  if (!ok) throw new Error("Không có quyền sửa câu này");
  revalidatePath(`/import/${sourceId}/review`);
}

export async function toggleSkipAction(
  sourceId: string,
  sentenceId: string,
  skipped: boolean,
): Promise<void> {
  const user = await requireUser();
  const ok = await setSentenceSkipped(sentenceId, user.id, skipped);
  if (!ok) throw new Error("Không có quyền sửa câu này");
  revalidatePath(`/import/${sourceId}/review`);
}

export async function deleteSentenceAction(
  sourceId: string,
  sentenceId: string,
): Promise<void> {
  const user = await requireUser();
  const ok = await deleteSentence(sentenceId, user.id);
  if (!ok) throw new Error("Không có quyền xóa câu này");
  revalidatePath(`/import/${sourceId}/review`);
  revalidatePath("/study");
}
