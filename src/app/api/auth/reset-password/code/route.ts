import { NextRequest, NextResponse } from "next/server";
import { accountLimit } from "@/lib/auth/account-limit";
import { loginEmail } from "@/lib/auth/account-validation";
import { sendAccountCode } from "@/lib/auth/account-code";
import { getUserByEmailLowerFromDatabase } from "@/lib/db/queries";
import { accountErrorResponse } from "@/lib/auth/account-error";
import { isManagedAdminAccount } from "@/lib/auth/admin-config";

export async function POST(request: NextRequest) {
  try {
    const limited = await accountLimit(request);
    if (limited) return limited;
    const body = await request.json().catch(() => null);
    const email = loginEmail(typeof body?.email === "string" ? body.email : "");
    if (!email) return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
    const user = await getUserByEmailLowerFromDatabase(email);
    const message = "若该邮箱已注册，验证码将发送至邮箱，10 分钟内有效";
    if (!user || isManagedAdminAccount(user)) return NextResponse.json({ ok: true, message });
    const result = await sendAccountCode(email, "reset", email);
    return NextResponse.json({ ...result, message: result.ok ? message : undefined }, { status: result.ok ? 200 : 400 });
  } catch (error) { return accountErrorResponse(error); }
}
