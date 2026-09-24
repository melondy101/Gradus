"use client";

/**
 * 通用二次确认 —— 屏三弹层语言（§3），基于 <Modal> 的 confirm/danger 层。
 * 取代原生 confirm()：destructive 走删除计划同款的红图标 + 警示眉题 + 取消/确认底栏。
 */

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  hint?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** destructive 默认走 danger 层（压住 AI 流水线遮罩），普通确认为 confirm 层 */
  layer?: "confirm" | "danger";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  hint,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  layer,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      layer={layer ?? (destructive ? "danger" : "confirm")}
      width={420}
      role="alertdialog"
      aria-label={title}
      icon={
        <span
          className={
            destructive
              ? "grid size-[34px] flex-none place-items-center rounded-field border border-error/20 bg-error/10 text-error"
              : "grid size-[34px] flex-none place-items-center rounded-field border border-warning/20 bg-warning-soft text-warning"
          }
        >
          <AlertTriangle size={17} />
        </span>
      }
      title={title}
      eyebrow={destructive ? "CONFIRM · 不可逆操作" : "CONFIRM"}
      bodyClassName="flex flex-col gap-3.5"
      footer={
        <>
          <Mono className="text-text-3">{hint ?? " "}</Mono>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              size="sm"
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </>
      }
    >
      {message ? (
        <p className="text-body leading-[1.7] text-text-2">{message}</p>
      ) : null}
    </Modal>
  );
}
