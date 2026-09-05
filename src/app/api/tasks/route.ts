import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getTasksByUser,
  createTask,
  getTasksWithSubtasksByUser,
} from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const withSubtasks = request.nextUrl.searchParams.get("withSubtasks") === "1";
  if (withSubtasks) {
    const data = await getTasksWithSubtasksByUser(auth.user.id);
    return NextResponse.json(data);
  }

  const userTasks = await getTasksByUser(auth.user.id);
  return NextResponse.json(userTasks);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // 限流：防止高频创建任务刷量（每用户每分钟最多 30 个）
  const limited = enforceRateLimit(`tasks:create:${auth.user.id}`, 30, 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  // 限长：防止超大字符串撑爆数据库 / 放大后续 AI token 成本
  const MAX_TITLE_LEN = 500;
  if (title.length > MAX_TITLE_LEN) {
    return NextResponse.json(
      { error: `title too long (max ${MAX_TITLE_LEN})` },
      { status: 400 },
    );
  }

  const task = await createTask(auth.user.id, title);
  return NextResponse.json(task, { status: 201 });
}
