export interface SearchProviderResult {
  title: string;
  url: string;
  content?: string;
}

interface SearchProvider {
  id: string;
  apiKey: () => string | undefined;
  search: (
    query: string,
    includeDomains: string[],
    maxResults: number,
  ) => Promise<SearchProviderResult[] | null>;
}

const SEARCH_TIMEOUT_MS = 8_000;
const RATE_LIMIT_COOLDOWN_MS = 10 * 60_000;
const unavailableUntil = new Map<string, number>();

export async function searchConfiguredProviders(
  query: string,
  includeDomains: string[],
  maxResults: number,
): Promise<SearchProviderResult[] | null> {
  for (const provider of SEARCH_PROVIDERS) {
    if (!provider.apiKey() || isUnavailable(provider.id)) continue;

    try {
      const results = await provider.search(query, includeDomains, maxResults);
      const trustedResults = filterToWhitelist(results, includeDomains);
      if (trustedResults.length > 0) return trustedResults;
    } catch (error) {
      if (error instanceof SearchProviderError && error.status === 429) {
        unavailableUntil.set(provider.id, Date.now() + RATE_LIMIT_COOLDOWN_MS);
      }
      console.warn(`[search:${provider.id}] unavailable; trying next provider`, error);
    }
  }

  return null;
}

function isUnavailable(providerId: string): boolean {
  const until = unavailableUntil.get(providerId);
  if (!until) return false;
  if (until > Date.now()) return true;
  unavailableUntil.delete(providerId);
  return false;
}

function filterToWhitelist(
  results: SearchProviderResult[] | null,
  includeDomains: string[],
): SearchProviderResult[] {
  if (!results) return [];
  return results.filter((result) => {
    try {
      const hostname = new URL(result.url).hostname.replace(/^www\./, "");
      return includeDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  });
}

class SearchProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
  ) {
    super(`${provider} returned HTTP ${status}`);
  }
}

async function requestJson(
  provider: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(input, {
    ...init,
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new SearchProviderError(provider, response.status);
  return response.json();
}

const SEARCH_PROVIDERS: readonly SearchProvider[] = [
  {
    id: "tavily",
    apiKey: () => process.env.TAVILY_API_KEY,
    async search(query, includeDomains, maxResults) {
      const body = (await requestJson("tavily", "https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TAVILY_API_KEY!}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          include_domains: includeDomains,
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
        }),
      })) as { results?: Array<{ title?: string; url?: string; content?: string }> };
      return toResults(body.results);
    },
  },
  {
    id: "serpapi",
    apiKey: () => process.env.SERPAPI_API_KEY,
    async search(query, _includeDomains, maxResults) {
      const params = new URLSearchParams({
        engine: "google",
        q: query,
        api_key: process.env.SERPAPI_API_KEY!,
        num: String(maxResults),
      });
      const body = (await requestJson(
        "serpapi",
        `https://serpapi.com/search?${params}`,
      )) as {
        organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
      };
      return toResults(
        body.organic_results?.map((result) => ({
          title: result.title,
          url: result.link,
          content: result.snippet,
        })),
      );
    },
  },
  {
    id: "brave",
    apiKey: () => process.env.BRAVE_SEARCH_API_KEY,
    async search(query, _includeDomains, maxResults) {
      const params = new URLSearchParams({ q: query, count: String(maxResults) });
      const body = (await requestJson(
        "brave",
        `https://api.search.brave.com/res/v1/web/search?${params}`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
          },
        },
      )) as {
        web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
      };
      return toResults(body.web?.results);
    },
  },
  {
    id: "doubao",
    apiKey: () => process.env.DOUBAO_API_KEY,
    async search(query, includeDomains, maxResults) {
      const body = (await requestJson(
        "doubao",
        "https://open.feedcoopapi.com/search_api/web_search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DOUBAO_API_KEY!}`,
          },
          body: JSON.stringify({
            Query: query,
            SearchType: "web",
            Count: maxResults,
            Filter: {
              NeedContent: false,
              NeedUrl: true,
              Sites: includeDomains.join(","),
              BlockHosts: "",
              AuthInfoLevel: 0,
            },
            NeedSummary: true,
            TimeRange: "",
            QueryControl: { QueryRewrite: false },
          }),
        },
      )) as {
        Result?: { WebResults?: Array<{ Title?: string; Url?: string; Summary?: string }> };
      };
      return toResults(
        body.Result?.WebResults?.map((result) => ({
          title: result.Title,
          url: result.Url,
          content: result.Summary,
        })),
      );
    },
  },
];

function toResults(
  items:
    | Array<{ title?: string; url?: string; content?: string; description?: string }>
    | undefined,
): SearchProviderResult[] {
  return (items ?? []).flatMap((item) =>
    item.title && item.url
      ? [{ title: item.title, url: item.url, content: item.content ?? item.description }]
      : [],
  );
}
