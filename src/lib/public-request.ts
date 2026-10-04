import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { createPublicLookup } from "./public-dns";
import { isSafePublicUrl } from "./ssrf-guard";

const publicLookup = createPublicLookup();

/** A single GET/HEAD hop. DNS validation happens inside the socket lookup. */
export function requestPublicUrl(input: string, init: RequestInit): Promise<Response> {
  if (!isSafePublicUrl(input)) return Promise.reject(new Error("SSRF blocked: unsafe URL"));
  const url = new URL(input);
  const method = init.method?.toUpperCase() ?? "GET";
  if (!["GET", "HEAD"].includes(method) || init.body != null) {
    return Promise.reject(new Error("Public resource requests only support GET/HEAD"));
  }
  const headers = new Headers(init.headers);
  // Keep public imports independent of environment proxies and compressed-body defaults.
  if (!headers.has("accept-encoding")) headers.set("accept-encoding", "identity");
  const signal = init.signal ?? AbortSignal.timeout(10000);
  return new Promise((resolve, reject) => {
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = request(url, {
      method, headers: Object.fromEntries(headers), lookup: publicLookup,
      signal, agent: false,
    }, incoming => {
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) responseHeaders.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      const status = incoming.statusCode ?? 502;
      const empty = method === "HEAD" || [204, 205, 304].includes(status);
      if (empty) incoming.resume();
      let body: Readable = incoming;
      const encoding = responseHeaders.get("content-encoding");
      const decoder = encoding === "gzip" ? createGunzip() : encoding === "br"
        ? createBrotliDecompress() : encoding === "deflate" ? createInflate() : null;
      if (decoder && !empty) {
        incoming.on("error", error => decoder.destroy(error));
        body = incoming.pipe(decoder);
        decoder.on("close", () => incoming.destroy());
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");
      }
      const abort = () => body.destroy(signal.reason instanceof Error ? signal.reason : new Error("Resource request aborted"));
      signal.addEventListener("abort", abort, { once: true });
      body.once("close", () => signal.removeEventListener("abort", abort));
      const response = new Response(empty ? null : Readable.toWeb(body) as ReadableStream<Uint8Array>, {
        status, statusText: incoming.statusMessage, headers: responseHeaders,
      });
      Object.defineProperty(response, "url", { value: input });
      resolve(response);
    });
    req.on("error", error => reject(signal.aborted ? signal.reason : error));
    req.end();
  });
}
