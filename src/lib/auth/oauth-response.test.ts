import { expect, test } from "bun:test";
import { oauthRedirect } from "./oauth-response";
import { buildSetSessionCookie } from "./cookie";

test("OAuth redirect preserves the same session cookie as password login while clearing state", () => {
  const response = oauthRedirect(new URL("https://example.com/?auth_success=1"), "session-probe");
  const cookies = response.headers.getSetCookie();
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://example.com/?auth_success=1");
  expect(cookies).toContain(buildSetSessionCookie("session-probe"));
  expect(cookies.some((value) => value.startsWith("watcha_oauth_state=;") && value.includes("1970"))).toBe(true);
  expect(cookies.some((value) => value.startsWith("watcha_oauth_intent=;") && value.includes("1970"))).toBe(true);
});

test("failed OAuth only clears authorization state and does not replace an existing session", () => {
  const response = oauthRedirect(new URL("https://example.com/?auth_error=state_mismatch"));
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(response.headers.getSetCookie().some((value) => value.startsWith("__Host-session="))).toBe(false);
});
