import { expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { config, middleware } from "@/middleware";

test("OAuth callbacks are excluded from automatic guest-session renewal", async () => {
  const request = new NextRequest("https://example.com/api/auth/oauth/watcha/callback?code=probe");
  const response = await middleware(request);
  expect(response.headers.getSetCookie()).toEqual([]);
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(config.matcher[0]).toContain("auth/oauth/");
});
