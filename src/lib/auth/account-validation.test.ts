import { expect, test } from "bun:test";
import { loginEmail, validateAvatar, validateNewPassword } from "./account-validation";

test("internal third-party and guest addresses are never usable login emails", () => {
  expect(loginEmail("watcha_random@watcha.user")).toBe("");
  expect(loginEmail("temp-random@anon.local")).toBe("");
  expect(loginEmail(" Person@QQ.com ")).toBe("person@qq.com");
});
test("passwords reject empty, short and bcrypt-truncated values", () => {
  expect(validateNewPassword("12345")).toBeTruthy();
  expect(validateNewPassword("a".repeat(73))).toBeTruthy();
  expect(validateNewPassword("你".repeat(25))).toBeTruthy();
  expect(validateNewPassword("correct-password")).toBeNull();
});
test("avatars reject active content, remote URLs and malformed image data", () => {
  expect(validateAvatar(null)).toBeNull();
  expect(validateAvatar("data:image/svg+xml;base64,PHN2Zz4=")).toBeTruthy();
  expect(validateAvatar("https://example.com/photo.png")).toBeTruthy();
  expect(validateAvatar("data:image/png;base64,YWJj")).toBeTruthy();
});
