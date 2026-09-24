"use client";

import { useRouter } from "next/navigation";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import type { NavView } from "@/components/layout/icon-rail";
import type { HomeOverlays } from "./use-home-overlays";
import type { SubtaskActions } from "./use-subtask-actions";
import type { AnalysisPanel } from "./use-analysis-panel";
import { CommandPalette } from "./command-palette";
import { NewTaskInput } from "./new-task-input";
import { SubtaskDetailModal } from "./subtask-detail-modal";
import { CongratulationsModal } from "./congrats-modal";
import { ShareCardModal } from "@/components/share/share-card-modal";
import { AiGenerationRitualModal } from "@/components/task/ai-generation-ritual-modal";
import { MilestoneUnlockModal } from "./milestone-unlock-modal";
import { PostponeDialog } from "./postpone-dialog";
import { DeletePlanModal } from "./delete-plan-modal";
import { OnboardingTour } from "./onboarding-tour";

export interface HomeOverlaysProps {
  overlays: HomeOverlays;
  subtaskActions: SubtaskActions;
  panel: AnalysisPanel;
  detailSubtask: SubtaskWithTask | null | undefined;
  subtaskRows: SubtaskWithTask[];
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
  onSwitchView: (view: NavView) => void;
}

/** 首页弹窗与控制台模块栈（全部走 ui/modal 阶梯，见各弹层组件）。 */
export function HomeOverlaysStack(props: HomeOverlaysProps) {
  const router = useRouter();
  const { overlays, subtaskActions, panel, detailSubtask } = props;
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    showInput,
    setShowInput,
    setDetailSubtaskId,
    congrats,
    setCongrats,
    milestone,
    setMilestone,
    shareData,
    setShareData,
    ritualMinimized,
    setRitualMinimized,
    handleGenerateCertificate,
  } = overlays;
  const {
    postponeTarget,
    setPostponeTarget,
    deleteTarget,
    setDeleteTarget,
    isDeletingTask,
    confirmPostpone,
    handleConfirmDelete,
  } = subtaskActions;

  const runNewGoal = (goal: string) => {
    setRitualMinimized(false);
    panel.startAnalysis(goal);
  };

  return (
    <>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        subtasks={props.subtaskRows}
        onSelectSubtask={(s) => setDetailSubtaskId(s.id)}
        onNewPlan={() => setShowInput(true)}
        onSwitchView={props.onSwitchView}
      />

      {showInput && (
        <NewTaskInput
          onClose={() => setShowInput(false)}
          onSubmit={runNewGoal}
        />
      )}

      {detailSubtask && (
        <SubtaskDetailModal
          row={detailSubtask}
          onClose={() => setDetailSubtaskId(null)}
          onToggle={() =>
            props.onToggleSubtask(
              detailSubtask.taskId,
              detailSubtask.id,
              detailSubtask.completed
            )
          }
          onOpenTask={() => {
            router.push(`/task/${detailSubtask.taskId}`);
            setDetailSubtaskId(null);
          }}
        />
      )}

      {congrats && (
        <CongratulationsModal
          data={congrats}
          onClose={() => setCongrats(null)}
          onLearnMore={(taskId) => {
            panel.setFocusedId(taskId);
            panel.focusTask(taskId);
            setCongrats(null);
          }}
          onGenerateCertificate={handleGenerateCertificate}
        />
      )}

      {/* 🏆 学习周报与结业证书分享卡弹窗 */}
      {shareData && (
        <ShareCardModal data={shareData} onClose={() => setShareData(null)} />
      )}

      {/* 🚀 AI 生成多阶段深度仪式感与流式进度弹窗 */}
      {(() => {
        const activeEntry = panel.entries.find(
          (e) =>
            e.stream.phase !== "idle" &&
            e.stream.phase !== "done" &&
            e.stream.phase !== "error"
        );
        if (!activeEntry || ritualMinimized) return null;
        return (
          <AiGenerationRitualModal
            isOpen={true}
            goal={activeEntry.taskTitle || activeEntry.rawInput || "学习任务深度规划"}
            phase={activeEntry.stream.phase}
            elapsedSec={activeEntry.stream.deltaLen}
            onMinimize={() => setRitualMinimized(true)}
            onClose={() => setRitualMinimized(true)}
          />
        );
      })()}

      {milestone && (
        <MilestoneUnlockModal level={milestone} onClose={() => setMilestone(null)} />
      )}

      {postponeTarget && (
        <PostponeDialog
          row={postponeTarget}
          onCancel={() => setPostponeTarget(null)}
          onConfirm={confirmPostpone}
        />
      )}

      {/* 🗑 统一删除计划安全二次确认弹窗 (Delete Plan Confirmation Modal) */}
      <DeletePlanModal
        isOpen={Boolean(deleteTarget)}
        taskTitle={deleteTarget?.title ?? ""}
        subtaskCount={deleteTarget?.subtaskCount}
        isDeleting={isDeletingTask}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 🧭 新用户 1-2-3 步气泡高亮引导 (Step-by-step Onboarding Tour) */}
      <OnboardingTour
        onStartExample={runNewGoal}
        onOpenNewTaskModal={() => setShowInput(true)}
      />
    </>
  );
}
