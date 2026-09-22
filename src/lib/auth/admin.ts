import { NextResponse } from "next/server";
import { requireAuth, type AuthResult } from "./index";
import type { User } from "@/lib/db/schema";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(ADMIN_EMAIL && email?.trim().toLowerCase() === ADMIN_EMAIL);
}

export function isAdminUser(user?: { email?: string | null } | null): boolean {
  return isAdminEmail(user?.email);
}

/**
 * 服务端 API 鉴权拦截器：仅允许系统管理员访问
 */
export async function requireAdmin(
  request: Request
): Promise<
  | { ok: true; user: User; userId: string }
  | { ok: false; response: NextResponse }
> {
  const auth: AuthResult = await requireAuth(request);
  if (!auth.ok) {
    return { ok: false, response: auth.response as unknown as NextResponse };
  }

  if (!isAdminEmail(auth.user.email)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "权限不足：当前操作仅限管理员账号访问",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: auth.user, userId: auth.userId };
}
