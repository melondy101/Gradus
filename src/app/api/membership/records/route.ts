import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllRedemptionRecords } from "@/lib/db/queries/membership";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const records = await getAllRedemptionRecords();
  return NextResponse.json({
    ok: true,
    records,
  });
}
