"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "@/lib/api/request";
import { getLevel, getNextLevel, getLevelProgress, type Level } from "@/lib/growth";
import { Flame, CheckCircle2, Calendar, Target, Award, Share2 } from "lucide-react";

interface Stats {
  streak: number;
  todayCount: number;
  weekCount: number;
  totalCompleted: number;
  activeTaskCount: number;
  learnDays: number;
  totalGoals: number;
}

interface Props {
  refreshTick?: number;
  pending?: number;
  title?: string;
  onOpenShareModal?: (stats: Stats) => void;
}

/**
 * 学习成就条 (Warm Precision Horizontal Strip of Pills)
 * 🔥 7 day streak | ✓ 3 today | ✓ 12 this week | ✓ 48 total | 📚 5 remaining
 */
export function AchievementPanel({ refreshTick = 0, pending = 0, onOpenShareModal }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await request("/api/user/stats");
        if (active && res.ok) {
          const data = (await res.json()) as Stats;
          if (active) setStats(data);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  if (!stats) return null;

  const { streak, todayCount, weekCount, totalCompleted, activeTaskCount } = stats;
  const weekGoal = Math.max(activeTaskCount * 3, 5);

  return (
    <div
      className="canvas-scroll flex items-center gap-2 overflow-x-auto py-2 px-4 sm:px-6"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      {/* 连续打卡 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: streak >= 3 ? "var(--warning-soft)" : "var(--secondary)",
          border: `1px solid ${streak >= 3 ? "var(--warning)" : "var(--border)"}`,
          color: streak >= 3 ? "var(--warning)" : "var(--foreground)",
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <Flame size={14} />
        <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{streak}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>天连续专注</span>
      </div>

      {/* 今日完成 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: todayCount > 0 ? "var(--success-soft)" : "var(--secondary)",
          border: `1px solid ${todayCount > 0 ? "var(--success)" : "var(--border)"}`,
          color: todayCount > 0 ? "var(--success)" : "var(--foreground)",
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={14} />
        <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{todayCount}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>今日完成</span>
      </div>

      {/* 本周进度 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--secondary)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <Calendar size={14} style={{ color: "var(--muted-foreground)" }} />
        <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
          {weekCount} / {weekGoal}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>本周达成</span>
      </div>

      {/* 累计阶梯 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--secondary)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <Award size={14} style={{ color: "var(--accent)" }} />
        <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{totalCompleted}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>累计拾级</span>
      </div>

      {/* 待完成总数 */}
      {pending > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            borderRadius: 99,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <Target size={14} />
          <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{pending}</span>
          <span style={{ fontSize: 11, fontWeight: 500 }}>待冲刺</span>
        </div>
      )}

      {/* 生成学习周报与海报按钮 */}
      {onOpenShareModal && (
        <button
          onClick={() => onOpenShareModal(stats)}
          title="生成精美学习周报 / 阶梯结业海报长图"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "var(--secondary)",
            border: "1px dashed var(--accent)",
            color: "var(--accent)",
            borderRadius: 99,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: "pointer",
            marginLeft: "auto",
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-soft)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--secondary)";
          }}
        >
          <Share2 size={13} />
          <span>生成学习周报海报</span>
        </button>
      )}
    </div>
  );
}

/**
 * 等级徽章 (LevelBadge)
 */
export function LevelBadge({ refreshTick = 0 }: { refreshTick?: number }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await request("/api/user/stats");
        if (alive && res.ok) {
          const data = (await res.json()) as Stats;
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

  const total = stats.totalCompleted;
  const level: Level = getLevel(total);
  const next = getNextLevel(total);
  const prog = getLevelProgress(total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--secondary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "4px 10px 4px 6px",
        maxWidth: 260,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          flexShrink: 0,
          background: "var(--card)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
        }}
      >
        {level.icon}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--foreground)",
          fontFamily: "var(--font-outfit), sans-serif",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Lv.{level.name}
      </span>
      <div style={{ flex: 1, minWidth: 50 }}>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.round(prog.pct * 100)}%`,
              height: "100%",
              background: "var(--accent)",
              borderRadius: 2,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 9,
            color: "var(--muted-foreground)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          {next
            ? t("achievement.toNextLevel", { count: prog.need - prog.done, name: next.name })
            : t("achievement.maxLevel")}
        </div>
      </div>
    </div>
  );
}
