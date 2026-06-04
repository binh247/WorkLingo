/**
 * Lưu file (audio/video) trên filesystem tự host (chống lock-in cloud storage).
 * Thư mục: STORAGE_DIR (mặc định ./storage/uploads). GĐ sau có thể đổi sang S3.
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const STORAGE_DIR = process.env.STORAGE_DIR || join(process.cwd(), "storage", "uploads");

export async function saveUpload(
  file: File,
): Promise<{ path: string; url: string }> {
  await mkdir(STORAGE_DIR, { recursive: true });
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const name = `${randomUUID()}.${ext}`;
  const path = join(STORAGE_DIR, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path, buf);
  // url nội bộ (phục vụ qua route riêng nếu cần) — lưu vào sources.audio_url.
  return { path, url: `/storage/uploads/${name}` };
}
