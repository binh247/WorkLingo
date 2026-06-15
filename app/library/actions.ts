"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { deleteSource } from "@/lib/repositories/sources";

/** Xóa CỨNG cả bộ tài liệu (cascade xóa câu → note → thẻ → review). */
export async function deleteSourceAction(sourceId: string): Promise<void> {
  const user = await requireUser();
  const ok = await deleteSource(sourceId, user.id);
  if (!ok) throw new Error("Không có quyền xóa tài liệu này");
  revalidatePath("/library");
  revalidatePath("/dashboard");
}
