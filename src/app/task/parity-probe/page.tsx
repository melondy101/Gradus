import type { Metadata } from "next";
import { TaskDetailProbe } from "./probe";

export const metadata: Metadata = {
  title: "屏二/屏三设计对等探针",
  robots: "noindex,nofollow",
};

interface Props {
  searchParams: Promise<{ ritual?: string; overlay?: string }>;
}

/**
 * 固定样例渲染屏二（无参数）、屏三 AI 弹层（?ritual=plan|done）与
 * 另外三个浮层（?overlay=delete|milestone|congrats），
 * 供 scripts/design-audit.mjs、design-parity.mjs、modal-probe.mjs 实测。
 * 这些都是纯展示组件（状态全由 props 推导，自身不发请求），
 * 所以不必真跑流水线、真删任务、真升到级也能量。
 */
export default async function TaskParityProbePage({ searchParams }: Props) {
  const { ritual, overlay } = await searchParams;
  return <TaskDetailProbe ritual={ritual ?? null} overlay={overlay ?? null} />;
}
