/**
 * POST /api/transcribe (GĐ2, F6) — upload audio/video → Whisper → Ingest → lưu source.
 * multipart/form-data: file, title. Trả { sourceId, sentenceCount }.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { saveUpload } from "@/lib/storage";
import { transcribeFile } from "@/lib/ai/whisper";
import { ingest } from "@/lib/ai/ingest";
import { db } from "@/lib/db";
import { sources, sentences } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "Audio/Video");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }

  let text: string;
  let audioUrl: string;
  try {
    const saved = await saveUpload(file);
    audioUrl = saved.url;
    text = await transcribeFile(file);
  } catch (err) {
    console.error("[transcribe] lỗi:", err);
    return NextResponse.json(
      { error: "Transcribe thất bại (cần endpoint hỗ trợ Whisper)." },
      { status: 502 },
    );
  }

  let parsed;
  try {
    parsed = await ingest(text);
  } catch {
    return NextResponse.json({ error: "Phân tích AI thất bại" }, { status: 502 });
  }

  const result = await db.transaction(async (tx) => {
    const [src] = await tx
      .insert(sources)
      .values({
        userId: user.id,
        type: "youtube",
        title,
        rawContent: text,
        audioUrl,
      })
      .returning({ id: sources.id });
    if (parsed.length > 0) {
      await tx.insert(sentences).values(
        parsed.map((s) => ({
          sourceId: src.id,
          original: s.original,
          text: s.text,
          corrected: s.corrected,
          note: s.note || null,
          confidence: s.confidence,
          tokens: s.tokens,
          skipped: false,
        })),
      );
    }
    return { sourceId: src.id, sentenceCount: parsed.length };
  });

  return NextResponse.json(result, { status: 200 });
}
