import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createMembershipCodes } from "@/lib/api/membership-codes";
import { deleteRedemptionCode, getAllRedemptionCodes } from "@/lib/db/queries/membership";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const now = Date.now();
  let activeCodes = 0;
  let redeemedCount = 0;
  const codes = (await getAllRedemptionCodes()).map((item) => {
    redeemedCount += item.usedCount;
    const expired = item.expiresAt ? new Date(item.expiresAt).getTime() < now : false;
    const exhausted = item.maxUses > 0 && item.usedCount >= item.maxUses;
    if (!expired && !exhausted) activeCodes += 1;
    return { ...item, isActive: !expired && !exhausted, isExpired: expired, isExhausted: exhausted };
  });

  return NextResponse.json({
    ok: true,
    codes,
    stats: { totalCodes: codes.length, activeCodes, totalRedeemedCount: redeemedCount },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const result = await createMembershipCodes(await request.json().catch(() => null));
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const target = url.searchParams.get("code") || url.searchParams.get("id") || "";
  if (!target) return NextResponse.json({ ok: false, error: "缺少要删除的激活码标识" }, { status: 400 });

  try {
    if (!(await deleteRedemptionCode(target))) {
      return NextResponse.json({ ok: false, error: "兑换码不存在或已被删除" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "激活码已成功删除/作废" });
  } catch {
    return NextResponse.json({ ok: false, error: "删除兑换码失败，请稍后重试" }, { status: 500 });
  }
}
