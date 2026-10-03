import { NextResponse } from "next/server";

export class AccountError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountError) return NextResponse.json({ error: error.message }, { status: error.status });
  const e = error as { code?: string; cause?: { code?: string } };
  if (e.code === "23505" || e.cause?.code === "23505") {
    return NextResponse.json({ error: "邮箱或观猹账号已关联其他账号，请使用绑定旧账号" }, { status: 409 });
  }
  console.error("[account] operation failed", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 503 });
}
