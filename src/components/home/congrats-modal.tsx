"use client";

// ─── CongratulationsModal ─────────────────────────────────────────────
// 弹出时机：某个大任务下所有子任务全部勾选完成。
// 视觉走设计稿的完成态（§3 `.modal--done` + `.done-in`）：78px 点缀黄圆环里放
// 台阶标识，标题 24/900，正文 14/23 居中，主操作收在 <Modal> 底栏。

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { useTranslation } from "react-i18next";

import { Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { Mono } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";

export interface CongratsData {
  taskTitle: string;
  taskId: string;
  subtasks: SubtaskWithTask[];
}

interface Props {
  data: CongratsData;
  onClose: () => void;
  onLearnMore: (taskId: string) => void;
  onGenerateCertificate?: (data: CongratsData) => void;
}

export function CongratulationsModal({
  data,
  onClose,
  onLearnMore,
  onGenerateCertificate,
}: Props) {
  const { t } = useTranslation();
  const totalDays = data.subtasks.reduce((sum, s) => sum + s.durationDays, 0);

  return (
    <Modal
      open
      onClose={onClose}
      layer="confirm"
      width={460}
      aria-label={t("congrats.title")}
      className="text-center"
      bodyClassName="flex flex-col items-center gap-4 px-10 py-10"
      footer={
        <>
          <Mono className="text-text-3">
            {data.subtasks.length} 个子任务 · 累计 {totalDays} 天
          </Mono>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t("congrats.close")}
            </Button>
            {onGenerateCertificate && (
              <Button size="sm" onClick={() => onGenerateCertificate(data)}>
                <Trophy size={13} />
                <span>生成结业证书</span>
              </Button>
            )}
          </div>
        </>
      }
    >
      <span className="grid size-[78px] place-items-center rounded-full border border-accent-deep bg-accent-soft text-ink">
        <GradusLogo size={44} showText={false} />
      </span>

      <div>
        <h3 className="text-[24px] leading-tight font-black tracking-[-.03em]">
          {t("congrats.title")}
        </h3>
        <p className="mt-1.5 text-[16px] font-bold tracking-[-.02em] text-accent-ink">
          「{data.taskTitle}」
        </p>
      </div>

      <div className="w-full rounded-field bg-cream-light px-4 py-3.5 text-left">
        <div className="mb-2.5 text-body font-semibold text-success">
          {t("congrats.learned")}
        </div>
        <ul className="flex flex-col gap-1.5">
          {data.subtasks.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <Check size={13} className="mt-0.5 shrink-0 text-success" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium text-ink">{s.title}</span>
                {s.description && (
                  <span className="mt-0.5 block text-caption leading-snug text-text-2">
                    {s.description}
                  </span>
                )}
              </span>
              <Mono className="shrink-0 text-micro text-text-3">
                {t("congrats.days", { count: s.durationDays })}
              </Mono>
            </li>
          ))}
        </ul>
      </div>

      {data.subtasks[0]?.topic && (
        <span className="rounded-pill border border-accent-deep bg-accent-soft px-3 py-1 text-caption font-semibold text-accent-ink">
          {t("congrats.topic", { topic: data.subtasks[0].topic })}
        </span>
      )}

      <Button variant="link" size="xs" onClick={() => onLearnMore(data.taskId)}>
        {t("congrats.learnMore")}
      </Button>
    </Modal>
  );
}
