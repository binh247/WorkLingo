/**
 * Transcribe audio/video → text (Whisper). GĐ2. Model đọc từ app_settings.whisper_model.
 * Yêu cầu endpoint OpenAI-compatible hỗ trợ audio.transcriptions.
 */
import OpenAI from "openai";
import { getConfig } from "@/lib/config";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}

export async function transcribeFile(file: File): Promise<string> {
  const model = await getConfig<string>("whisper_model");
  const res = await client().audio.transcriptions.create({
    file,
    model,
    language: "ja",
  });
  return res.text;
}
