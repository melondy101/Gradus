export function loginEmail(value: string | null | undefined): string {
  const email = value?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 256) return "";
  if (email.endsWith("@anon.local") || email.endsWith("@watcha.user")) return "";
  return email;
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 6) return "密码至少 6 个字符";
  if (new TextEncoder().encode(password).length > 72) return "密码最多 72 字节，请缩短密码";
  return null;
}

/** Only browser-reencoded raster images are accepted, capped at 256 KiB. */
export function validateAvatar(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 350000) return "头像文件过大";
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return "请选择 PNG、JPEG 或 WebP 图片";
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 256 * 1024 || bytes.length < 12) return "头像文件无效或过大";
  const valid = match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : match[1] === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return valid ? null : "图片格式与文件内容不符";
}
