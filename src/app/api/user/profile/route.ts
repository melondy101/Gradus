import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/user/profile
 *
 * Self-hosted mode: profile 信息已经在根布局 RSC 阶段被注入客户端，本路由
 * 主要供客户端组件"二次拉取"（例如刷新页面或登录态变更）。底层走
 * `requireAuth` 解出当前用户后直接返回。
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
}