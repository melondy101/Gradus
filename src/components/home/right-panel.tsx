"use client";

/**
 * AI 检查面板外壳（§3 屏一右列 / §4.4 深色带语言）。
 *
 * variant="rail" —— 应用外壳右侧固定栏（计划 / 天梯 / 甘特视图使用），可折叠，移动端为底部抽屉。
 * variant="card" —— 屏一双列右列的暖底卡（与 rail 共用同一份 <AiInspector>）。
 *
 * 配色：时间色谱原型右栏（`.side` / `.review`）—— 暖纸底 + 墨字 + 细分隔线，
 * 与四个主视图同一套语言；深色带语言已随时间色谱重构退场。
 *
 * 数据全部由 home-page 通过 props 注入（useAnalysisPanel 输出），此处不请求任何接口。
 * 移动端抽屉走 ui/modal 的 placement="bottom" 变体（drawer 层 150）。
 */

import { useState, useEffect } from "react";
import { Bell, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/utils/utils";
import { AiInspector } from "./ai-inspector";
import { useResponsive } from "./use-responsive";
import type { PipelineSize } from "./ai-pipeline-node";
import type { AnalysisEntry } from "./use-analysis-panel";

export { useAnalysisPanel } from "./use-analysis-panel";
export type {
  AnalysisEntry,
  Phase,
  Resource,
  StreamState,
} from "./use-analysis-panel";

export interface RightPanelProps {
  entries: AnalysisEntry[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  regenAnalysis: (taskId: string, adjustment: string) => void;
  removeEntry: (taskId: string) => void;
  onRequestDelete?: (
    taskId: string,
    title?: string,
    subtaskCount?: number,
  ) => void;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    current: boolean,
  ) => void;
  /** 点击子任务 → 跳到对应日期卡片并高亮（#subtask-card-{id}） */
  onJumpToSubtask?: (subtaskId: string) => void;
  /** 进入该视图时右栏的默认收展状态；用户手动切换后覆盖默认值 */
  defaultCollapsed?: boolean;
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
  defaultCollapsed = false,
  variant = "rail",
}: RightPanelProps) {
  const { isMobile } = useResponsive();
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const collapsed = manualCollapsed ?? defaultCollapsed;

  const isLive = (e: AnalysisEntry) =>
    e.stream.phase !== "idle" &&
    e.stream.phase !== "done" &&
    e.stream.phase !== "error";
  const runningCount = entries.filter(isLive).length;

  // 任务开始分析时自动展开面板：这是「外部状态变化 → 展开」的响应式同步，
  // 触发点在别的组件、无法放进事件处理器，故此处的 setState 是合法的。
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (runningCount > 0) {
      setManualCollapsed(false);
      if (isMobile) setSheetOpen(true);
    }
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

  // ── 屏一右列：暖底软卡（时间色谱右栏语言） ─────────────────────────
  if (variant === "card") {
    return (
      <Card tone="soft" className="gap-0 px-5 pt-4 pb-4">
        {inspector("md")}
      </Card>
    );
  }

  // ── 移动端：悬浮 pill 入口 + <Modal placement="bottom"> 底部抽屉（drawer 层 150） ──
  if (isMobile) {
    return (
      <>
        <Button
          variant="default"
          onClick={() => setSheetOpen(true)}
          aria-label="打开 AI 分析面板"
          className={cn(
            // 抬到 TabBar（56px+safe-area）之上，避免整体被盖（体检报告 2026-09-26 阻断#4）
            "fixed right-[26px] bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-[40] h-auto gap-2.5 border-ink bg-ink py-3 pr-4 pl-3",
            "text-body font-bold text-cream shadow-[0_22px_46px_-18px_rgba(14,13,11,.45)]",
          )}
        >
          <Sparkles size={15} className="text-accent" />
          <span>AI 规划面板</span>
          {runningCount > 0 && (
            <Mono className="text-accent">{runningCount} 进行中</Mono>
          )}
        </Button>

        <Modal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          placement="bottom"
          layer="drawer"
          width="100%"
          height="82vh"
          className="border-0 bg-cream text-ink"
          bodyClassName="flex flex-col overflow-hidden p-0"
        >
          <div className="flex flex-none items-center gap-2.5 border-b border-bd-card px-4 py-3">
            <div className="min-w-0 flex-1">
              <Eyebrow>AI Review</Eyebrow>
              <div className="mt-1 text-body-lg font-bold text-ink">
                意图 · 资源 · 计划 · 核查
              </div>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setSheetOpen(false)}
            >
              收起
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
            {inspector("sm")}
          </div>
        </Modal>
      </>
    );
  }

  // ── 桌面端：固定右栏（可折叠至 36px），暖纸底 ────────────────────────
  return (
    <aside
      className={cn(
        "flex flex-none flex-col overflow-hidden border-0 border-l border-bd-card bg-cream text-ink",
        "transition-[width] duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]",
        collapsed ? "w-9" : "w-[350px]",
      )}
    >
      <div className="flex flex-none items-center gap-2 border-b border-bd-card px-3 py-3">
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <Eyebrow>AI Review</Eyebrow>
            <div className="mt-1 flex items-center gap-1.5 text-body font-bold text-ink">
              {runningCount > 0 && <Bell size={13} className="text-error" />}
              AI 分析面板
            </div>
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => setManualCollapsed(!collapsed)}
          title={collapsed ? "展开面板" : "收起面板"}
          aria-label={collapsed ? "展开 AI 分析面板" : "收起 AI 分析面板"}
          className="size-[26px] flex-none rounded-field p-0"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </Button>
      </div>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {inspector("md")}
        </div>
      )}
    </aside>
  );
}
