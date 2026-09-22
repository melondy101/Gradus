"use client";

/**
 * 删除学习计划的安全二次确认 —— 屏三弹层语言（§3），走 <Modal layer="danger">。
 * 破坏性操作用 <Button variant="destructive">，风险条用语义 warning 令牌，
 * 不再自造遮罩/圆角/投影与 #FFFFFF 字色。
 */

import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";

interface DeletePlanModalProps {
  isOpen: boolean;
  taskTitle: string;
  subtaskCount?: number;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePlanModal({
  isOpen,
  taskTitle,
  subtaskCount,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeletePlanModalProps) {
  const close = () => {
    if (!isDeleting) onCancel();
  };

  return (
    <Modal
      open={isOpen}
      onClose={close}
      layer="danger"
      width={420}
      role="alertdialog"
      aria-label="确认删除该学习计划"
      icon={
        <span className="grid size-[34px] flex-none place-items-center rounded-field border border-error/20 bg-error/10 text-error">
          <Trash2 size={17} />
        </span>
      }
      title="确认删除该学习计划？"
      eyebrow="DELETE · 不可逆操作"
      bodyClassName="flex flex-col gap-3.5"
      footer={
        <>
          <Mono className="text-text-3">删除后进度与资源不再可恢复</Mono>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" disabled={isDeleting} onClick={onCancel}>
              取消
            </Button>
            <Button variant="destructive" size="sm" disabled={isDeleting} onClick={onConfirm}>
              {isDeleting ? "正在删除…" : "确认删除"}
            </Button>
          </div>
        </>
      }
    >
      <p className="text-[13.5px] leading-[1.7] text-text-2">
        您即将删除计划{" "}
        <strong className="text-ink [word-break:break-all]">「{taskTitle || "未命名计划"}」</strong>
        。
        {typeof subtaskCount === "number" && subtaskCount > 0
          ? `该计划下的 ${subtaskCount} 个子任务、认知阶梯与学习资源都将被永久移除。`
          : "该计划的所有分析数据与进度将被永久移除。"}
      </p>

      <div className="flex items-center gap-2 rounded-field border border-warning/20 bg-warning-soft px-3 py-2 text-[12px] text-warning">
        <AlertTriangle size={15} className="flex-none" />
        <span>此操作不可逆，删除后无法恢复已有的学习进度。</span>
      </div>
    </Modal>
  );
}
