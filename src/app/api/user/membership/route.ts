import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserQuotaSummary } from "@/lib/membership/quota";
import { TIER_CONFIGS, PRESET_REDEMPTION_CODES } from "@/lib/membership/tiers";
import { getUserRedemptionHistory } from "@/lib/db/queries/membership";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const quota = await getUserQuotaSummary(auth.user.id);
  const history = await getUserRedemptionHistory(auth.user.id);

  return NextResponse.json({
    ok: true,
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
    },
    membership: quota,
    tiers: TIER_CONFIGS,
    presetCodes: PRESET_REDEMPTION_CODES,
    history,
  });
}
