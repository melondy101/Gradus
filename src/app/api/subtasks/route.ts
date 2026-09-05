import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSubtasksWithTaskByUser } from "@/lib/db/queries";

/** GET /api/subtasks — 返回当前用户所有子任务（附带所属大任务信息） */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const items = await getSubtasksWithTaskByUser(auth.user.id);
  return NextResponse.json(items);
}
