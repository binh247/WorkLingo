/**
 * GET /api/export/anki (GĐ3) — xuất note của user thành TSV nhập được vào Anki.
 * Cột: Front (từ) \t Back (cách đọc + nghĩa + câu ngữ cảnh). docs/04 Export Anki.
 */
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { notes, sentences } from "@/lib/db/schema";

export const runtime = "nodejs";

function esc(s: string): string {
  return s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Chưa đăng nhập", { status: 401 });

  const rows = await db
    .select({
      targetWord: notes.targetWord,
      reading: notes.reading,
      meaning: notes.meaning,
      sentence: sentences.text,
    })
    .from(notes)
    .innerJoin(sentences, eq(notes.sentenceId, sentences.id))
    .where(eq(notes.userId, user.id));

  const lines = rows.map(
    (r) =>
      `${esc(r.targetWord)}\t${esc(r.reading)}｜${esc(r.meaning)}｜${esc(r.sentence)}`,
  );
  const body = lines.join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bloom-anki.tsv"',
    },
  });
}
