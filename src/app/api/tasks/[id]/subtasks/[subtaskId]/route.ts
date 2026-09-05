import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTaskById, toggleSubtask, postponeSubtask } from "@/lib/db/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // 限流：子任务勾选/顺延为高频操作，给宽松额度（每用户每分钟 120 次）
  const limited = enforceRateLimit(`subtask:update:${auth.user.id}`, 120, 60_000);
  if (limited) return limited;

  const { id, subtaskId } = await params;
  const task = await getTaskById(id);
  if (!task || task.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // 调整排期：postpone 延后一天 / unpostpone 撤销延后
  if (body.action === "postpone" || body.action === "unpostpone") {
    const delta = body.action === "unpostpone" ? -1 : 1;
    const startDay = await postponeSubtask(subtaskId, id, delta);
    if (startDay === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, startDay });
  }

  const completed = Boolean(body.completed);
  await toggleSubtask(subtaskId, completed, id);
  return NextResponse.json({ ok: true });
}
