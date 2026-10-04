import { afterEach, expect, test } from "bun:test";
import { isReservedAdminEmail } from "./reserved-identity";
import { updateAccountEmail } from "./account-credentials";
const original = process.env.ADMIN_EMAIL;
afterEach(() => { if (original === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = original; });

test("reserved identity matching normalizes case and spaces and leaves ordinary accounts unchanged", () => {
  process.env.ADMIN_EMAIL = "  Admin@Example.com ";
  expect(isReservedAdminEmail(" ADMIN@example.COM ")).toBe(true);
  expect(isReservedAdminEmail("person@qq.com")).toBe(false);
  delete process.env.ADMIN_EMAIL;
  expect(isReservedAdminEmail("admin@example.com")).toBe(false);
});
test("account binding cannot claim reserved identity even with a supplied code", async () => {
  process.env.ADMIN_EMAIL = "admin@example.com";
  await expect(updateAccountEmail({} as Parameters<typeof updateAccountEmail>[0], "ordinary", 0,
    " ADMIN@EXAMPLE.COM ", "123456", "password")).rejects.toThrow("该邮箱不支持账号绑定");
});
