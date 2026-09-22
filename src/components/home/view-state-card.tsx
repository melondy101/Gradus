"use client";

/**
 * 视图级状态卡（加载失败 / 还没有数据）。两种状态共用一张白卡的形状，
 * 按钮一律走 <Button> 的 default / 主按钮语言，不引入新色板。
 */

import { CircleAlert, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

interface Props {
  kind: "error" | "empty";
  onRetry?: () => void;
}

const COPY = {
  error: {
    eyebrow: "CONNECTION",
    title: "数据加载遇到异常",
    body: "请检查网络后重新加载；已保存的计划不会因一次请求失败而丢失。",
    action: "重新加载",
  },
  empty: {
    eyebrow: "FIRST GOAL",
    title: "还没有排期中的子任务",
    body: "在上方输入一个学习目标，AI 会拆解为带认知梯度与权威资源的可行阶梯。",
    action: null,
  },
} as const;

export function ViewStateCard({ kind, onRetry }: Props) {
  const copy = COPY[kind];
  const isError = kind === "error";

  return (
    <Card className="gap-0 px-6 py-[28px] text-center">
      <Eyebrow className="mb-2.5">{copy.eyebrow}</Eyebrow>
      <span
        className={cn(
          "mx-auto mb-3 grid size-[46px] place-items-center rounded-field border",
          isError
            ? "border-bd-card bg-cream text-error"
            : "border-accent-deep bg-accent-soft text-accent-ink"
        )}
      >
        {isError ? <CircleAlert size={22} /> : <Sprout size={22} />}
      </span>
      <h3 className="text-[17px] font-black text-ink">{copy.title}</h3>
      <p className="mt-1.5 text-[13px] leading-[1.7] text-text-2">{copy.body}</p>
      {copy.action && onRetry && (
        <Button className="mt-3.5" size="sm" onClick={onRetry}>
          {copy.action}
        </Button>
      )}
    </Card>
  );
}
