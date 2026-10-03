import { NextResponse } from "next/server";
import type { User } from "@/lib/db/schema";
import { buildSetSessionCookie } from "./cookie";
import { signSession } from "./jwt";
import { userView } from "./user-view";

export async function accountResponse(user: User) {
  const response = NextResponse.json({ ok: true, user: userView(user) });
  response.headers.append("set-cookie", buildSetSessionCookie(await signSession({
    sub: user.id, email: user.email ?? "", name: user.name ?? "", version: user.sessionVersion,
  })));
  return response;
}
