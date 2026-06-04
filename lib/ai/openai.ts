/**
 * Cài đặt AIProvider bằng OpenAI (gpt-4o). Chỉ file này import SDK openai.
 * Model đọc từ app_settings (key openai_model) qua lib/config; key từ env.
 */
import OpenAI from "openai";
import { getConfig } from "@/lib/config";
import type { AIProvider, CompleteOptions } from "./index";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Cho phép trỏ tới endpoint OpenAI-compatible (tự host / proxy).
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}

export class OpenAIProvider implements AIProvider {
  async complete<T = unknown>(opts: CompleteOptions): Promise<T> {
    const model = await getConfig<string>("openai_model");
    const res = await client().chat.completions.create({
      model,
      temperature: opts.temperature ?? 0.2,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: opts.schemaName ?? "result",
          strict: true,
          schema: opts.jsonSchema,
        },
      },
    });
    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI trả nội dung rỗng.");
    return JSON.parse(content) as T;
  }
}
