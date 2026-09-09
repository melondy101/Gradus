export const ADMIN_EMAIL = "dae201459@gmail.com";
export const ADMIN_DEFAULT_PASSWORD = "dae201459@gmail.com0928";

/**
 * 校验邮箱是否为系统管理员
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * 校验用户对象是否具备管理员权限（客户端与服务端通用）
 */
export function isAdminUser(user?: { email?: string | null } | null): boolean {
  if (!user || !user.email) return false;
  return isAdminEmail(user.email);
}
