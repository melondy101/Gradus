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

test("credential changes and recovery own their response cookies without middleware renewing an old session", async () => {
  for (const path of ["/api/user/account/email", "/api/user/account/password", "/api/user/account/merge", "/api/auth/reset-password"]) {
    const response = await middleware(new NextRequest(`https://example.com${path}`));
    expect(response.headers.getSetCookie()).toEqual([]);
  }
});
