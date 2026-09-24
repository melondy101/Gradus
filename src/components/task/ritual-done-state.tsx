"use client";

import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/eyebrow";
import { GradusLogo } from "@/components/ui/gradus-logo";

interface RitualDoneStateProps {
  goal: string;
  /** 有回调时把主按钮接回宿主页面（今日面板） */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * 屏三弹层成功态：顶点黄圈 + 标题 + 说明 + mono 汇总 + 主按钮。
 * 汇总行只写本组件真实持有的信息（目标原文与阶段链），不编造子任务与资源计数。
 */
export function RitualDoneState({ goal, actionLabel, onAction }: RitualDoneStateProps) {
  return (
    <div className="flex flex-col items-center gap-3.5 text-center">
      <span className="grid size-[78px] place-items-center rounded-full border border-accent-deep bg-[rgba(245,197,24,.16)]">
        <GradusLogo size={21} />
      </span>
      <h4 className="text-[24px] leading-[38px] font-black">计划已生成</h4>
      <p className="max-w-[380px] text-[14px] leading-[23px] text-text-2">
        四个阶段跑完，子任务已按 Bloom 层级递进排入日程；回到今日面板即可查看排期与资源。
      </p>
      <Mono className="text-micro text-text-3">
        目标「{goal}」 · INTENT → RESOURCE → PLAN → VALIDATE
      </Mono>
      {onAction ? (
        <Button className="mt-2" onClick={onAction}>
          {actionLabel ?? "完成"}
        </Button>
      ) : (
        <Link href="/app" className={buttonVariants({ className: "mt-2" })}>
          回到今日面板
        </Link>
      )}
    </div>
  );
}
