/**
 * Client-side display hint only. API authorization must use `admin.ts`, which
 * reads the non-public `ADMIN_EMAIL` environment variable on the server.
 */
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

/**
 * 校验邮箱是否为系统管理员
 */
export function isAdminEmail(email?: string | null): boolean {
  return Boolean(ADMIN_EMAIL && email?.trim().toLowerCase() === ADMIN_EMAIL);
}

/**
 * 校验用户对象是否具备管理员权限（客户端与服务端通用）
 */
export function isAdminUser(user?: { email?: string | null } | null): boolean {
  if (!user || !user.email) return false;
  return isAdminEmail(user.email);
}
