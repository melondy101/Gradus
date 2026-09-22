import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getTasksByUser,
  createTask,
  getTasksWithSubtasksByUser,
} from "@/lib/db/queries";
import { checkTaskCreationQuota, checkTaskOpQuota, incrementTaskOpUsage } from "@/lib/membership/quota";
import { parseTaskTags } from "@/lib/task-tags";

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

  // 1. 会员等级与任务容量校验（普通用户最多同时拥有 2 个任务）
  const taskQuota = await checkTaskCreationQuota(auth.user.id);
  if (!taskQuota.allowed) {
    return NextResponse.json(
      {
        error: taskQuota.reason || "任务创建数量已达当前会员等级上限",
        code: "TASK_LIMIT_REACHED",
        current: taskQuota.current,
        limit: taskQuota.limit,
        tier: taskQuota.tier,
      },
      { status: 403 }
    );
  }

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

  const tags = parseTaskTags((body as { tags?: unknown }).tags);

  // 2. 只读校验；创建真正成功后才会递增操作记录。
  const taskOpQuota = await checkTaskOpQuota(auth.user.id, "create");
  if (!taskOpQuota.allowed) {
    return NextResponse.json(
      {
        error: taskOpQuota.reason || "今日新建与删除任务操作已达上限",
        code: "TASK_OP_LIMIT_REACHED",
        current: taskOpQuota.current,
        limit: taskOpQuota.limit,
        tier: taskOpQuota.tier,
      },
      { status: 403 }
    );
  }

  try {
    const task = await createTask(auth.user.id, title, tags);
    await incrementTaskOpUsage(auth.user.id);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[api/tasks] createTask failed with DB error:", err);
    return NextResponse.json(
      {
        error: "任务创建失败，数据库服务异常，请稍后重试",
        debug: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
