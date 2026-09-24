"use client";

/**
 * 单条 AI 修订建议行（§3 屏一右列，原 app.css `.sug` / `.sug__t` / `.sug__b` / `.sug__act`）。
 * 建议本身由 ai-review-hints.ts 从真实计划数据推导，这里只负责呈现与三个动作。
 */

import { Crosshair, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiReviewHint } from "./ai-review-hints";

interface Props {
  hint: AiReviewHint;
  onJumpToSubtask?: (id: string) => void;
  onFill: (text: string) => void;
  onDismiss: () => void;
}

export function AiReviewHintRow({ hint, onJumpToSubtask, onFill, onDismiss }: Props) {
  const canJump = !!hint.subtaskId && !!onJumpToSubtask;
  return (
    <li className="border-t border-bd-dark py-2.5 first:border-t-0 first:pt-0">
      <p className="text-[14px] font-bold text-on-dark">{hint.title}</p>
      <p className="mt-[5px] text-body leading-[20px] text-on-dark-2">{hint.body}</p>
      <div className="mt-2.5 flex gap-2">
        {canJump && (
          <Button variant="accent" size="xs" onClick={() => onJumpToSubtask?.(hint.subtaskId!)}>
            <Crosshair size={12} /> 定位子任务
          </Button>
        )}
        {hint.adjustment && (
          <Button
            variant={canJump ? "onDark" : "accent"}
            size="xs"
            onClick={() => onFill(hint.adjustment!)}
          >
            <NotebookPen size={12} /> 填入调整意见
          </Button>
        )}
        <Button variant="onDark" size="xs" onClick={onDismiss}>
          忽略
        </Button>
      </div>
    </li>
  );
}
