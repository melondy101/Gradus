"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SubtaskActionList } from "./subtask-action-list";
import { SubtaskMetaGrid } from "./subtask-meta-grid";
import { SubtaskResourceRow } from "./subtask-resource-row";
import type { SubtaskState, SubtaskView } from "./subtask-view-model";

interface SubtaskInspectorProps {
  view: SubtaskView | null;
  /** 第二参数为该子任务当前的 completed 值，由页面层取反后乐观提交 */
  onToggle: (id: string, current: boolean) => void;
  onClear: () => void;
}

const STATE_LABEL: Record<SubtaskState, string> = {
  done: "已完成",
  live: "进行中",
  plan: "计划中",
};

/**
 * 屏二右侧 380px 子任务详情面板（吸顶）。
 * 徽章 → 标题 → 2×2 元信息 → 描述 → 学习资源 → 行动项 → 底部「完成此项 / 稍后」，
 * 顺序与设计稿一致，内容全部来自选中子任务。
 */
export function SubtaskInspector({ view, onToggle, onClear }: SubtaskInspectorProps) {
  if (!view) {
    return (
      <aside className="sticky top-0">
        <Card className="gap-0 p-[22px]" aria-label="子任务详情">
          <Eyebrow kind="label">子任务详情</Eyebrow>
          <p className="text-[13.5px] leading-[23px] text-text-2">
            从左侧清单点击任意一行，这里会显示它的排期、认知层级、学习资源与行动项。
          </p>
        </Card>
      </aside>
    );
  }

  const { subtask } = view;
  const badge = view.bloom
    ? `${STATE_LABEL[view.state]} · L${view.bloomLevel}`
    : STATE_LABEL[view.state];

  return (
    <aside className="sticky top-0">
      <Card className="gap-0 p-[22px]" aria-label="子任务详情">
        <Badge state={view.state}>{badge}</Badge>
        <h3 className="mt-3 mb-4 text-[19px] leading-[28px] font-black">{subtask.title}</h3>

        <SubtaskMetaGrid view={view} />

        {subtask.description && (
          <p className="mt-4 mb-[18px] text-[13.5px] leading-[23px] text-text-2">
            {subtask.description}
          </p>
        )}

        {view.resources.length > 0 && (
          <>
            <Eyebrow kind="label" className="mt-[18px]">
              学习资源 · {view.resources.length}
              {view.verifiedCount > 0
                ? `（已校验 ${view.verifiedCount}）`
                : "（未配检索密钥，点击跳转搜索）"}
            </Eyebrow>
            {view.resources.map((r, i) => (
              <SubtaskResourceRow key={`${subtask.id}-res-${i}`} res={r} />
            ))}
          </>
        )}

        {view.actions.length > 0 && (
          <>
            <Eyebrow kind="label" className="mt-[18px]">
              行动项 · {view.actions.length}
            </Eyebrow>
            <SubtaskActionList items={view.actions} />
          </>
        )}

        <div className="mt-[18px] flex gap-2 border-t border-bd-card pt-4">
          <Button
            variant="app"
            className="h-[42px] flex-1 px-4 text-sm"
            onClick={() => onToggle(subtask.id, subtask.completed)}
          >
            {subtask.completed ? (
              <>
                <Check size={15} />
                撤销完成
              </>
            ) : (
              "完成此项"
            )}
          </Button>
          <Button variant="outline" className="h-[42px] px-5 text-sm" onClick={onClear}>
            稍后
          </Button>
        </div>
      </Card>
    </aside>
  );
}
