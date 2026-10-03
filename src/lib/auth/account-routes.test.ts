import { expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { POST as email } from "@/app/api/user/account/email/route";
import { POST as password } from "@/app/api/user/account/password/route";
import { POST as merge } from "@/app/api/user/account/merge/route";
import { POST as code } from "@/app/api/user/account/code/route";

test("account mutations require the local cookie session and reject forged browser headers before reading input", async () => {
  for (const handler of [email, password, merge, code]) {
    const response = await handler(new NextRequest("https://example.com/api/user/account/probe", {
      method: "POST", headers: { "x-user-id": "someone-else", "Content-Type": "application/json" }, body: "invalid-json",
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "未登录" });
  }
});
