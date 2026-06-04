/**
 * AI giải thích ngữ pháp câu (F7, GĐ2). Gọi qua lib/ai (chống lock-in).
 * Không persist (giải thích on-demand). docs/04 F7.
 */
import { getAIProvider } from "./index";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    points: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "points"],
} as const;

export type GrammarExplanation = { summary: string; points: string[] };

export async function explainGrammar(
  sentence: string,
): Promise<GrammarExplanation> {
  return getAIProvider().complete<GrammarExplanation>({
    system:
      "Bạn là giáo viên tiếng Nhật. Giải thích NGỮ PHÁP của câu tiếng Nhật bằng TIẾNG VIỆT, ngắn gọn dễ hiểu. " +
      'Trả JSON: summary (tóm tắt 1-2 câu) và points (mảng các điểm ngữ pháp/cấu trúc/trợ từ đáng chú ý, mỗi điểm 1 dòng).',
    user: sentence,
    jsonSchema: SCHEMA as unknown as Record<string, unknown>,
    schemaName: "grammar_explanation",
    temperature: 0.3,
  });
}
