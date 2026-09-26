"use client";

import { apiFetch, type ApiResult } from "@/lib/api/result";
import type { CurrentUserView } from "@/lib/auth/current-user";

export interface ProfileUpdateResult {
  ok?: boolean;
  user?: CurrentUserView;
  error?: string;
}

/** 更新当前登录用户可编辑的公开资料。 */
export function updateUserProfile(input: { name: string }): Promise<ApiResult<ProfileUpdateResult>> {
  return apiFetch<ProfileUpdateResult>("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name.trim() }),
  });
}
