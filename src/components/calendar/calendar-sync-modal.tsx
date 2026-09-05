"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Copy,
  Check,
  Download,
  Clock,
  Sparkles,
  Laptop,
  CheckCircle2,
  HelpCircle,
  X,
} from "lucide-react";
import { getCalendarFeedInfo, type CalendarTokenResponse } from "@/lib/api/calendar";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  taskTitle?: string;
}

type ClientTab = "feishu" | "apple" | "google" | "outlook" | "qq";

export function CalendarSyncModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
}: CalendarSyncModalProps) {
  const [feedInfo, setFeedInfo] = useState<CalendarTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab>("feishu");

  // 自定义偏好设置
  const [startHour, setStartHour] = useState(20);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [includeReviews, setIncludeReviews] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const info = await getCalendarFeedInfo();
        if (!cancelled) setFeedInfo(info);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInfo();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 构造带个性化参数的订阅链接与下载链接
  const baseFeedUrl = feedInfo?.feedUrl || "";
  const queryParams = new URLSearchParams();
  if (taskId) queryParams.set("taskId", taskId);
  if (startHour !== 20) queryParams.set("startHour", String(startHour));
  if (reminderMinutes !== 15) queryParams.set("reminder", String(reminderMinutes));
  if (!includeReviews) queryParams.set("includeReviews", "0");
  if (!includeCompleted) queryParams.set("includeCompleted", "0");

  const qs = queryParams.toString();
  const dynamicFeedUrl = baseFeedUrl ? (qs ? `${baseFeedUrl}&${qs}` : baseFeedUrl) : "";
  const dynamicWebcalUrl = dynamicFeedUrl.replace(/^https?:\/\//i, "webcal://");
  const dynamicDownloadUrl = dynamicFeedUrl ? `${dynamicFeedUrl}&download=1` : "";

  const handleCopy = () => {
    if (!dynamicFeedUrl) return;
    navigator.clipboard.writeText(dynamicFeedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenWebcal = () => {
    if (dynamicWebcalUrl) {
      window.location.href = dynamicWebcalUrl;
    }
  };

  const handleDownloadIcs = () => {
    if (dynamicDownloadUrl) {
      window.open(dynamicDownloadUrl, "_blank");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--card, #ffffff)",
          color: "var(--foreground, #1e293b)",
          borderRadius: 20,
          border: "1px solid var(--border, #e2e8f0)",
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: 680,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "var(--background, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                flexShrink: 0,
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.25,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {taskId && taskTitle ? `导出计划到日历 · ${taskTitle}` : "导出与同步到系统日历"}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#059669",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  实时订阅
                </span>
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", margin: "4px 0 0 0" }}>
                支持飞书、Apple 日历、Google Calendar、Outlook 自动同步，任务更新日历即刻同步。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-foreground, #94a3b8)",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s",
            }}
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 1. 订阅链接与核心操作卡片 */}
          <div
            style={{
              background: "var(--secondary, #f1f5f9)",
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={15} style={{ color: "#4f46e5" }} />
                专属日历订阅源 (WebCal / iCal URL)
              </span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>
                客户端每隔 1~2 小时自动拉取最新排期
              </span>
            </div>

            {/* URL Display & Copy */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                readOnly
                value={loading ? "正在生成专属订阅令牌..." : dynamicFeedUrl}
                style={{
                  flex: 1,
                  background: "var(--card, #ffffff)",
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  fontFamily: "var(--font-jetbrains, monospace)",
                  color: "var(--foreground, #334155)",
                  outline: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                disabled={loading || !dynamicFeedUrl}
                style={{
                  background: copied ? "#059669" : "var(--accent, #4f46e5)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)",
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} /> 已复制链接
                  </>
                ) : (
                  <>
                    <Copy size={16} /> 复制订阅链接
                  </>
                )}
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 4 }}>
              <button
                onClick={handleOpenWebcal}
                disabled={loading || !dynamicWebcalUrl}
                style={{
                  background: "var(--card, #ffffff)",
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--foreground, #1e293b)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                title="直接调起系统默认日历软件（Apple 日历 / Outlook）"
              >
                <Laptop size={15} style={{ color: "#4f46e5" }} />
                <span>一键唤起系统日历</span>
              </button>

              <button
                onClick={handleDownloadIcs}
                disabled={loading || !dynamicDownloadUrl}
                style={{
                  background: "var(--card, #ffffff)",
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--foreground, #1e293b)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                title="下载标准 .ics 文件，离线手动导入任意日历"
              >
                <Download size={15} style={{ color: "#059669" }} />
                <span>下载 .ics 文件</span>
              </button>

              <button
                onClick={() => setShowPreferences(!showPreferences)}
                style={{
                  background: showPreferences ? "rgba(79, 70, 229, 0.08)" : "var(--card, #ffffff)",
                  border: `1px solid ${showPreferences ? "#4f46e5" : "var(--border, #cbd5e1)"}`,
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: showPreferences ? "#4f46e5" : "var(--foreground, #1e293b)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <Clock size={15} />
                <span>{showPreferences ? "收起偏好设置" : "自定义提醒与时段"}</span>
              </button>
            </div>

            {/* Custom Preferences Accordion */}
            {showPreferences && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 12,
                  borderTop: "1px dashed var(--border, #cbd5e1)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground, #334155)", display: "block", marginBottom: 4 }}>
                    每日建议学习时段:
                  </label>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(parseInt(e.target.value, 10))}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border, #cbd5e1)",
                      background: "var(--card, #ffffff)",
                      fontSize: 12,
                      color: "var(--foreground, #334155)",
                    }}
                  >
                    <option value={8}>早晨 08:00 开始</option>
                    <option value={9}>上午 09:00 开始</option>
                    <option value={14}>下午 14:00 开始</option>
                    <option value={19}>晚间 19:00 开始</option>
                    <option value={20}>黄金专注 20:00 开始 (推荐)</option>
                    <option value={21}>晚间 21:00 开始</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground, #334155)", display: "block", marginBottom: 4 }}>
                    日历提前闹钟:
                  </label>
                  <select
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border, #cbd5e1)",
                      background: "var(--card, #ffffff)",
                      fontSize: 12,
                      color: "var(--foreground, #334155)",
                    }}
                  >
                    <option value={15}>提前 15 分钟弹窗 (推荐)</option>
                    <option value={30}>提前 30 分钟</option>
                    <option value={60}>提前 1 小时</option>
                    <option value={0}>不设日历闹钟</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="pref-reviews"
                    checked={includeReviews}
                    onChange={(e) => setIncludeReviews(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label htmlFor="pref-reviews" style={{ fontSize: 12, color: "var(--foreground, #334155)", cursor: "pointer" }}>
                    同步艾宾浩斯复习提醒节点 (+2天/+7天)
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="pref-completed"
                    checked={includeCompleted}
                    onChange={(e) => setIncludeCompleted(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label htmlFor="pref-completed" style={{ fontSize: 12, color: "var(--foreground, #334155)", cursor: "pointer" }}>
                    包含已完成打卡的子任务
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 2. 手把手订阅图文教程 (Tutorials with Tabs) */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <HelpCircle size={16} style={{ color: "#06b6d4" }} />
                主流日历订阅手把手教程
              </h3>
              <span style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>
                推荐在电脑或手机上直接订阅
              </span>
            </div>

            {/* Platform Selector Tabs */}
            <div
              style={{
                display: "flex",
                gap: 6,
                borderBottom: "1px solid var(--border, #e2e8f0)",
                paddingBottom: 2,
                overflowX: "auto",
              }}
            >
              {[
                { id: "feishu", label: "🐦 飞书 (Feishu / Lark)", highlight: true },
                { id: "apple", label: "🍏 Apple 日历 (Mac/iPhone)" },
                { id: "google", label: "🌐 Google 日历" },
                { id: "outlook", label: "💼 Outlook / 微软" },
                { id: "qq", label: "🦊 QQ 邮箱 / 其它" },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ClientTab)}
                    style={{
                      background: active ? "var(--accent-soft, rgba(79, 70, 229, 0.1))" : "transparent",
                      color: active ? "var(--accent, #4f46e5)" : "var(--muted-foreground, #64748b)",
                      border: "none",
                      borderBottom: active ? "2px solid var(--accent, #4f46e5)" : "2px solid transparent",
                      borderRadius: "6px 6px 0 0",
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tutorial Content by Tab */}
            <div
              style={{
                padding: "16px",
                background: "var(--background, #f8fafc)",
                border: "1px solid var(--border, #e2e8f0)",
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
              }}
            >
              {activeTab === "feishu" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#4f46e5",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      1
                    </div>
                    <div>
                      <strong>点击上方「复制订阅链接」按钮</strong>，获得专属日历订阅地址。
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#4f46e5",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      2
                    </div>
                    <div>
                      <strong>打开飞书客户端（电脑端/手机端）</strong>，点击左侧导航栏的「<strong>日历</strong>」图标。
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#4f46e5",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      3
                    </div>
                    <div>
                      <strong>在左下角或左侧日历列表</strong>，找到「其他日历」旁的「<strong>+</strong>」加号，点击「<strong>通过 URL 订阅日历</strong>」。
                      <div style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)", marginTop: 2 }}>
                        （若在飞书手机 App 端：点击左上角头像 ➔ 设置 ➔ 日历设置 ➔ 添加已订阅日历）
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#4f46e5",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      4
                    </div>
                    <div>
                      <strong>粘贴刚才复制的订阅 URL</strong>，日历名称填入「<strong>拾级 · 学习规划</strong>」，选择喜欢的标记颜色，点击「<strong>添加</strong>」即可！
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(79, 70, 229, 0.06)",
                      border: "1px solid rgba(79, 70, 229, 0.15)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "#4338ca",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>💡</span>
                    <span>飞书日历将作为独立图层展示学习任务，支持与工作日程并排查看，杜绝冲突。</span>
                  </div>
                </div>
              )}

              {activeTab === "apple" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.6 }}>
                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 700, color: "var(--foreground, #1e293b)" }}>
                      🍎 Mac 电脑端（最简单）：
                    </h4>
                    <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                      <li>点击上方「<strong>一键唤起系统日历</strong>」直接订阅；</li>
                      <li>或打开「日历」应用 ➔ 顶部菜单栏「<strong>文件</strong>」➔「<strong>新建日历订阅...</strong>」；</li>
                      <li>粘贴订阅 URL，自动刷新建议设置为「<strong>每小时</strong>」，位置选「<strong>iCloud</strong>」以自动同步到 iPhone。</li>
                    </ol>
                  </div>

                  <div style={{ paddingTop: 8, borderTop: "1px dashed var(--border, #e2e8f0)" }}>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 700, color: "var(--foreground, #1e293b)" }}>
                      📱 iPhone / iPad 移动端：
                    </h4>
                    <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                      <li>打开系统「<strong>设置</strong>」➔「<strong>日历</strong>」➔「<strong>账户</strong>」；</li>
                      <li>点击「<strong>添加账户</strong>」➔ 选择「<strong>其他</strong>」➔「<strong>添加已订阅的日历</strong>」；</li>
                      <li>在服务器栏粘贴刚才复制的订阅链接，点击「下一步」并保存。</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === "google" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.6 }}>
                  <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li>电脑浏览器访问 <a href="https://calendar.google.com" target="_blank" rel="noreferrer" style={{ color: "#4f46e5", textDecoration: "underline" }}>Google Calendar</a> 并登录；</li>
                    <li>在左侧栏「<strong>其他日历 (Other calendars)</strong>」旁点击「<strong>+</strong>」加号；</li>
                    <li>选择「<strong>基于网址 (From URL)</strong>」；</li>
                    <li>在“日历网址”输入框中粘贴刚才复制的订阅链接，点击「<strong>添加日历</strong>」；</li>
                    <li>手机端 Google 日历 App 在设置中勾选开启该日历同步即可。</li>
                  </ol>
                </div>
              )}

              {activeTab === "outlook" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.6 }}>
                  <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li>打开 Outlook 客户端或访问网页版 Outlook 日历；</li>
                    <li>点击左侧导航的「<strong>添加日历 (Add calendar)</strong>」；</li>
                    <li>在弹窗左侧选择「<strong>从 Web 订阅 (Subscribe from web)</strong>」；</li>
                    <li>粘贴订阅 URL，命名为「<strong>拾级 · 学习规划</strong>」，选择喜欢的图标与颜色后点击「<strong>导入</strong>」。</li>
                  </ol>
                </div>
              )}

              {activeTab === "qq" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.6 }}>
                  <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li>登录电脑网页版 QQ 邮箱（mail.qq.com），进入顶部「<strong>日历</strong>」功能；</li>
                    <li>在左侧「其他日历」找到「添加/导入外部日历」；</li>
                    <li>选择「<strong>URL 订阅</strong>」并粘贴刚才复制的订阅链接，点击保存完成订阅。</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--background, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>
            <CheckCircle2 size={15} style={{ color: "#10b981" }} />
            <span>基于 RFC 5545 标准协议，零隐私风险，随时可删除订阅</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "var(--foreground, #1e293b)",
              color: "var(--background, #ffffff)",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
