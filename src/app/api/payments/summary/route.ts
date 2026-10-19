import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { COMMERCE_PRODUCTS } from "@/lib/commerce/catalog";
import { getCommerceSummary } from "@/lib/commerce/summary";
import { isTempUser } from "@/lib/membership/quota";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    ...await getCommerceSummary(auth.userId, !isTempUser(auth.user)),
    products: COMMERCE_PRODUCTS,
  });
}
