import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { redeemMembershipCode } from "@/lib/membership/redeem";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // 限流：防暴力猜测兑换码（每用户每分钟最多 10 次）
  const limited = enforceRateLimit(`redeem:${auth.user.id}`, 10, 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "无效的请求数据" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ ok: false, error: "请输入兑换码" }, { status: 400 });
  }

  if (code.length > 64) {
    return NextResponse.json({ ok: false, error: "兑换码格式错误" }, { status: 400 });
  }

  const result = await redeemMembershipCode(auth.user.id, code);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
