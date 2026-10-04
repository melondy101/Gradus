import { createHmac } from "node:crypto";
import { getAuthSecret } from "./env";

export function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export function configuredAdminId() {
  return process.env.ADMIN_USER_ID?.trim() || undefined;
}

export function isManagedAdminAccount(user: { id: string; email?: string | null; emailLower?: string | null }) {
  const id = configuredAdminId();
  return user.id === (id ?? "admin-system-root") || Boolean(configuredAdminEmail() &&
    (user.emailLower ?? user.email)?.trim().toLowerCase() === configuredAdminEmail());
}

/** Keyed digest: a browser-visible claim must not become an offline password oracle. */
export function adminConfigFingerprint(userId: string): string | undefined {
  const email = configuredAdminEmail(), password = process.env.ADMIN_PASSWORD;
  if (!email || !password || (configuredAdminId() && configuredAdminId() !== userId)) return undefined;
  return createHmac("sha256", getAuthSecret())
    .update(JSON.stringify(["gradus-admin-config-v1", userId, email, password])).digest("hex");
}

export function adminSessionMatchesConfig(user: { id: string; email?: string | null }, session: { adminConfig?: string }) {
  if (!isManagedAdminAccount(user) && session.adminConfig === undefined) return true;
  const current = adminConfigFingerprint(user.id);
  return Boolean(isManagedAdminAccount(user) && current && session.adminConfig === current);
}
