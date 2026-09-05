import { cookies } from "next/headers";
import { readSessionCookieFromRequest } from "./cookie";
import { verifySession } from "./jwt";
import { getUserById } from "@/lib/db/queries";

/**
 * 解析"当前请求的用户"。
 *
 * 流程：cookie → JWT 校验 → 查 users 表（确认用户仍存在）。
 *
 * 设计取舍：
 *   - 即使 JWT 合法，也要查 users 表确认 userId 仍存在——防止账号被管理员
 *     删除后旧 token 仍能登入。
 *   - 失败一律返回 null，不抛 —— 调用方决定如何处理（401 / 临时账号）。
 *   - 只返回展示需要的最小字段（id, name, email）；avatarUrl / passwordHash
 *     等私有字段由专门的 API 返回，避免泄漏到根布局。
 */

export interface CurrentUserView {
  id: string;
  name: string;
  email: string;
}

/**
 * API 路由 handler 入口：从 Request 中解析 user（拿到 Request 后调用）。
 */
export async function getCurrentUserFromRequest(
  request: Request,
): Promise<CurrentUserView | null> {
  const token = readSessionCookieFromRequest(request);
  if (!token) return null;

  const decoded = await verifySession(token);
  if (!decoded) return null;

  const user = await getUserById(decoded.sub);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name ?? decoded.name ?? "",
    email: user.email ?? decoded.email ?? "",
  };
}

/**
 * RSC / 根布局入口：直接读 next/headers 的 cookie store。
 *
 * 不再需要构造一个假 Request —— Next.js 已经把 cookie 通过
 * `cookies()` 暴露给服务端组件。
 */
export async function getCurrentUser(): Promise<CurrentUserView | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("__Host-session")?.value;
  if (!token) return null;

  const decoded = await verifySession(token);
  if (!decoded) return null;

  const user = await getUserById(decoded.sub);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name ?? decoded.name ?? "",
    email: user.email ?? decoded.email ?? "",
  };
}