"use client";

/**
 * 等级徽章（成长体系 Lv. 进度条）。
 * 从 achievement-panel.tsx 拆出：一个文件只导出一个组件（AGENTS.md §13）。
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Crown, Medal, Rocket, Sprout, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Mono } from "@/components/ui/eyebrow";
import { request } from "@/lib/api/request";
import { getLevel, getNextLevel, getLevelProgress } from "@/lib/growth";
import type { UserStats } from "./use-user-stats";

/**
 * growth.ts 的 level 不再自带 emoji，品牌规范要求界面不出现 emoji，
 * 等级叙事按门槛映射到线性图标（徽章与里程碑弹窗共用）。
 */
export const LEVEL_ICONS: Array<{ threshold: number; Icon: typeof Sprout }> = [
  { threshold: 80, Icon: Crown },
  { threshold: 40, Icon: Medal },
  { threshold: 20, Icon: Star },
  { threshold: 10, Icon: Rocket },
  { threshold: 5, Icon: BookOpen },
  { threshold: 0, Icon: Sprout },
];

export function LevelBadge({ refreshTick = 0 }: { refreshTick?: number }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await request("/api/user/stats");
        if (alive && res.ok) {
          const data = (await res.json()) as UserStats;
          if (alive) setStats(data);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [refreshTick]);

  if (!stats) return null;

  const level = getLevel(stats.totalCompleted);
  const next = getNextLevel(stats.totalCompleted);
  const prog = getLevelProgress(stats.totalCompleted);
  const Icon =
    LEVEL_ICONS.find((x) => level.threshold >= x.threshold)?.Icon ?? TrendingUp;

  return (
    <Badge state="plan" className="gap-2">
      <Icon size={13} style={{ color: "var(--accent-ink)" }} />
      <span>Lv.{level.name}</span>
      <span style={{ minWidth: 54, height: 4, borderRadius: 2, background: "var(--bd-card)", overflow: "hidden" }}>
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${Math.round(prog.pct * 100)}%`,
            background: "var(--accent)",
            transition: "width 0.5s ease",
          }}
        />
      </span>
      <Mono className="whitespace-nowrap text-[9.5px] text-text-3">
        {next
          ? t("achievement.toNextLevel", { count: prog.need - prog.done, name: next.name })
          : t("achievement.maxLevel")}
      </Mono>
    </Badge>
  );
}
