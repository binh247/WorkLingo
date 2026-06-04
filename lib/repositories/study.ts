/**
 * Repository: nạp dữ liệu cho trang /study. Lọc theo user_id (docs/02 §6).
 */
import { getSourceWithSentences } from "./sources";
import type { Sentence } from "@/lib/db/schema";

export type StudyData = {
  source: { id: string; title: string; type: string };
  sentences: Sentence[];
};

/** Source + sentences (chưa skip) của ĐÚNG user; null nếu không thuộc user. */
export async function getSourceForStudy(
  userId: string,
  sourceId: string,
): Promise<StudyData | null> {
  const data = await getSourceWithSentences(sourceId, userId);
  if (!data) return null;
  return {
    source: {
      id: data.source.id,
      title: data.source.title,
      type: data.source.type,
    },
    sentences: data.sentences.filter((s) => !s.skipped),
  };
}
