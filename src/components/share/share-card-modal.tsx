"use client";

import React, { useState, useRef, useCallback } from "react";
import { toPng, toBlob } from "html-to-image";
import {
  Download,
  Copy,
  Check,
  Share2,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  Award,
  Zap,
} from "lucide-react";
import type { Subtask } from "@/lib/db/schema";
import type { Level } from "@/lib/growth";
import { BLOOM_CONFIG } from "@/lib/design-tokens";
import { Modal } from "@/components/ui/modal";

export interface ShareData {
  type: "certificate" | "weekly_report" | "milestone" | "report";
  userName?: string;
  userAvatar?: string;
  taskTitle?: string;
  subtasks?: Subtask[];
  totalDays?: number;
  level?: Level;
  streakDays?: number;
  completedSubtasksCount?: number;
  totalSubtasksCount?: number;
  deepWorkHours?: number;
  recentTasks?: Array<{
    title: string;
    completedCount: number;
    totalCount: number;
  }>;
  quote?: string;
  stats?: {
    streak: number;
    todayCount: number;
    weekCount: number;
    totalCompleted: number;
    activeTaskCount: number;
    learnDays?: number;
  };
}

interface ShareCardModalProps {
  isOpen?: boolean;
  onClose: () => void;
  data: ShareData;
}

// 布鲁姆阶梯进度条配色（沿用分享卡原有色板，仅数值改为真实统计）
const BLOOM_BAR_COLORS: Record<number, string> = {
  6: "#EC4899",
  5: "#F97316",
  4: "#FBBF24",
  3: "#34D399",
  2: "#60A5FA",
  1: "#94A3B8",
};

