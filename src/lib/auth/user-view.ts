import type { User } from "@/lib/db/schema";

export function userView(user: User) {
  return {
    id: user.id, email: user.email ?? "", name: user.name ?? "",
    avatarUrl: user.avatarUrl, passwordSet: Boolean(user.passwordHash),
    watchaBound: Boolean(user.watchaOpenId),
    membershipTier: user.membershipTier,
    membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
  };
}
