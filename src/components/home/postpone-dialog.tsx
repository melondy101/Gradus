"use client";

/**
 * 「延后执行任务」确认弹窗 —— 屏三弹层语言（§3：45% 墨色遮罩 + radius 20 白卡 +
 * 页头/主体/底栏三段）。用 <Modal layer="confirm"> 承载 z-index 300，
 * 与 new-task(100) / detail(200) / delete(350) / milestone(400) 的阶梯不冲突。
 */

import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Mono } from "@/components/ui/eyebrow";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface Props {
  row: SubtaskWithTask;
  onCancel: () => void;
  onConfirm: (row: SubtaskWithTask) => void;
}

export function PostponeDialog({ row, onCancel, onConfirm }: Props) {
  return (
    <Modal
      open
      onClose={onCancel}
      layer="confirm"
      width={400}
      icon={
        <span className="grid size-[34px] flex-none place-items-center rounded-field border border-accent-deep bg-accent-soft text-accent-ink">
          <CalendarClock size={17} />
        </span>
      }
      title="延后执行任务"
      eyebrow="POSTPONE · 顺延至下一个可用时间槽"
      footer={
        <>
          <Mono className="text-text-3">排期变更可随时撤销</Mono>
          <div className="flex gap-2.5">
            <Button variant="outline" size="sm" onClick={onCancel}>
              取消
            </Button>
            <Button size="sm" onClick={() => onConfirm(row)}>
              确认顺延
            </Button>
          </div>
        </>
      }
    >
      <p className="text-body leading-[1.7] text-text-2">
        确定将「<b className="text-ink">{row.title}</b>」延后 1 天执行吗？
        系统将自动智能重排接续计划。
      </p>
    </Modal>
  );
}
