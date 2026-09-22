"use client";

/**
 * 里程碑等级解锁弹窗 —— 屏三弹层语言（§3）：走 <Modal layer="milestone"> 的
 * 45% 墨遮罩 + radius 20 白卡 + 页头/主体/底栏，不再自造渐变彩带与主题色。
 * growth.ts 的 level.color 是前品牌六色，品牌规范（§1.2）下等级叙事只靠
 * 点缀黄 + 线性图标表达；图标复用 level-badge 里已有的门槛映射。
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";
import type { Level } from "@/lib/growth";
import { LEVEL_ICONS } from "./level-badge";

const AUTO_CLOSE_MS = 4200;

export function MilestoneUnlockModal({
  level,
  onClose,
}: {
  level: Level;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const Glyph =
    LEVEL_ICONS.find((x) => level.threshold >= x.threshold)?.Icon ?? TrendingUp;

  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      layer="milestone"
      width={340}
      aria-label={t("milestone.ariaLabel")}
      className="text-center"
      icon={
        <span className="grid size-[34px] flex-none place-items-center rounded-field border border-accent-deep bg-accent-soft text-accent-ink">
          <Glyph size={17} />
        </span>
      }
      title={t("milestone.level", { name: level.name })}
      eyebrow={`LEVEL UP · 累计完成 ${level.threshold}`}
      bodyClassName="px-6 py-4"
      footer={
        <>
          <Mono className="text-text-3">
            {t("milestone.reached", { threshold: level.threshold })}
          </Mono>
          <Button size="sm" onClick={onClose}>
            {t("milestone.keepGoing")}
          </Button>
        </>
      }
    >
      <p className="text-[13.5px] leading-[1.7] text-text-2">{t("milestone.encourage")}</p>
    </Modal>
  );
}
