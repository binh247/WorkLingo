/**
 * Client OpenAI dùng chung cho AI Ingest. Chỉ file này new OpenAI().
 * API key + base URL đọc từ app_settings (openai_api_key, openai_base_url)
 * qua lib/config; client tự tạo lại khi admin đổi giá trị.
 */
import OpenAI from "openai";
import { getConfig } from "@/lib/config";

let _client: OpenAI | null = null;
let _sig = "";

export async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await getConfig<string>("openai_api_key");
  const baseURL = await getConfig<string>("openai_base_url");
  if (!apiKey) {
    throw new Error(
      "Chưa cấu hình openai_api_key trong app_settings (trang Quản trị).",
    );
  }
  const sig = `${apiKey}|${baseURL}`;
  if (!_client || sig !== _sig) {
    _client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
    _sig = sig;
  }
  return _client;
}
