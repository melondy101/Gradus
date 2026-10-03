import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { accountLimit } from "@/lib/auth/account-limit";
import { loginEmail, validateNewPassword } from "@/lib/auth/account-validation";
import { hashPassword } from "@/lib/auth/password";
import { recoverAccountPassword } from "@/lib/auth/account-credentials";
import { AccountError, accountErrorResponse } from "@/lib/auth/account-error";

export async function POST(request: NextRequest) {
  try {
    const limited = await accountLimit(request);
    if (limited) return limited;
    const body = await request.json().catch(() => null);
    const email = loginEmail(typeof body?.email === "string" ? body.email : "");
    const password = typeof body?.password === "string" ? body.password : "";
    const error = validateNewPassword(password);
    if (!email || error) throw new AccountError(error ?? "请输入有效邮箱");
    const passwordHash = await hashPassword(password);
    const result = await db.transaction(tx => recoverAccountPassword(tx, email, passwordHash, typeof body.code === "string" ? body.code : ""));
    return NextResponse.json(result.error ? { error: result.error } : { ok: true }, { status: result.error ? 400 : 200 });
  } catch (error) { return accountErrorResponse(error); }
}
