import { afterEach, expect, test } from "bun:test";
import { adminConfigFingerprint } from "./admin-config";
import { sessionMatchesUser } from "./session-version";
import { signSession, verifySession } from "./jwt";

const original = { ADMIN_EMAIL: process.env.ADMIN_EMAIL, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_USER_ID: process.env.ADMIN_USER_ID };
afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function configure() {
  process.env.ADMIN_EMAIL = "admin@example.com";
  process.env.ADMIN_PASSWORD = "original-password";
  process.env.ADMIN_USER_ID = "stable-admin";
}
const user = { id: "stable-admin", email: "admin@example.com", sessionVersion: 3 };

test("email or password rotation invalidates signed administrator sessions before any database synchronization", async () => {
  configure();
  const decoded = await verifySession(await signSession({ sub: user.id, email: user.email, name: "Admin", version: 3,
    adminConfig: adminConfigFingerprint(user.id) }));
  expect(decoded).not.toBeNull();
  expect(sessionMatchesUser(user, decoded!)).toBe(true);
  process.env.ADMIN_EMAIL = "new@example.com";
  expect(sessionMatchesUser(user, decoded!)).toBe(false);
  configure();
  process.env.ADMIN_PASSWORD = "new-password";
  expect(sessionMatchesUser(user, decoded!)).toBe(false);
});

test("legacy admin sessions and mismatched IDs fail closed while ordinary sessions remain valid", () => {
  configure();
  expect(sessionMatchesUser(user, { sub: user.id, version: 3 })).toBe(false);
  expect(adminConfigFingerprint("different-id")).toBeUndefined();
  expect(sessionMatchesUser({ id: "ordinary", email: "ordinary@example.com", sessionVersion: 0 }, { sub: "ordinary" })).toBe(true);
  delete process.env.ADMIN_PASSWORD;
  expect(sessionMatchesUser(user, { sub: user.id, version: 3, adminConfig: "old" })).toBe(false);
});
