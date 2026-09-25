import { GoogleGenAI } from "@google/genai";

/**
 * AI 客户端。两条可用路径：
 *
 *   - `gemini`：设了 `GEMINI_API_KEY`（或 `AI_PROVIDER_API_KEY`）即走 Google GenAI，
 *     默认模型 `gemini-2.5-flash`。
 *   - `byok`：`AI_PROVIDER_BASE_URL` + `AI_PROVIDER_API_KEY`，OpenAI 兼容的
 *     `/chat/completions`，模型取 `AI_PROVIDER_MODEL`。
 *
 * 用 `AI_PROVIDER_MODE=gemini|byok` 可显式指定；缺省按上面顺序自动挑第一条可用的。
 * 两条都没配好时抛出带可读文案的 Error，由调用方展示给用户。
 */

type ChatMessage = {
  role: string;
  content: unknown;
  [key: string]: unknown;
};

type ChatParams = {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  response_format?: { type?: string };
  [key: string]: unknown;
};

type StreamingChatParams = ChatParams & {
  stream: true;
};

type ChatCompletionLike = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ChatDeltaChunk = {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

type StreamErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

const PROVIDER_NOT_CONFIGURED_MESSAGE =
  "AI 服务尚未配置：请设置 GEMINI_API_KEY，或设置 AI_PROVIDER_BASE_URL 与 AI_PROVIDER_API_KEY。";

let geminiClient: GoogleGenAI | null = null;

function geminiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_API_KEY || "";
}

function byokConfigured(): boolean {
  return Boolean(
    process.env.AI_PROVIDER_BASE_URL && process.env.AI_PROVIDER_API_KEY,
  );
}

/** 选出实际要走的 provider；两条都不可用时抛出可读错误。 */
function resolveProvider(): "gemini" | "byok" {
  const mode = (process.env.AI_PROVIDER_MODE || "").trim().toLowerCase();
  if (mode === "gemini" || (mode !== "byok" && geminiKey())) return "gemini";
  if (byokConfigured()) return "byok";
  if (geminiKey()) return "gemini";
  throw new Error(PROVIDER_NOT_CONFIGURED_MESSAGE);
}

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: geminiKey() });
  }
  return geminiClient;
}

async function* callGeminiStream(
  params: StreamingChatParams,
): AsyncGenerator<ChatDeltaChunk> {
  const ai = getGeminiClient();
  const systemMsg = params.messages.find((m) => m.role === "system")?.content;
  const userMsgs = params.messages.filter((m) => m.role !== "system");

  const contents = userMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const modelName = process.env.AI_PROVIDER_MODEL || GEMINI_DEFAULT_MODEL;
  const responseStream = await ai.models.generateContentStream({
    model: modelName,
    contents,
    config: {
      systemInstruction: typeof systemMsg === "string" ? systemMsg : undefined,
      maxOutputTokens: typeof params.max_tokens === "number" ? params.max_tokens : 8192,
      responseMimeType: params.response_format?.type === "json_object" ? "application/json" : undefined,
    },
  });

  for await (const chunk of responseStream) {
    const text = chunk.text ?? "";
    yield {
      choices: [
        {
          delta: {
            content: text,
          },
        },
      ],
    };
  }
}

async function callGeminiNonStream(params: ChatParams): Promise<ChatCompletionLike> {
  const ai = getGeminiClient();
  const systemMsg = params.messages.find((m) => m.role === "system")?.content;
  const userMsgs = params.messages.filter((m) => m.role !== "system");

  const contents = userMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const modelName = process.env.AI_PROVIDER_MODEL || GEMINI_DEFAULT_MODEL;
  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: typeof systemMsg === "string" ? systemMsg : undefined,
      maxOutputTokens: typeof params.max_tokens === "number" ? params.max_tokens : 8192,
      responseMimeType: params.response_format?.type === "json_object" ? "application/json" : undefined,
    },
  });

  return {
    choices: [
      {
        message: {
          content: response.text ?? "",
        },
      },
    ],
  };
}

async function* streamProviderSse(
  response: Response,
): AsyncGenerator<ChatDeltaChunk> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let chunk: ChatDeltaChunk & StreamErrorBody;
      try {
        chunk = JSON.parse(data) as ChatDeltaChunk & StreamErrorBody;
      } catch {
        throw new Error("AI stream returned an invalid SSE payload");
      }
      if (chunk.error) {
        throw new Error(chunk.error.message || "AI stream failed");
      }
      yield chunk;
    }
  }
}

async function callByokProvider(
  params: StreamingChatParams,
): Promise<AsyncIterable<ChatDeltaChunk>>;
async function callByokProvider(params: ChatParams): Promise<ChatCompletionLike>;
async function callByokProvider(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  const base = (process.env.AI_PROVIDER_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_PROVIDER_MODEL || params.model;
  if (!base || !apiKey || !model) {
    throw new Error(
      "BYOK AI provider is not configured: set AI_PROVIDER_BASE_URL, AI_PROVIDER_API_KEY and AI_PROVIDER_MODEL.",
    );
  }
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...params, model }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`AI provider request failed (${res.status})`);
  }
  return params.stream === true ? streamProviderSse(res) : ((await res.json()) as ChatCompletionLike);
}

async function chat(params: StreamingChatParams): Promise<AsyncIterable<ChatDeltaChunk>>;
async function chat(params: ChatParams): Promise<ChatCompletionLike>;
async function chat(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  if (resolveProvider() === "gemini") {
    return params.stream === true
      ? callGeminiStream(params as StreamingChatParams)
      : callGeminiNonStream(params);
  }
  return params.stream === true
    ? callByokProvider(params as StreamingChatParams)
    : callByokProvider(params);
}

export function createAppAiClient() {
  return { chat };
}

export const appAi = createAppAiClient();
