import { GoogleGenAI } from "@google/genai";

type ChatMessage = {
  role: string;
  content: unknown;
  [key: string]: unknown;
};

type ChatParams = {
  model?: string;
  model_key?: string;
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

type ErrorBody = {
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
  detail?: {
    code?: string;
    message?: string;
  };
};

export class AppAIUnavailableError extends Error {
  code = "app_ai_unavailable";

  constructor(message = "AI 功能暂时不可用。如需继续使用，请联系该应用的创作者。") {
    super(message);
    this.name = "AppAIUnavailableError";
  }
}

const APP_AI_UNAVAILABLE_MESSAGE =
  "AI 功能暂时不可用。如需继续使用，请联系该应用的创作者。";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_API_KEY || "";
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

async function* callGeminiStream(params: StreamingChatParams): AsyncGenerator<ChatDeltaChunk> {
  const ai = getGeminiClient();
  const systemMsg = params.messages.find((m) => m.role === "system")?.content;
  const userMsgs = params.messages.filter((m) => m.role !== "system");

  const contents = userMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const modelName = process.env.AI_PROVIDER_MODEL || "gemini-2.5-flash";
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

  const modelName = process.env.AI_PROVIDER_MODEL || "gemini-2.5-flash";
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

function appAiApiBase() {
  return (
    process.env.EAZO_APP_AI_API_BASE ||
    process.env.EAZO_PLATFORM_API_BASE ||
    "https://eazo.ai/creator"
  ).replace(/\/+$/, "");
}

function providerBase() {
  return (process.env.AI_PROVIDER_BASE_URL || "").replace(/\/+$/, "");
}

function providerMode() {
  return (process.env.EAZO_AI_PROVIDER_MODE || "eazo").trim().toLowerCase();
}

function modelKey(params: ChatParams) {
  return String(params.model_key || params.model || process.env.EAZO_AI_MODEL_KEY || "deepseek.v3.1");
}

function requestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function* streamProviderSse(response: Response): AsyncGenerator<ChatDeltaChunk> {
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
      let chunk: ChatDeltaChunk & ErrorBody;
      try {
        chunk = JSON.parse(data) as ChatDeltaChunk & ErrorBody;
      } catch {
        throw new Error("AI stream returned an invalid SSE payload");
      }
      if (chunk.error) {
        if (
          chunk.error.code === "app_ai_unavailable" ||
          chunk.error.code === "credits_exhausted"
        ) {
          throw new AppAIUnavailableError(chunk.error.message);
        }
        throw new Error(chunk.error.message || "AI stream failed");
      }
      yield chunk;
    }
  }
}

async function callCreatorProxy(
  params: StreamingChatParams,
): Promise<AsyncIterable<ChatDeltaChunk>>;
async function callCreatorProxy(params: ChatParams): Promise<ChatCompletionLike>;
async function callCreatorProxy(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  const appId = process.env.EAZO_APP_ID;
  if (!appId) throw new AppAIUnavailableError();

  const { messages, ...rest } = params;
  delete rest.stream;
  delete rest.model;
  delete rest.model_key;
  const res = await fetch(`${appAiApiBase()}/api/app-ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-eazo-app-id": appId,
      ...(process.env.EAZO_PRIVATE_KEY
        ? { Authorization: `Bearer ${process.env.EAZO_PRIVATE_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      app_id: appId,
      model_key: modelKey(params),
      messages,
      request_id: requestId(),
      stream: params.stream === true,
      params: rest,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const rawBody = await res.text().catch(() => "");
    let body: ErrorBody | string = rawBody;
    try {
      body = JSON.parse(rawBody) as ErrorBody;
    } catch {
      // Keep the plain response body for diagnostics.
    }
    const code =
      typeof body === "string"
        ? ""
        : body.detail?.code || body.error?.code || body.code;
    if (code === "app_ai_unavailable" || code === "credits_exhausted" || res.status === 402) {
      throw new AppAIUnavailableError(
        typeof body === "string"
          ? undefined
          : body.detail?.message || body.error?.message || body.message,
      );
    }
    throw new Error(typeof body === "string" ? body : `App AI request failed (${res.status})`);
  }
  return params.stream
    ? streamProviderSse(res)
    : ((await res.json()) as ChatCompletionLike);
}

async function callByokProvider(
  params: StreamingChatParams,
): Promise<AsyncIterable<ChatDeltaChunk>>;
async function callByokProvider(params: ChatParams): Promise<ChatCompletionLike>;
async function callByokProvider(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  const base = providerBase();
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_PROVIDER_MODEL || params.model || params.model_key;
  if (!base || !apiKey || !model) {
    throw new Error("BYOK AI provider is not configured");
  }
  const { ...body } = params;
  delete body.model_key;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, model }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`AI provider request failed (${res.status})`);
  }
  return params.stream ? streamProviderSse(res) : ((await res.json()) as ChatCompletionLike);
}

async function chat(params: StreamingChatParams): Promise<AsyncIterable<ChatDeltaChunk>>;
async function chat(params: ChatParams): Promise<ChatCompletionLike>;
async function chat(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  if (
    process.env.GEMINI_API_KEY ||
    providerMode() === "gemini" ||
    (providerMode() === "byok" && !process.env.AI_PROVIDER_BASE_URL && process.env.GEMINI_API_KEY)
  ) {
    return params.stream === true
      ? callGeminiStream(params as StreamingChatParams)
      : callGeminiNonStream(params);
  }
  if (providerMode() === "byok") {
    return params.stream === true
      ? callByokProvider(params as StreamingChatParams)
      : callByokProvider(params);
  }
  return params.stream === true
    ? callCreatorProxy(params as StreamingChatParams)
    : callCreatorProxy(params);
}

export function createAppAiClient() {
  return {
    chat,
  };
}

export const appAi = createAppAiClient();
export { APP_AI_UNAVAILABLE_MESSAGE };

