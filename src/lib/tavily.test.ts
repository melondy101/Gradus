import { afterEach, describe, expect, test } from "bun:test";

import { resolveResources, type SearchIntent } from "./tavily";

const SEARCH_ENV_KEYS = [
  "TAVILY_API_KEY",
  "SERPAPI_API_KEY",
  "BRAVE_SEARCH_API_KEY",
  "DOUBAO_API_KEY",
] as const;

const originalFetch = globalThis.fetch;
const originalEnv = new Map(
  SEARCH_ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of SEARCH_ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const intent: SearchIntent = {
  query: "TypeScript narrowing guide",
  purpose: "理解 TypeScript 类型收窄",
  learning_phase: "input",
  suitable_for: "beginner",
  resource_type: "doc",
};

describe("resolveResources search-provider fallback", () => {
  test("Tavily 限额后按顺序使用 SerpAPI 的真实结果", async () => {
    process.env.TAVILY_API_KEY = "tavily-key";
    process.env.SERPAPI_API_KEY = "serpapi-key";
    const calls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = String(input);
      calls.push(url);
      if (url === "https://api.tavily.com/search") {
        return new Response("rate limited", { status: 429 });
      }
      return Response.json({
        organic_results: [
          {
            title: "Narrowing - TypeScript Handbook",
            link: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
            snippet: "TypeScript can narrow a value's type.",
          },
        ],
      });
    }) as typeof fetch;

    const resources = await resolveResources([intent], "编程");

    expect(calls).toEqual([
      "https://api.tavily.com/search",
      "https://serpapi.com/search?engine=google&q=TypeScript+narrowing+guide&api_key=serpapi-key&num=2",
    ]);
    expect(resources).toEqual([
      expect.objectContaining({
        title: "Narrowing - TypeScript Handbook",
        url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
        trust_level: "verified",
      }),
    ]);
  });

  test("SerpAPI 无结果后使用 Brave 的白名单结果", async () => {
    process.env.SERPAPI_API_KEY = "serpapi-key";
    process.env.BRAVE_SEARCH_API_KEY = "brave-key";
    const calls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith("https://serpapi.com/search?")) {
        return Response.json({ organic_results: [] });
      }
      return Response.json({
        web: {
          results: [
            {
              title: "TypeScript Handbook",
              url: "https://www.typescriptlang.org/docs/handbook/intro.html",
              description: "The official TypeScript handbook.",
            },
          ],
        },
      });
    }) as typeof fetch;

    const resources = await resolveResources([intent], "编程");

    expect(calls).toHaveLength(2);
    expect(calls[0]).toStartWith("https://serpapi.com/search?");
    expect(calls[1]).toBe(
      "https://api.search.brave.com/res/v1/web/search?q=TypeScript+narrowing+guide&count=2",
    );
    expect(resources[0]).toEqual(
      expect.objectContaining({
        title: "TypeScript Handbook",
        trust_level: "verified",
      }),
    );
  });

  test("豆包适配器传递本地示例要求的字段并解析 WebResults", async () => {
    process.env.DOUBAO_API_KEY = "doubao-key";
    let request: Request | undefined;

    globalThis.fetch = (async (input, init) => {
      request = new Request(input, init);
      return Response.json({
        Result: {
          WebResults: [
            {
              Title: "TypeScript 中文网",
              Url: "https://www.typescriptlang.org/zh/docs/",
              Summary: "TypeScript 官方中文文档。",
            },
          ],
        },
      });
    }) as typeof fetch;

    const resources = await resolveResources([intent], "编程");

    expect(request?.url).toBe("https://open.feedcoopapi.com/search_api/web_search");
    expect(request?.headers.get("Authorization")).toBe("Bearer doubao-key");
    expect(await request?.json()).toMatchObject({
      Query: intent.query,
      SearchType: "web",
      Count: 2,
      Filter: {
        NeedContent: false,
        NeedUrl: true,
        Sites: expect.stringContaining("typescriptlang.org"),
      },
      NeedSummary: true,
    });
    expect(resources[0]).toEqual(
      expect.objectContaining({
        title: "TypeScript 中文网",
        trust_level: "verified",
      }),
    );
  });
});
