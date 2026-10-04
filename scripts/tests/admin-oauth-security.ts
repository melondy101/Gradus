// Isolated route fixture: mocks must never enter the normal test process.
// @ts-expect-error Bun test types are provided by the fixture runner.
import { mock } from "bun:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { signSession, verifySession } from "../../src/lib/auth/jwt";
import { adminConfigFingerprint } from "../../src/lib/auth/admin-config";

process.env.ADMIN_USER_ID = "stable-admin";
process.env.ADMIN_EMAIL = "new@example.com";
process.env.ADMIN_PASSWORD = "new-password";
process.env.WATCHA_CLIENT_ID = "fixture-client";
process.env.WATCHA_CLIENT_SECRET = "fixture-secret";
process.env.WATCHA_REDIRECT_URI = "https://fixture.example/api/auth/oauth/watcha/callback";
const user = { id: "stable-admin", email: "old@example.com", name: "Original", sessionVersion: 2,
  passwordHash: "existing-hash", watchaOpenId: "verified-provider" };
let transactions = 0, syncs = 0, rotatedDuringBinding = false;
mock.module("@/lib/db/queries", () => ({ getUserByIdFromDatabase: async () => user }));
mock.module("@/lib/db/client", () => ({ db: { transaction: async (work: (tx: unknown) => Promise<unknown>) => {
  transactions++;
  return work({ select: () => ({ from: () => ({ where: () => ({
    limit: async () => [user],
    for: async () => [{ ...user, sessionVersion: rotatedDuringBinding ? 3 : user.sessionVersion }],
  }) }) }) });
} } }));
mock.module("@/lib/auth/admin-login", () => ({ syncConfiguredAdmin: async (id: string) => {
  assert.equal(id, user.id); syncs++;
  return { ...user, email: "new@example.com", sessionVersion: 3 };
} }));
globalThis.fetch = (async (input: string | URL | Request) => Response.json(String(input).endsWith("/token")
  ? { access_token: "provider-token" } : { data: { user_id: user.watchaOpenId } })) as typeof fetch;
const { GET } = await import("../../src/app/api/auth/oauth/watcha/callback/route");
const callback = (intent: string, token?: string) => GET(new NextRequest(
  "https://fixture.example/api/auth/oauth/watcha/callback?code=verified&state=fixture-state", {
    headers: { cookie: `watcha_oauth_state=fixture-state; watcha_oauth_intent=${intent}${token ? `; __Host-session=${token}` : ""}` },
  }));
const oldToken = await signSession({ sub: user.id, email: user.email, name: user.name, version: 2 });
for (const token of [undefined, oldToken]) {
  const response = await callback("bind", token);
  assert.ok(response.headers.get("location")?.includes("session_expired"));
}
assert.equal(transactions, 0);
assert.equal(syncs, 0);
const validBeforeRotation = await signSession({ sub: user.id, email: user.email, name: user.name,
  version: 2, adminConfig: adminConfigFingerprint(user.id) });
rotatedDuringBinding = true;
assert.ok((await callback("bind", validBeforeRotation)).headers.get("location")?.includes("session_expired"));
assert.equal(syncs, 0);
rotatedDuringBinding = false;
const response = await callback("login");
assert.ok(response.headers.get("location")?.includes("auth_success=1"));
const cookie = response.headers.get("set-cookie")!;
const token = cookie.match(/__Host-session=([^;]+)/)?.[1];
assert.ok(token);
const session = await verifySession(token);
assert.equal(session?.sub, user.id);
assert.equal(session?.version, 3);
assert.equal(session?.email, "new@example.com");
assert.equal(session?.adminConfig, adminConfigFingerprint(user.id));
assert.equal(syncs, 1);
console.log("PASS: expired admin binding rejected; verified existing provider login preserves identity and uses current configuration");
