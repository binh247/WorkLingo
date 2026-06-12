/**
 * Cài đặt AIProvider bằng OpenAI (gpt-4o).
 * Model + API key + base URL đều đọc từ app_settings qua lib/config.
 */
import { getConfig } from "@/lib/config";
import { getOpenAIClient } from "./client";
import type { AIProvider, CompleteOptions } from "./index";

/** Một số endpoint OpenAI-compatible bọc JSON trong ```json ... ``` — gỡ ra. */
function stripFences(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return t;
}

export class OpenAIProvider implements AIProvider {
  async complete<T = unknown>(opts: CompleteOptions): Promise<T> {
    const model = await getConfig<string>("openai_model");
    const client = await getOpenAIClient();
    const res = await client.chat.completions.create({
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
    return JSON.parse(stripFences(content)) as T;
  }
}
