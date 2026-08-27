import { getDb } from "./db";
import type { ApiConfig } from "@/types";

export async function getApiConfig(): Promise<ApiConfig | null> {
  const db = await getDb();
  const rows = await db.select<ApiConfig[]>("SELECT * FROM api_config WHERE id = 1");
  return rows[0] ?? null;
}

export async function saveApiConfig(cfg: {
  base_url: string;
  api_key: string;
  model: string;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO api_config (id, base_url, api_key, model, updated_at)
     VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       base_url = excluded.base_url,
       api_key = excluded.api_key,
       model = excluded.model,
       updated_at = CURRENT_TIMESTAMP`,
    [cfg.base_url, cfg.api_key, cfg.model]
  );
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Generic OpenAI-compatible chat client.
 * Works with OpenAI, Anthropic-via-proxy, DeepSeek, OpenRouter, vLLM, etc.
 */
export async function chat(opts: ChatOptions): Promise<string> {
  const cfg = await getApiConfig();
  if (!cfg || !cfg.api_key || !cfg.base_url || !cfg.model) {
    throw new Error(
      "API 未配置。请先在 设置 页填写 base_url / api_key / model。"
    );
  }

  const url = `${cfg.base_url.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.api_key}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("API 返回内容为空");
  return content;
}
