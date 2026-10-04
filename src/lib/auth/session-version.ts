import { adminSessionMatchesConfig } from "./admin-config";

export function sessionMatchesUser(user: { id: string; sessionVersion: number; email?: string | null }, session: { sub: string; version?: number; adminConfig?: string }) {
  return user.id === session.sub && user.sessionVersion === (session.version ?? 0) && adminSessionMatchesConfig(user, session);
}
