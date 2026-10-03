import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { loginEmail } from "@/lib/auth/account-validation";
import { updateAccountEmail } from "@/lib/auth/account-credentials";
import { accountLimit } from "@/lib/auth/account-limit";
import { accountResponse } from "@/lib/auth/account-response";
import { AccountError, accountErrorResponse } from "@/lib/auth/account-error";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  try {
    const limited = await accountLimit(request);
    if (limited) return limited;
    const body = await request.json().catch(() => null);
    const email = loginEmail(typeof body?.email === "string" ? body.email : "");
    if (!email) throw new AccountError("请输入有效的登录邮箱");
    const result = await db.transaction(tx => updateAccountEmail(tx, auth.userId, auth.user.sessionVersion, email,
      typeof body.code === "string" ? body.code : "", typeof body.currentPassword === "string" ? body.currentPassword : ""));
    return result.user ? accountResponse(result.user) : NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) { return accountErrorResponse(error); }
}
