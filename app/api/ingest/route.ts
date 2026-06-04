/**
 * POST /api/ingest — chạy AI Ingest server-side (giấu API key) rồi lưu DB.
 * Body: { type, title, rawContent } → { sourceId, sentenceCount }.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { ingest } from "@/lib/ai/ingest";
import { createSourceWithSentences } from "@/lib/repositories/sources";

export const runtime = "nodejs";

const VALID_TYPES = ["chat", "meeting", "youtube", "text"] as const;
type SourceType = (typeof VALID_TYPES)[number];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  let body: { type?: string; title?: string; rawContent?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const { type, title, rawContent } = body;
  if (!type || !VALID_TYPES.includes(type as SourceType)) {
    return NextResponse.json(
      { error: "Loại nguồn không hợp lệ" },
      { status: 400 },
    );
  }
  if (!rawContent || !rawContent.trim()) {
    return NextResponse.json({ error: "Nội dung trống" }, { status: 400 });
  }

  const maxChars = await getConfig<number>("max_import_chars");
  if (rawContent.length > maxChars) {
    return NextResponse.json(
      { error: `Nội dung vượt giới hạn ${maxChars} ký tự` },
      { status: 400 },
    );
  }

  let sentences;
  try {
    sentences = await ingest(rawContent);
  } catch (err) {
    console.error("[ingest] lỗi:", err);
    return NextResponse.json(
      { error: "Phân tích AI thất bại, vui lòng thử lại." },
      { status: 502 },
    );
  }

  const { sourceId, sentenceCount } = await createSourceWithSentences({
    userId: user.id,
    type: type as SourceType,
    title: title?.trim() || "Tài liệu không tên",
    rawContent,
    sentences,
  });

  return NextResponse.json({ sourceId, sentenceCount }, { status: 200 });
}
