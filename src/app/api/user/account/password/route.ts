import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { validateNewPassword } from "@/lib/auth/account-validation";
import { hashPassword } from "@/lib/auth/password";
import { updateAccountPassword } from "@/lib/auth/account-credentials";
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
    const password = typeof body?.password === "string" ? body.password : "";
    const error = validateNewPassword(password);
    if (error) throw new AccountError(error);
    const passwordHash = await hashPassword(password);
    const result = await db.transaction(tx => updateAccountPassword(tx, auth.userId, auth.user.sessionVersion, passwordHash,
      typeof body.currentPassword === "string" ? body.currentPassword : "", typeof body.code === "string" ? body.code : ""));
    return result.user ? accountResponse(result.user) : NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) { return accountErrorResponse(error); }
}
