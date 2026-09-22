"use client";

import Link from "next/link";
import { Check, RotateCcw, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

interface TaskDetailHeaderProps {
  /** task.status：active / done / draft */
  status: string;
  title: string;
  /** 标题下的 mono 元信息：子任务数 · 起止 · 主题 */
  meta: string;
  onMarkDone: () => void;
  onReopen: () => void;
}

const EYEBROW: Record<string, string> = {
  done: "Task · 已完成",
  draft: "Task · 待规划",
};

/**
 * 屏二页头组：眉题 + 大标题（黄色句号）+ mono 元信息，
 * 右侧「AI 重新规划」描边药丸与「标记完成」墨色药丸（§1.4 次/主按钮）。
 * `[&>span]` 把 <Heading accentDot> 的句号收回顾点尺寸（.28em）。
 */
export function TaskDetailHeader({
  status,
  title,
  meta,
  onMarkDone,
  onReopen,
}: TaskDetailHeaderProps) {
  const done = status === "done";

  return (
    <header className="mb-3.5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5">
      <div className="min-w-0 flex-1">
        <Eyebrow>{EYEBROW[status] ?? "Task · 进行中"}</Eyebrow>
        <Heading
          level={2}
          spec="page"
          accentDot
          className="mt-2 min-w-0 [&>span]:ml-[.06em] [&>span]:size-[.28em]"
        >
          {title}
        </Heading>
        <Mono className="mt-1.5 block break-words text-text-3">{meta}</Mono>
      </div>
      <div className="flex flex-none items-center gap-2.5">
        {/* 重新规划走今日面板的 AI 流水线（规划状态与弹窗都在那里） */}
        <Link
          href="/app"
          title="回到今日面板重新发起 AI 规划"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Sparkles size={14} />
          AI 重新规划
        </Link>
        {done ? (
          <Button size="sm" onClick={onReopen}>
            <RotateCcw size={14} />
            重新开启
          </Button>
        ) : (
          <Button size="sm" onClick={onMarkDone}>
            <Check size={14} />
            标记完成
          </Button>
        )}
      </div>
    </header>
  );
}
