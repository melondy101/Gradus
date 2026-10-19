import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { commerceEnabled, getProduct, paymentProvider, type ProductSku } from "@/lib/commerce/catalog";
import { checkWatchaAccess, getWatchaPayConfig, WatchaPayError } from "@/lib/commerce/watcha-pay";
import { isTempUser } from "@/lib/membership/quota";

async function accessForUser(request: NextRequest, purchase: boolean) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!commerceEnabled() || paymentProvider() !== "watcha") {
    return NextResponse.json({ error: "爱猹收尚未启用" }, { status: 503 });
  }
  if (isTempUser(auth.user)) return NextResponse.json({ error: "请先注册或登录" }, { status: 403 });
  const body = purchase ? await request.json().catch(() => null) as { sku?: unknown } | null : null;
  const sku = purchase ? (typeof body?.sku === "string" ? body.sku : null)
    : request.nextUrl.searchParams.get("sku");
  const product = sku ? getProduct(sku) : null;
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  if (product.sku === "pro30") {
    return NextResponse.json({ error: "专业版权益仍在适配，暂不可购买" }, { status: 503 });
  }
  const config = getWatchaPayConfig();
  const entitlementId = config?.entitlementIds[product.sku as Exclude<ProductSku, "pro30">];
  if (!config || !entitlementId) return NextResponse.json({ error: "该商品尚未开通" }, { status: 503 });
  const origin = process.env.GRADUS_PUBLIC_ORIGIN?.trim();
  if (purchase && (!origin || !/^https:\/\/[^/]+$/.test(origin))) {
    return NextResponse.json({ error: "购买回跳地址尚未配置" }, { status: 503 });
  }
  try {
    const returnUrl = purchase ? `${origin}/payment/return?sku=${product.sku}` : undefined;
    const result = await checkWatchaAccess(config, entitlementId, auth.userId, returnUrl);
    if (result.entitlement.type !== "quota") throw new WatchaPayError("商品权益类型与拾级配置不一致");
    return NextResponse.json({
      ok: true, sku: product.sku, access: result.access,
      remaining: result.entitlement.remaining ?? null,
      startsAt: result.entitlement.starts_at ?? null,
      expiresAt: result.entitlement.expires_at ?? null,
      reason: result.reason?.code ?? null,
      purchaseUrl: purchase ? result.purchase?.url ?? null : null,
    });
  } catch (error) {
    console.warn("[watcha-pay] entitlement access unavailable", {
      status: error instanceof WatchaPayError ? error.status : undefined,
      code: error instanceof WatchaPayError ? error.code : undefined,
      traceId: error instanceof WatchaPayError ? error.traceId : undefined,
    });
    return NextResponse.json({ error: "权益状态暂时无法确认，请稍后重试" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  return accessForUser(request, false);
}

export async function POST(request: NextRequest) {
  return accessForUser(request, true);
}
