export function sessionMatchesUser(user: { id: string; sessionVersion: number }, session: { sub: string; version?: number }) {
  return user.id === session.sub && user.sessionVersion === (session.version ?? 0);
}
