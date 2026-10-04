import { expect, test } from "bun:test";
import { createSafeFetch } from "./safe-fetch";
import { requestPublicUrl } from "./public-request";
import { fetchPdf } from "./fetchers/pdf";
import { fetchArticle } from "./fetchers/article";
import { fetchCourse } from "./fetchers/course";
import { fetchBilibili } from "./fetchers/bilibili";
import { fetchWorkspaceDoc } from "./fetchers/workspace";
import { fetchWithFallback } from "./fetchers/fallback";

test("public redirects to private destinations are blocked for GET and HEAD", async () => {
  for (const method of ["GET", "HEAD"]) {
    for (const target of ["http://127.0.0.1/", "http://[fe90::1]/", "http://localhost./", "http://2130706433/"]) {
      const calls: string[] = [];
      const guarded = createSafeFetch(async url => {
        calls.push(url);
        return new Response(null, { status: 302, headers: { location: target } });
      });
      await expect(guarded("https://public.example/resource.pdf", { method })).rejects.toThrow("SSRF blocked");
      expect(calls).toHaveLength(1);
    }
  }
});
test("public relative redirect retains headers, final body and resolved URL", async () => {
  const calls: string[] = [];
  const guarded = createSafeFetch(async (url, init) => {
    calls.push(url);
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("range")).toBe("bytes=0-100");
    const response = calls.length === 1 ? new Response(null, { status: 307, headers: { location: "/final" } })
      : new Response("public text");
    Object.defineProperty(response, "url", { value: url });
    return response;
  });
  const response = await guarded("https://public.example/start", { method: "GET", headers: { range: "bytes=0-100" } });
  expect(response.url).toBe("https://public.example/final");
  expect(await response.text()).toBe("public text");
});
test("cross-origin redirect strips both standard and provider credentials", async () => {
  let calls = 0;
  const guarded = createSafeFetch(async (_url, init) => {
    if (++calls === 1) return new Response(null, { status: 302, headers: { location: "https://other.example/" } });
    const headers = new Headers(init.headers);
    for (const name of ["authorization", "cookie", "x-auth-token", "host"]) expect(headers.has(name)).toBe(false);
    expect(headers.get("user-agent")).toBe("Gradus");
    return new Response("ok");
  });
  await guarded("https://public.example/", { headers: { authorization: "secret", cookie: "secret", "x-auth-token": "secret", host: "override", "user-agent": "Gradus" } });
});
test("manual redirect remains a single HEAD response, loops remain bounded", async () => {
  let calls = 0;
  const guarded = createSafeFetch(async () => { calls++; return new Response(null, { status: 302, headers: { location: "/loop" } }); });
  expect((await guarded("https://public.example/", { method: "HEAD", redirect: "manual" })).status).toBe(302);
  expect(calls).toBe(1);
  await expect(guarded("https://public.example/", {}, 1)).rejects.toThrow("too many redirects");
});
test("all specialized direct imports reject a private starting destination", async () => {
  const url = "http://127.0.0.1/resource.pdf";
  await expect(requestPublicUrl(url, {})).rejects.toThrow("SSRF blocked");
  expect(await fetchPdf(url)).toBeNull();
  expect(await fetchArticle(url, "zhihu")).toBeNull();
  expect(await fetchCourse(url, "coursera")).toBeNull();
  expect(await fetchBilibili("http://127.0.0.1/?b23.tv")).toBeNull();
  // Workspace/fallback preserve their friendly unavailable-content behavior.
  expect((await fetchWorkspaceDoc(url, "yuque"))?.urlType).toBe("yuque");
  expect((await fetchWithFallback(url, "article")).summary).toContain("复制页面");
});
test("HEAD metadata for large PDFs remains usable while declared GET payload limits remain enforced", async () => {
  const guarded = createSafeFetch(async () => new Response(null, { headers: { "content-length": "9999999" } }));
  expect((await guarded("https://public.example/paper.pdf", { method: "HEAD" })).status).toBe(200);
  await expect(guarded("https://public.example/page")).rejects.toThrow("maximum allowed size");
});
test("native transport preserves timeout classification", async () => {
  const controller = new AbortController();
  const reason = new DOMException("Resource timeout", "TimeoutError");
  controller.abort(reason);
  try {
    await requestPublicUrl("https://public.example/", { signal: controller.signal });
    throw new Error("expected timeout rejection");
  } catch (error) {
    expect(error).toBe(reason);
  }
});
