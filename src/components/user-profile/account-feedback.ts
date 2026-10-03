import { toast } from "sonner";
import { updateCurrentUser } from "@/lib/auth/user-provider";
import type { AccountResult } from "@/lib/api/account";
import type { ApiResult } from "@/lib/api/result";

export function accountFeedback(result: ApiResult<AccountResult>, message: string) {
  if (!result.ok || !result.data.ok) {
    toast.error(result.ok ? result.data.error ?? "操作失败" : result.message);
    return false;
  }
  if (result.data.user) updateCurrentUser(result.data.user);
  toast.success(message);
  return true;
}
