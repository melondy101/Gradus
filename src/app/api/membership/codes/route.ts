import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAllRedemptionCodes,
  createRedemptionCode,
  deleteRedemptionCode,
} from "@/lib/db/queries/membership";

// 生成高可读性、防混淆的随机券码（去除 0, O, 1, I 等易混淆字符）
function generateRandomCode(prefix = "VIP", length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < length; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
  return cleanPrefix ? `${cleanPrefix}-${randomPart}` : randomPart;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const list = await getAllRedemptionCodes();

  // 统计
  const now = Date.now();
  let totalActive = 0;
  let totalRedeemedCount = 0;

  const enriched = list.map((item) => {
    totalRedeemedCount += item.usedCount;
    const isExpired = item.expiresAt ? new Date(item.expiresAt).getTime() < now : false;
    const isExhausted = item.maxUses > 0 && item.usedCount >= item.maxUses;
    const isActive = !isExpired && !isExhausted;
    if (isActive) totalActive += 1;

    return {
      ...item,
      isActive,
      isExpired,
      isExhausted,
    };
  });

  return NextResponse.json({
    ok: true,
    codes: enriched,
    stats: {
      totalCodes: enriched.length,
      activeCodes: totalActive,
      totalRedeemedCount,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "无效的请求参数" }, { status: 400 });
  }

  const {
    customCode,
    prefix = "PRO",
    tier = "pro",
    durationDays = 30,
    maxUses = 100,
    count = 1,
    description = "",
    expiresInDays,
  } = body as {
    customCode?: string;
    prefix?: string;
    tier?: string;
    durationDays?: number;
    maxUses?: number;
    count?: number;
    description?: string;
    expiresInDays?: number;
  };

  const validTier = tier === "premium" ? "premium" : "pro";
  const validDuration = Math.max(1, Math.min(3650, Number(durationDays) || 30));
  const validMaxUses = Math.max(1, Math.min(100000, Number(maxUses) || 1));
  const batchCount = Math.max(1, Math.min(50, Number(count) || 1));

  let expiresAt: Date | null = null;
  if (expiresInDays && Number(expiresInDays) > 0) {
    expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
  }

  // 1. 如果指定了单个自定义兑换码
  if (customCode && typeof customCode === "string" && customCode.trim()) {
    const codeStr = customCode.trim().toUpperCase().slice(0, 32);
    try {
      const created = await createRedemptionCode({
        code: codeStr,
        tier: validTier,
        durationDays: validDuration,
        maxUses: validMaxUses,
        description: description || `自定义 ${validTier.toUpperCase()} 激活码`,
        expiresAt,
      });

      return NextResponse.json({
        ok: true,
        message: `成功生成激活码：${created.code}`,
        codes: [created],
      });
    } catch {
      return NextResponse.json({ ok: false, error: "该兑换码已存在或格式不符" }, { status: 400 });
    }
  }

  // 2. 批量或单张自动生成
  const createdCodes = [];
  for (let i = 0; i < batchCount; i++) {
    const generatedCode = generateRandomCode(prefix, 8);
    const codeItem = await createRedemptionCode({
      code: generatedCode,
      tier: validTier,
      durationDays: validDuration,
      maxUses: validMaxUses,
      description: description || `批量生成 ${validTier.toUpperCase()} ${validDuration}天卡`,
      expiresAt,
    });
    createdCodes.push(codeItem);
  }

  return NextResponse.json({
    ok: true,
    message: `成功生成 ${createdCodes.length} 个激活码`,
    codes: createdCodes,
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const id = url.searchParams.get("id") || "";

  const target = code || id;
  if (!target) {
    return NextResponse.json({ ok: false, error: "缺少要删除的激活码标识" }, { status: 400 });
  }

  await deleteRedemptionCode(target);
  return NextResponse.json({ ok: true, message: "激活码已成功删除/作废" });
}
