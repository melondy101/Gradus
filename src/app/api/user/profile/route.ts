import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateUser } from "@/lib/db/queries";

function profileView(user: {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  watchaOpenId: string | null;
  membershipTier: string;
  membershipExpiresAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    avatarUrl: user.avatarUrl,
    watchaBound: Boolean(user.watchaOpenId),
    membershipTier: user.membershipTier,
    membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
  };
}

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

  return NextResponse.json({ ok: true, user: profileView(user) });
}

/** 更新当前用户自己的展示资料；不可修改 email、会员资格或第三方绑定。 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ ok: false, error: "显示名称需为 1 到 80 个字符" }, { status: 400 });
  }

  const user = await updateUser(auth.userId, { name });
  if (!user) {
    return NextResponse.json({ ok: false, error: "账号不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, user: profileView(user) });
}
