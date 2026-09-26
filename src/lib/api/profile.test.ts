import { afterEach, describe, expect, test } from "bun:test";

import { setApiFetchTransport } from "@/lib/api/result";
import { updateUserProfile } from "@/lib/api/profile";

afterEach(() => setApiFetchTransport(null));

describe("updateUserProfile", () => {
  test("sends the trimmed display name to the authenticated profile endpoint", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    setApiFetchTransport(async (input, init) => {
      request = { input, init };
      return new Response(JSON.stringify({ ok: true, user: { id: "u1", name: "Ada", email: "ada@example.com" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await updateUserProfile({ name: "  Ada  " });

    expect(result.ok).toBe(true);
    expect(request).toEqual({
      input: "/api/user/profile",
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ada" }),
      },
    });
  });
});
