"use client";

import { useEffect } from "react";
import { useCurrentUser, updateCurrentUser } from "@/lib/auth/user-provider";
import { auth } from "@/lib/eazo-shim";
import { toast } from "sonner";

/**
 * 同步用户状态与处理 OAuth 回调通知
 */
export function UserSyncEffect() {
  const user = useCurrentUser();
  useEffect(() => {
    if (user) updateCurrentUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 检测 OAuth 回调参数（如观猹登录成功或失败）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const authSuccess = url.searchParams.get("auth_success");
    const authError = url.searchParams.get("auth_error");

    if (authSuccess) {
      toast.success("登录成功！已为您关联观猹账号");
      auth.refresh();
      url.searchParams.delete("auth_success");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    } else if (authError) {
      const errorMsg =
        authError === "state_mismatch"
          ? "授权状态校验失败，请重试"
          : authError === "watcha_oauth_not_configured"
          ? "观猹 OAuth 尚未配置"
          : decodeURIComponent(authError);
      toast.error(`观猹授权登录失败：${errorMsg}`);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);

  return null;
}
