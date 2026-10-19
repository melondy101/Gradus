import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { mergeAccounts } from "@/lib/auth/merge-accounts";
import { accountResponse } from "@/lib/auth/account-response";
import { accountLimit } from "@/lib/auth/account-limit";
import { loginEmail } from "@/lib/auth/account-validation";
import { AccountError, accountErrorResponse } from "@/lib/auth/account-error";
import { paymentProvider } from "@/lib/commerce/catalog";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  try {
    const limited = await accountLimit(request);
    if (limited) return limited;
    // Paid Watcha quota is keyed by the original user ID. Merging deletes that ID.
    if (paymentProvider() === "watcha") {
      throw new AccountError("爱猹收权益暂不支持跨账号迁移，请保留当前账号使用，暂勿合并", 409);
    }
    const body = await request.json().catch(() => null);
    const email = loginEmail(typeof body?.email === "string" ? body.email : "");
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password || body?.confirm !== true) throw new AccountError("请填写旧账号邮箱和密码，并确认数据合并");
    const user = await db.transaction(tx => mergeAccounts(tx, auth.userId, email, password, auth.user.sessionVersion));
    return accountResponse(user);
  } catch (error) { return accountErrorResponse(error); }
}
