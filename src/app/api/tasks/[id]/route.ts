import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getTaskById,
  getSubtasksByTask,
  deleteTask,
  updateTaskStatus,
} from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const task = await getTaskById(id);
  if (!task || task.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subtasks = await getSubtasksByTask(id);
  return NextResponse.json({ ...task, subtasks });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // 限流：写操作防刷（每用户每分钟最多 60 次）
  const limited = enforceRateLimit(`tasks:update:${auth.user.id}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;
  const task = await getTaskById(id);
  if (!task || task.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  // 白名单校验：只接受已知合法状态，拒绝任意字符串写入
  const ALLOWED_STATUS = ["active", "done"] as const;
  if (typeof body.status === "string") {
    if (!ALLOWED_STATUS.includes(body.status as (typeof ALLOWED_STATUS)[number])) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    await updateTaskStatus(id, body.status);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // 限流：删除防刷（每用户每分钟最多 60 次）
  const limited = enforceRateLimit(`tasks:delete:${auth.user.id}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;
  const task = await getTaskById(id);
  if (!task || task.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
