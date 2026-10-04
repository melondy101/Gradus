import { isSafePublicUrl } from "./ssrf-guard";
import { requestPublicUrl } from "./public-request";

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export function createSafeFetch(requestHop = requestPublicUrl) {
  return async (input: string, init: RequestInit = {}, maxRedirects = 4, maxSizeBytes = 2 * 1024 * 1024): Promise<Response> => {
    let currentUrl = input;
    const headers = new Headers(init.headers);
    const signal = init.signal ?? AbortSignal.timeout(5000);
    for (let i = 0; i <= maxRedirects; i++) {
      if (!isSafePublicUrl(currentUrl)) throw new Error("SSRF blocked: unsafe URL");
      const response = await requestHop(currentUrl, { ...init, headers, signal, redirect: "manual" });
      const contentLength = response.headers.get("content-length");
      if (init.method?.toUpperCase() !== "HEAD" && contentLength && Number(contentLength) > maxSizeBytes) {
        await response.body?.cancel();
        throw new Error("Response payload exceeds maximum allowed size");
      }
      if (!REDIRECTS.has(response.status) || init.redirect === "manual") return response;
      const location = response.headers.get("location");
      if (!location) return response;
      await response.body?.cancel();
      if (init.redirect === "error") throw new Error("Resource redirect rejected");
      const next = new URL(location, currentUrl);
      if (next.origin !== new URL(currentUrl).origin) {
        // Never forward provider credentials or a caller-supplied Host to another origin.
        for (const name of [...headers.keys()]) {
          if (!["accept", "accept-language", "accept-encoding", "user-agent", "range"].includes(name)) headers.delete(name);
        }
      }
      currentUrl = next.toString();
    }
    throw new Error("SSRF blocked: too many redirects");
  };
}

export const safeFetch = createSafeFetch();
