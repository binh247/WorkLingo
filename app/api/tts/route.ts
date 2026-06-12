/**
 * GET /api/tts?q=<text>&lang=ja — phát âm miễn phí qua Google Translate TTS.
 *
 * Vì sao cần route này: endpoint translate_tts chặn CORS → trình duyệt không gọi
 * trực tiếp được; server proxy hộ rồi trả MP3. Có cache file theo hash(text+lang)
 * để không gọi lại Google cho cùng một từ/câu.
 *
 * Lưu ý: translate_tts là API KHÔNG chính thức (giới hạn ~200 ký tự/lần, có thể
 * đổi/khoá theo IP). Client tự fallback về Web Speech nếu route lỗi.
 */
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const CACHE_DIR =
  process.env.TTS_CACHE_DIR || join(process.cwd(), "storage", "tts");
const MAX_CHUNK = 180; // translate_tts giới hạn ~200 ký tự/lần
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Cắt text thành các đoạn ≤ MAX_CHUNK, ưu tiên ngắt ở dấu câu/khoảng trắng. */
function splitChunks(text: string): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK) {
    const slice = rest.slice(0, MAX_CHUNK);
    const brk = Math.max(
      slice.lastIndexOf("。"),
      slice.lastIndexOf("、"),
      slice.lastIndexOf("！"),
      slice.lastIndexOf("？"),
      slice.lastIndexOf("\n"),
      slice.lastIndexOf(" "),
    );
    const cut = brk > 0 ? brk + 1 : MAX_CHUNK;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) out.push(rest);
  return out;
}

async function fetchGoogleTts(text: string, lang: string): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const chunk of splitChunks(text)) {
    const url =
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob` +
      `&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://translate.google.com/" },
    });
    if (!res.ok) throw new Error(`google tts ${res.status}`);
    parts.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const lang = (searchParams.get("lang") ?? "ja").slice(0, 5);
  if (!q) return NextResponse.json({ error: "Thiếu q" }, { status: 400 });
  if (q.length > 1000) {
    return NextResponse.json({ error: "Quá dài" }, { status: 400 });
  }

  const key = createHash("sha1").update(`${lang}|${q}`).digest("hex");
  const file = join(CACHE_DIR, `${key}.mp3`);

  let audio: Buffer;
  try {
    if (existsSync(file)) {
      audio = await readFile(file);
    } else {
      audio = await fetchGoogleTts(q, lang);
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(file, audio);
    }
  } catch (err) {
    console.error("[tts] lỗi:", err);
    return NextResponse.json(
      { error: "TTS thất bại (client sẽ fallback Web Speech)" },
      { status: 502 },
    );
  }

  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(audio.length),
    },
  });
}
