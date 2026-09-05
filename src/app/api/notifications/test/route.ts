import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * Self-hosted mode: the original implementation published a push via the Eazo
 * platform's `notifications` service, which is unavailable off-platform. We
 * keep the endpoint so the client "test notification" button doesn't 404, but
 * it no longer sends anything. Wire your own channel (email / web-push) here
 * if you want real notifications.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    pushed: false,
    note: "notifications disabled in self-hosted mode",
  });
}
