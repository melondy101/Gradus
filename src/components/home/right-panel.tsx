"use client";

/**
 * AI 检查面板外壳（§3 屏一右列 / §4.4 深色带语言）。
 *
 * variant="rail" —— 应用外壳右侧固定栏（计划 / 天梯 / 甘特视图使用），可折叠，移动端为底部抽屉。
 * variant="card" —— 屏一双列右列的深底卡（与 rail 共用同一份 <AiInspector>）。
 *
 * 数据全部由 home-page 通过 props 注入（useAnalysisPanel 输出），此处不请求任何接口。
 * 弹层阶梯：移动抽屉遮罩 150 / 抽屉 160，落在 new-task(100/101) 与 detail(200/201) 之间。
 */

import { useState, useEffect } from "react";
import { Bell, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import { AiInspector } from "./ai-inspector";
import { useResponsive } from "./use-responsive";
import type { PipelineSize } from "./ai-pipeline-node";
import type { AnalysisEntry } from "./use-analysis-panel";

export { useAnalysisPanel } from "./use-analysis-panel";
export type { AnalysisEntry, Phase, Resource, StreamState } from "./use-analysis-panel";

export interface RightPanelProps {
  entries: AnalysisEntry[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  regenAnalysis: (taskId: string, adjustment: string) => void;
  removeEntry: (taskId: string) => void;
  onRequestDelete?: (taskId: string, title?: string, subtaskCount?: number) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
  /** 点击子任务 → 跳到对应日期卡片并高亮（#subtask-card-{id}） */
  onJumpToSubtask?: (subtaskId: string) => void;
  /** rail = 应用外壳右栏；card = 屏一双列右列深底卡 */
  variant?: "rail" | "card";
}

export function RightPanel({
  entries,
  focusedId,
  setFocusedId,
  regenAnalysis,
  removeEntry,
  onRequestDelete,
  onToggleSubtask,
  onJumpToSubtask,
  variant = "rail",
}: RightPanelProps) {
  const { isMobile } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isLive = (e: AnalysisEntry) =>
    e.stream.phase !== "idle" && e.stream.phase !== "done" && e.stream.phase !== "error";
  const runningCount = entries.filter(isLive).length;

  // 任务开始分析时自动展开面板：这是「外部状态变化 → 展开」的响应式同步，
  // 触发点在别的组件、无法放进事件处理器，故此处的 setState 是合法的。
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (runningCount > 0) { setCollapsed(false); if (isMobile) setSheetOpen(true); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [runningCount, isMobile]);

  // 「移除」优先走 home-page 的删除确认流程（级联删除任务），无回调时仅摘除条目
  const handleRemove = (taskId: string) => {
    const entry = entries.find((e) => e.taskId === taskId);
    if (onRequestDelete && entry?.task) {
      onRequestDelete(taskId, entry.taskTitle, entry.task.subtasks?.length);
    } else removeEntry(taskId);
  };

  const inspector = (nodeSize: PipelineSize) => (
    <AiInspector
      entries={entries}
      focusedId={focusedId}
      setFocusedId={setFocusedId}
      regenAnalysis={regenAnalysis}
      removeEntry={handleRemove}
      onToggleSubtask={onToggleSubtask}
      onJumpToSubtask={onJumpToSubtask}
      nodeSize={nodeSize}
    />
  );

  // ── 屏一右列：<Card tone="dark"> —— §4.4「深色卡给 AI 建议」 ──────────
  if (variant === "card") {
    return (
      <Card tone="dark" className="gap-0 px-5 pt-[18px] pb-4">
        {inspector("md")}
      </Card>
    );
  }

  // ── 移动端：悬浮 pill 入口 + 底部抽屉（遮罩 150 / 抽屉 160，不越级） ────
  if (isMobile) {
    return (
      <>
        <Button
          variant="onDark"
          onClick={() => setSheetOpen(true)}
          aria-label="打开 AI 分析面板"
          className={cn(
            "fixed right-[26px] bottom-[22px] z-[40] h-auto gap-2.5 border-0 bg-band-dark py-3 pr-[18px] pl-3.5",
            "text-[13px] font-bold text-on-dark shadow-[0_22px_46px_-18px_rgba(14,13,11,.55)]"
          )}
        >
          <Sparkles size={15} className="text-accent" />
          <span>AI 规划面板</span>
          {runningCount > 0 && <Mono className="text-accent">{runningCount} 进行中</Mono>}
        </Button>

        {sheetOpen && (
          <div
            aria-hidden
            onClick={() => setSheetOpen(false)}
            className="fixed inset-0 z-[150] bg-ink/45 backdrop-blur-[2px]"
          />
        )}

        <Card
          tone="dark"
          className={cn(
            "fixed inset-x-0 bottom-0 z-[160] h-[82vh] max-h-[82vh] gap-0 rounded-t-card border-0",
            "pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-[280ms] ease-[cubic-bezier(.4,0,.2,1)]",
            sheetOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex flex-none items-center gap-2.5 border-b border-bd-dark px-4 py-3">
            <div className="min-w-0 flex-1">
              <Eyebrow tone="accent">AI Review</Eyebrow>
              <div className="mt-1 text-[15px] font-bold text-on-dark">意图 · 资源 · 计划 · 核查</div>
            </div>
            <Button variant="onDark" size="xs" onClick={() => setSheetOpen(false)}>
              收起
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">{inspector("sm")}</div>
        </Card>
      </>
    );
  }

  // ── 桌面端：固定右栏（可折叠至 36px） ────────────────────────────────
  return (
    <aside
      className={cn(
        "flex flex-none flex-col overflow-hidden border-0 border-l border-bd-dark bg-band-dark text-on-dark",
        "transition-[width] duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]",
        collapsed ? "w-9" : "w-[350px]"
      )}
    >
      <div className="flex flex-none items-center gap-2 border-b border-bd-dark px-3 py-[13px]">
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <Eyebrow tone="accent">AI Review</Eyebrow>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-on-dark">
              {runningCount > 0 && <Bell size={13} className="text-accent" />}
              AI 分析面板
            </div>
          </div>
        )}
        <Button
          variant="onDark"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "展开面板" : "收起面板"}
          aria-label={collapsed ? "展开 AI 分析面板" : "收起 AI 分析面板"}
          className="size-[26px] flex-none rounded-field p-0"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </Button>
      </div>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">{inspector("md")}</div>
      )}
    </aside>
  );
}
