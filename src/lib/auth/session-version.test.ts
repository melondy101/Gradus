import { expect, test } from "bun:test";
import { sessionMatchesUser } from "./session-version";
import { signSession, verifySession } from "./jwt";

test("password and email changes reject previous sessions without invalidating unchanged legacy accounts", () => {
  expect(sessionMatchesUser({ id: "u1", sessionVersion: 0 }, { sub: "u1" })).toBe(true);
  expect(sessionMatchesUser({ id: "u1", sessionVersion: 1 }, { sub: "u1", version: 0 })).toBe(false);
  expect(sessionMatchesUser({ id: "u1", sessionVersion: 1 }, { sub: "u1", version: 1 })).toBe(true);
  expect(sessionMatchesUser({ id: "u2", sessionVersion: 1 }, { sub: "u1", version: 1 })).toBe(false);
});
test("both login methods can round-trip the current session version", async () => {
  const token = await signSession({ sub: "u1", email: "u1@example.com", name: "User", version: 3 });
  expect((await verifySession(token))?.version).toBe(3);
});
