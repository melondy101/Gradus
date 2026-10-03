import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { accountLimit } from "@/lib/auth/account-limit";
import { sendAccountCode } from "@/lib/auth/account-code";
import { loginEmail } from "@/lib/auth/account-validation";
import { getUserByEmailLowerFromDatabase } from "@/lib/db/queries";
import { accountErrorResponse } from "@/lib/auth/account-error";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  try {
    const limited = await accountLimit(request);
    if (limited) return limited;
    const body = await request.json().catch(() => null);
    const purpose = body?.purpose;
    if (purpose !== "email" && purpose !== "password") return NextResponse.json({ error: "验证用途不正确" }, { status: 400 });
    const email = loginEmail(purpose === "password" ? auth.user.email : typeof body.email === "string" ? body.email : "");
    if (!email) return NextResponse.json({ error: "请先绑定真实邮箱" }, { status: 400 });
    if (purpose === "email") {
      const existing = await getUserByEmailLowerFromDatabase(email);
      if (existing && existing.id !== auth.userId) return NextResponse.json({ error: "该邮箱已有账号，请使用绑定旧账号" }, { status: 409 });
    }
    const result = await sendAccountCode(email, purpose, auth.userId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) { return accountErrorResponse(error); }
}
