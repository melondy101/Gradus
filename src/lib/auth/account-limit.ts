import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./ratelimit";

export async function accountLimit(request: Request) {
  const rate = await checkRateLimit(getClientIp(request), "login");
  return rate.allowed ? null : NextResponse.json({ error: "操作过于频繁，请稍后重试" }, { status: 429 });
}
