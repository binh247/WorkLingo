/**
 * Prompt + JSON schema (structured output) + Zod validator cho AI Ingest.
 * Bám docs/11-ai-ingest.md §3-4. gpt-4o trả JSON đúng schema này.
 */
import { z } from "zod";

export const INGEST_SYSTEM_PROMPT = `Bạn là chuyên gia tiếng Nhật và biên tập viên. Đầu vào là transcript/đoạn chat tiếng Nhật (có thể có lỗi nhận dạng giọng nói). Hãy xử lý và TRẢ VỀ ĐÚNG JSON theo schema được cung cấp.

QUY TẮC:
1. DỌN LỖI DÈ DẶT: chỉ sửa lỗi nhận dạng rõ ràng. Giữ nguyên câu gốc ở "original", đặt câu đã sửa ở "text", ghi lý do ngắn ở "note" (vd "格認 → 確認"). Nếu KHÔNG sửa gì: text = original, corrected = false, note = "". KHÔNG CHẮC thì GIỮ NGUYÊN và đặt confidence = "low" — tuyệt đối không đoán bừa hay bịa nội dung.
2. TÁCH CÂU tự nhiên theo từng câu hoàn chỉnh; BỎ nhãn người nói (vd "田中：", "鈴木:") khỏi "text" và "original".
3. LOẠI BỎ RÁC: TUYỆT ĐỐI KHÔNG đưa vào "sentences" những đoạn KHÔNG có giá trị học, gồm: đoạn CHỈ gồm số / mã định danh / ID / timestamp / mốc giờ (vd "8626", "No.5", "12:30", "2024/05/30"); đoạn CHỈ gồm dấu câu, ký hiệu, emoji hoặc khoảng trắng; mảnh vụn KHÔNG chứa BẤT KỲ từ nội dung tiếng Nhật có nghĩa nào (không có danh/động/tính từ, không tạo thành cụm có chủ ngữ hay vị ngữ). CHỈ giữ lại câu có ít nhất MỘT từ nội dung thực sự để học. Bỏ hẳn các đoạn rác này, KHÔNG cố biến chúng thành câu.
4. TÁCH TỪ: mỗi token gồm surface (dạng trong câu), reading (CÁCH ĐỌC bằng hiragana — với từ thuần kana hoặc dấu câu thì reading = surface), lemma (dạng từ điển; nếu trùng surface thì lặp lại), pos (loại từ bằng TIẾNG VIỆT: danh từ / động từ / tính từ / trợ từ / phó từ / liên từ / số / dấu câu...), meaning_vi (nghĩa tiếng Việt THEO NGỮ CẢNH câu).
5. worthLearning = true cho từ nội dung đáng học (danh/động/tính từ...); = false cho trợ từ, số, dấu câu, tên riêng, từ chức năng.
6. confidence: "high" nếu câu rõ ràng; "medium" nếu hơi mơ hồ; "low" nếu nghi ngờ lỗi nhận dạng còn sót.

Chỉ trả JSON, không giải thích thêm.`;

/**
 * JSON Schema cho OpenAI response_format (strict): mọi field required +
 * additionalProperties:false. Model luôn xuất đủ field (note="" khi không sửa).
 */
export const INGEST_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sentences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string" },
          text: { type: "string" },
          corrected: { type: "boolean" },
          note: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          tokens: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                surface: { type: "string" },
                reading: { type: "string" },
                lemma: { type: "string" },
                pos: { type: "string" },
                meaning_vi: { type: "string" },
                worthLearning: { type: "boolean" },
              },
              required: [
                "surface",
                "reading",
                "lemma",
                "pos",
                "meaning_vi",
                "worthLearning",
              ],
            },
          },
        },
        required: ["original", "text", "corrected", "note", "confidence", "tokens"],
      },
    },
  },
  required: ["sentences"],
} as const;

/** Zod validator (lenient: lemma/note có default để chịu lỗi nhẹ). */
export const tokenSchema = z.object({
  surface: z.string(),
  reading: z.string(),
  lemma: z.string().optional().default(""),
  pos: z.string(),
  meaning_vi: z.string(),
  worthLearning: z.boolean(),
});

export const ingestSentenceSchema = z.object({
  original: z.string(),
  text: z.string(),
  corrected: z.boolean(),
  note: z.string().optional().default(""),
  confidence: z.enum(["high", "medium", "low"]),
  tokens: z.array(tokenSchema),
});

export const ingestResultSchema = z.object({
  sentences: z.array(ingestSentenceSchema),
});

export type IngestResultParsed = z.infer<typeof ingestResultSchema>;
