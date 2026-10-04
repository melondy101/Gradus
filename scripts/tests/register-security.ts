// Run in its own Bun process so module stubs cannot affect the normal test suite.
// @ts-expect-error Bun's test APIs are available in the fixture runner, not the Next.js build.
import { mock } from "bun:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { AccountError } from "../../src/lib/auth/account-error";

let configured = false;
let verified = false;
let inserts = 0;
let verifications = 0;
mock.module("@/lib/db/client", () => ({ db: { transaction: async (work: (tx: unknown) => Promise<void>) =>
  work({ insert: () => ({ values: async () => { inserts++; } }) }) } }));
mock.module("@/lib/db/queries", () => ({ getUserByEmailLower: async () => null, getUserById: async () => null,
  getUserByEmailLowerFromDatabase: async () => null,
  upsertUser: async (user: unknown) => user }));
mock.module("@/lib/auth/ratelimit", () => ({ checkRateLimit: async () => ({ allowed: true }), getClientIp: () => "fixture" }));
mock.module("@/lib/auth/password", () => ({ hashPassword: async () => "fixture-hash",
  verifyPassword: async (password: string) => password === "fixture-admin-password" }));
mock.module("@/lib/auth/jwt", () => ({ signSession: async () => "fixture-token", verifySession: async () => null }));
mock.module("@/lib/email/mailer", () => ({ isRealEmailConfigured: () => configured }));
mock.module("@/lib/email/verification", () => ({ verifyEmailCode: async () => { verifications++; return { ok: verified, error: "invalid code" }; } }));
process.env.ADMIN_EMAIL = "Admin@Example.com";
const { POST } = await import("../../src/app/api/auth/register/route");
const register = (email: string, code?: string) => POST(new NextRequest("https://fixture.example/api/auth/register", {
  method: "POST", body: JSON.stringify({ name: "Fixture", email, password: "fixture-password", code }),
}));
for (configured of [false, true]) {
  for (const code of [undefined, "123456"]) {
    assert.equal((await register("  ADMIN@example.COM  ", code)).status, 403);
  }
}
assert.equal(inserts, 0);
assert.equal(verifications, 0);
configured = false;
assert.equal((await register("ordinary@qq.com")).status, 200);
configured = true;
assert.equal((await register("ordinary@qq.com")).status, 400);
assert.equal((await register("ordinary@qq.com", "000000")).status, 400);
verified = true;
const success = await register("ordinary@qq.com", "123456");
assert.equal(success.status, 200);
assert.ok(success.headers.get("set-cookie")?.includes("fixture-token"));
assert.equal(inserts, 2);
process.env.ADMIN_PASSWORD = "fixture-admin-password";
mock.module("@/lib/auth/admin-login", () => ({ loginConfiguredAdmin: async (password: string) => {
  if (password !== process.env.ADMIN_PASSWORD) throw new AccountError("邮箱或密码不正确", 401);
  return { id: "admin-system-root", email: "admin@example.com", emailLower: "admin@example.com",
    name: "Admin", passwordHash: "fixture-hash", sessionVersion: 0 };
} }));
const { POST: login } = await import("../../src/app/api/auth/login/route");
const adminLogin = (password: string) => login(new NextRequest("https://fixture.example/api/auth/login", {
  method: "POST", body: JSON.stringify({ email: "ADMIN@example.com", password }),
}));
assert.equal((await adminLogin("wrong-password")).status, 401);
const adminSession = await adminLogin("fixture-admin-password");
assert.equal(adminSession.status, 200);
assert.ok(adminSession.headers.get("set-cookie")?.includes("fixture-token"));
console.log("PASS: admin registration rejected; ordinary registration and configured admin login preserved");