export function ShareCardModal({
  isOpen = true,
  onClose,
  data,
}: ShareCardModalProps) {
  const [activeTab, setActiveTab] = useState<"certificate" | "weekly_report">(
    data.type === "certificate" ? "certificate" : "weekly_report",
  );
  const [theme, setTheme] = useState<"ivory" | "obsidian">("ivory");
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // 计算证书数据
  const subtasks = data.subtasks || [];
  const completedCount =
    data.completedSubtasksCount ?? subtasks.filter((s) => s.completed).length;
  const totalSubtasks =
    data.totalSubtasksCount ?? (subtasks.length || completedCount || 1);
  // 只用持久化字段推导；没有真实数据就让调用方传 undefined，对应区块隐藏而不是编造
  const deepWorkHours = data.deepWorkHours;
  const bloomLevels = subtasks
    .map((s) => s.bloomLevel)
    .filter((l): l is number => typeof l === "number" && l >= 1 && l <= 6);
  const bloomMax = bloomLevels.length ? Math.max(...bloomLevels) : null;
  const bloomRows = [6, 5, 4, 3, 2, 1]
    .map((lvl) => {
      const at = subtasks.filter((s) => s.bloomLevel === lvl);
      const done = at.filter((s) => s.completed).length;
      return {
        lvl,
        total: at.length,
        pct: at.length ? Math.round((done / at.length) * 100) : 0,
        label: `L${lvl} ${BLOOM_CONFIG[lvl as keyof typeof BLOOM_CONFIG].name}`,
        color: BLOOM_BAR_COLORS[lvl],
      };
    })
    .filter((r) => r.total > 0);

  // 认证防伪编号
  const [certId] = useState(() => {
    const seed = Date.now().toString(36).toUpperCase().slice(-5);
    return `GRD-${new Date().getFullYear()}-${seed}`;
  });

  const todayStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // 复制图片到剪贴板
  const handleCopyImage = useCallback(async () => {
    if (!cardRef.current) return;
    setCopying(true);
    setErrorMsg(null);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });
      if (!blob) throw new Error("生成图片失败");

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ "image/png": blob }),
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
      } else {
        throw new Error("浏览器不支持直接复制图片，请使用下载");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "复制失败，请点击下载保存",
      );
    } finally {
      setCopying(false);
    }
  }, []);

  // 下载高清 PNG
  const handleDownloadImage = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    setErrorMsg(null);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      const filename =
        activeTab === "certificate"
          ? `拾级_结业证书_${data.taskTitle || "自主学习"}.png`
          : `拾级_学习周报_${todayStr.replace(/\//g, "-")}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      setErrorMsg("下载图片失败，请重试");
    } finally {
      setDownloading(false);
    }
  }, [activeTab, data.taskTitle, todayStr]);

  const isDark = theme === "obsidian";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      layer="milestone"
      width="min(680px, 94vw)"
      className="border-0"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      {/* 顶部控制栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Share2 size={15} />
          </span>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              成就海报 & 结业证书生成器
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              一键生成高颜值长图 · 适配小红书 / 朋友圈 / X
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* 模版切换 */}
          <div
            style={{
              display: "flex",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 2,
            }}
          >
            <button
              onClick={() => setActiveTab("certificate")}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background:
                  activeTab === "certificate" ? "var(--accent)" : "transparent",
                color:
                  activeTab === "certificate"
                    ? "#fff"
                    : "var(--muted-foreground)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🏆 结业证书
            </button>
            <button
              onClick={() => setActiveTab("weekly_report")}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background:
                  activeTab === "weekly_report"
                    ? "var(--accent)"
                    : "transparent",
                color:
                  activeTab === "weekly_report"
                    ? "#fff"
                    : "var(--muted-foreground)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📊 学习周报
            </button>
          </div>

          {/* 风格切换 */}
          <div
            style={{
              display: "flex",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 2,
            }}
          >
            <button
              onClick={() => setTheme("ivory")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background:
                  theme === "ivory" ? "var(--secondary)" : "transparent",
                color:
                  theme === "ivory"
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              📜 典雅象牙
            </button>
            <button
              onClick={() => setTheme("obsidian")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background:
                  theme === "obsidian" ? "var(--secondary)" : "transparent",
                color:
                  theme === "obsidian"
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              🌑 黑曜暗金
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* 卡片预览区域（居中并支持滚动） */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          background: isDark ? "#090D16" : "#F4F3EE",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* 海报本体（3:4 比例渲染节点） */}
        <div
          ref={cardRef}
          style={{
            width: 390,
            minHeight: 520,
            background: isDark
              ? "linear-gradient(160deg, #111827 0%, #0B0F19 100%)"
              : "linear-gradient(160deg, #FAF8F5 0%, #FFFFFF 100%)",
            color: isDark ? "#F3F4F6" : "#18181B",
            border: isDark ? "2px solid #2E3748" : "2px solid #E5E0D8",
            borderRadius: 20,
            padding: "24px 22px 18px",
            boxShadow: isDark
              ? "0 25px 60px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 20px 50px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.8)",
            position: "relative",
            overflow: "hidden",
            fontFamily: "var(--sans)",
          }}
        >
          {/* 装饰水印底纹 */}
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: isDark
                ? "radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(47,93,80,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* 顶栏品牌标识与证书编号 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: isDark ? "1px solid #1F2937" : "1px solid #ECE7DE",
              paddingBottom: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: isDark ? "#4F46E5" : "#2F5D50",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                级
              </span>
              <span
                style={{
                  fontFamily: "var(--sans)",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  color: isDark ? "#E0E7FF" : "#2F5D50",
                }}
              >
                GRADUS · 拾级
              </span>
            </div>

            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 600,
                color: isDark ? "#9CA3AF" : "#8A8175",
                letterSpacing: "0.02em",
              }}
            >
              {certId}
            </span>
          </div>

          {/* 内容区：结业证书模版 */}
          {activeTab === "certificate" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* 证书大标题 */}
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: isDark
                      ? "rgba(234,179,8,0.15)"
                      : "rgba(180,83,9,0.1)",
                    border: isDark
                      ? "1px solid rgba(234,179,8,0.3)"
                      : "1px solid rgba(180,83,9,0.25)",
                    borderRadius: 99,
                    padding: "3px 12px",
                    color: isDark ? "#FBBF24" : "#B45309",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  <Award size={13} />
                  <span>认知阶梯通关结业认证</span>
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-serif), 'Songti SC', serif",
                    fontSize: 21,
                    fontWeight: 800,
                    color: isDark ? "#FFFFFF" : "#18181B",
                    lineHeight: 1.3,
                    letterSpacing: "-0.02em",
                    marginTop: 2,
                  }}
                >
                  「{data.taskTitle || "自主学习规划"}」
                </div>
              </div>

              {/* 核心数据矩阵 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${
                    1 +
                    (deepWorkHours != null ? 1 : 0) +
                    (bloomMax != null ? 1 : 0)
                  }, 1fr)`,
                  gap: 8,
                  background: isDark ? "#161F30" : "#F5F2EB",
                  border: isDark ? "1px solid #243048" : "1px solid #E8E2D8",
                  borderRadius: 12,
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isDark ? "#9CA3AF" : "#71717A",
                    }}
                  >
                    完成子阶段
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isDark ? "#34D399" : "#2F5D50",
                      fontFamily: "var(--font-jetbrains), monospace",
                      marginTop: 2,
                    }}
                  >
                    {completedCount}/{totalSubtasks}
                  </div>
                </div>
                {deepWorkHours != null && (
                  <div
                    style={{
                      borderLeft: isDark
                        ? "1px solid #243048"
                        : "1px solid #E8E2D8",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: isDark ? "#9CA3AF" : "#71717A",
                      }}
                    >
                      深度专注
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: isDark ? "#818CF8" : "#4F46E5",
                        fontFamily: "var(--font-jetbrains), monospace",
                        marginTop: 2,
                      }}
                    >
                      {deepWorkHours.toFixed(1)}h
                    </div>
                  </div>
                )}
                {bloomMax != null && (
                  <div
                    style={{
                      borderLeft: isDark
                        ? "1px solid #243048"
                        : "1px solid #E8E2D8",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: isDark ? "#9CA3AF" : "#71717A",
                      }}
                    >
                      布鲁姆阶梯
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: isDark ? "#F472B6" : "#D97706",
                        fontFamily: "var(--font-jetbrains), monospace",
                        marginTop: 2,
                      }}
                    >
                      {`L1→L${bloomMax}`}
                    </div>
                  </div>
                )}
              </div>

              {/* 阶梯任务通关清单 */}
              <div
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(0,0,0,0.02)",
                  borderRadius: 12,
                  border: isDark ? "1px solid #1F2937" : "1px solid #EDE8E0",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDark ? "#9CA3AF" : "#71717A",
                    marginBottom: 6,
                  }}
                >
                  攀登轨迹 (Ascending Path)
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  {subtasks.slice(0, 4).map((s, idx) => (
                    <div
                      key={s.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11.5,
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: isDark ? "#34D399" : "#2F5D50",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </span>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: isDark ? "#E5E7EB" : "#27272A",
                            fontWeight: 500,
                          }}
                        >
                          {s.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: isDark ? "#9CA3AF" : "#71717A",
                          fontFamily: "var(--font-jetbrains), monospace",
                          flexShrink: 0,
                        }}
                      >
                        {s.durationDays}天
                      </span>
                    </div>
                  ))}
                  {subtasks.length > 4 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: isDark ? "#6B7280" : "#A1A1AA",
                        textAlign: "center",
                        marginTop: 2,
                      }}
                    >
                      及其他 {subtasks.length - 4} 个渐进认知阶段全部通关
                    </div>
                  )}
                </div>
              </div>

              {/* 底部印章与结业落款 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                  paddingTop: 10,
                  borderTop: isDark ? "1px solid #1F2937" : "1px solid #ECE7DE",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isDark ? "#9CA3AF" : "#71717A",
                    }}
                  >
                    认证日期：{todayStr}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isDark ? "#E0E7FF" : "#2F5D50",
                      marginTop: 2,
                    }}
                  >
                    通过「拾级」布鲁姆认知阶梯抗编造核查
                  </div>
                </div>

                {/* 红色印章样式 */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    border: "2px dashed #EF4444",
                    color: "#EF4444",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotate(-12deg)",
                    fontSize: 8,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: "0.05em",
                    opacity: 0.9,
                  }}
                >
                  <span>拾级认证</span>
                  <span style={{ fontSize: 7 }}>MASTER</span>
                </div>
              </div>
            </div>
          ) : (
            /* 内容区：学习周报模版 */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: isDark
                      ? "rgba(99,102,241,0.15)"
                      : "rgba(79,70,229,0.08)",
                    border: isDark
                      ? "1px solid rgba(99,102,241,0.3)"
                      : "1px solid rgba(79,70,229,0.2)",
                    borderRadius: 99,
                    padding: "3px 12px",
                    color: isDark ? "#A5B4FC" : "#4F46E5",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  <Calendar size={13} />
                  <span>自主学习进阶周报</span>
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: isDark ? "#FFFFFF" : "#18181B",
                    letterSpacing: "-0.02em",
                  }}
                >
                  认知攀登 · 本周学习档案
                </div>
              </div>

              {/* 4 维核心指标 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    background: isDark ? "#161F30" : "#F5F2EB",
                    border: isDark ? "1px solid #243048" : "1px solid #E8E2D8",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: isDark ? "#F87171" : "#DC2626",
                      fontWeight: 600,
                    }}
                  >
                    <Flame size={14} />
                    <span>连续专注</span>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: isDark ? "#FFFFFF" : "#18181B",
                      fontFamily: "var(--font-jetbrains), monospace",
                      marginTop: 4,
                    }}
                  >
                    {data.stats?.streak ?? 0}
                    <span
                      style={{ fontSize: 11, fontWeight: 500, marginLeft: 3 }}
                    >
                      天
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: isDark ? "#161F30" : "#F5F2EB",
                    border: isDark ? "1px solid #243048" : "1px solid #E8E2D8",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: isDark ? "#34D399" : "#16A34A",
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>本周达成</span>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: isDark ? "#FFFFFF" : "#18181B",
                      fontFamily: "var(--font-jetbrains), monospace",
                      marginTop: 4,
                    }}
                  >
                    {data.stats?.weekCount ?? 0}
                    <span
                      style={{ fontSize: 11, fontWeight: 500, marginLeft: 3 }}
                    >
                      个任务
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: isDark ? "#161F30" : "#F5F2EB",
                    border: isDark ? "1px solid #243048" : "1px solid #E8E2D8",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: isDark ? "#818CF8" : "#4F46E5",
                      fontWeight: 600,
                    }}
                  >
                    <Clock size={14} />
                    <span>累计通关</span>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: isDark ? "#FFFFFF" : "#18181B",
                      fontFamily: "var(--font-jetbrains), monospace",
                      marginTop: 4,
                    }}
                  >
                    {data.stats?.totalCompleted ?? 0}
                    <span
                      style={{ fontSize: 11, fontWeight: 500, marginLeft: 3 }}
                    >
                      阶段
                    </span>
                  </div>
                </div>

                {data.level && (
                  <div
                    style={{
                      background: isDark ? "#161F30" : "#F5F2EB",
                      border: isDark
                        ? "1px solid #243048"
                        : "1px solid #E8E2D8",
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: isDark ? "#FBBF24" : "#D97706",
                        fontWeight: 600,
                      }}
                    >
                      <Zap size={14} />
                      <span>认知段位</span>
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: isDark ? "#FFFFFF" : "#18181B",
                        marginTop: 6,
                      }}
                    >
                      {data.level.name}
                    </div>
                  </div>
                )}
              </div>

              {/* 布鲁姆认知阶梯结构 — 只有子任务带真实 bloomLevel 时展示，不再硬编码百分比 */}
              {bloomRows.length > 0 && (
                <div
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(0,0,0,0.02)",
                    borderRadius: 12,
                    border: isDark ? "1px solid #1F2937" : "1px solid #EDE8E0",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isDark ? "#9CA3AF" : "#71717A",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>布鲁姆认知阶梯结构</span>
                    <span style={{ fontFamily: "monospace", fontSize: 10 }}>
                      Bloom Tax.
                    </span>
                  </div>

                  {/* 阶梯条形指示器（按真实完成度） */}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    {bloomRows.map((step) => (
                      <div
                        key={step.lvl}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 78,
                            color: isDark ? "#9CA3AF" : "#52525B",
                            fontWeight: 500,
                            flexShrink: 0,
                          }}
                        >
                          {step.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            background: isDark ? "#1F2937" : "#E5E5E5",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${step.pct}%`,
                              height: "100%",
                              background: step.color,
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            width: 28,
                            textAlign: "right",
                            color: isDark ? "#9CA3AF" : "#71717A",
                            fontFamily: "monospace",
                            fontSize: 9,
                          }}
                        >
                          {step.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 科学学习箴言 */}
              <div
                style={{
                  background: isDark ? "#161F30" : "#F5F2EB",
                  borderLeft: isDark
                    ? "3px solid #6366F1"
                    : "3px solid #2F5D50",
                  padding: "8px 10px",
                  borderRadius: "0 8px 8px 0",
                  fontSize: 11,
                  color: isDark ? "#D1D5DB" : "#4B5563",
                  lineHeight: 1.4,
                  fontStyle: "italic",
                }}
              >
                “拾级而上，日拱一卒。将模糊的宏大目标拆解为每一步清晰的认知跃迁。”
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {errorMsg && (
        <div
          style={{
            padding: "8px 20px",
            background: "var(--error-soft)",
            color: "var(--error)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 底部操作栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          💡 复制图片后可直接在小红书、微信、X 对话框中按下 <kbd>Ctrl/⌘+V</kbd>{" "}
          粘贴发送
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleCopyImage}
            disabled={copying || downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--secondary)",
              color: "var(--foreground)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {copiedSuccess ? (
              <>
                <Check size={15} style={{ color: "var(--success)" }} />
                <span style={{ color: "var(--success)" }}>
                  已复制到剪贴板！
                </span>
              </>
            ) : copying ? (
              <span>生成中...</span>
            ) : (
              <>
                <Copy size={15} />
                <span>复制海报图片</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={copying || downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={15} />
            <span>{downloading ? "正在导出..." : "下载高清 PNG"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
