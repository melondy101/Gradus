import { describe, expect, test } from "bun:test";
import { createPublicLookup } from "./public-dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import { connect } from "node:net";

function resolveWith(addresses: LookupAddress[], options: LookupOptions = {}) {
  return new Promise<{ error: Error | null; address: string | LookupAddress[]; family?: number }>(done => {
    createPublicLookup(async () => addresses)("resource.example", options,
      (error, address, family) => done({ error, address, family }));
  });
}

describe("socket DNS boundary", () => {
  test("private, mixed, IPv6 local and empty answers fail closed", async () => {
    for (const addresses of [
      [], [{ address: "127.0.0.1", family: 4 }], [{ address: "169.254.169.254", family: 4 }],
      [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }],
      [{ address: "fe90::1", family: 6 }], [{ address: "::ffff:7f00:1", family: 6 }],
    ]) expect((await resolveWith(addresses)).error?.message).toContain("SSRF blocked");
  });
  test("public answers are returned directly to socket in all and single modes", async () => {
    const answers = [{ address: "8.8.8.8", family: 4 }, { address: "2606:4700:4700::1111", family: 6 }];
    expect(await resolveWith(answers)).toEqual({ error: null, address: "8.8.8.8", family: 4 });
    expect((await resolveWith(answers, { all: true })).address).toEqual(answers);
    expect((await resolveWith(answers, { family: 6 })).address).toBe(answers[1].address);
  });
  test("DNS errors propagate without connecting", async () => {
    const result = await new Promise<Error | null>(done => {
      createPublicLookup(async () => { throw new Error("DNS unavailable"); })("broken.example", {}, error => done(error));
    });
    expect(result?.message).toBe("DNS unavailable");
  });
  test("native socket rejects a private DNS answer before connection", async () => {
    const error = await new Promise<Error>(done => {
      const socket = connect({ host: "attacker.invalid", port: 80,
        lookup: createPublicLookup(async () => [{ address: "127.0.0.1", family: 4 }]) });
      socket.on("connect", () => { socket.destroy(); done(new Error("unexpected connection")); });
      socket.on("error", done);
    });
    expect(error.message).toContain("SSRF blocked");
  });
});
