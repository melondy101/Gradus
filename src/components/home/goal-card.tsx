"use client";

/**
 * 新目标表单（对照 `today.html` 的 `.goal`）：标签 + 描边一体式输入，
 * 回车或「开始规划」直接进 AI 流水线；空输入时打开完整新建对话框。
 * 三条示例只是往输入框里填文本，不代替用户提交。
 */

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { T } from "@/lib/design-tokens";
import { Eyebrow } from "@/components/ui/eyebrow";

/** §3 屏一原稿的三个示例目标（中文文案，与设计稿逐字一致） */
const EXAMPLES: Array<{ chip: string; goal: string }> = [
  { chip: "从零开始学 Python", goal: "从零开始学 Python，六个月后能做数据看板" },
  { chip: "两个月读透《思考，快与慢》", goal: "两个月读透《思考，快与慢》并写出读书笔记" },
  { chip: "30 天拿下手绘基础", goal: "30 天拿下手绘基础，能独立画一个人像速写" },
];

interface Props {
  onSubmit: (goal: string) => void;
  onOpenDialog: (goal: string) => void;
}

export function GoalCard({ onSubmit, onOpenDialog }: Props) {
  const [goal, setGoal] = useState("");
  const trimmed = goal.trim();

  const submit = () => {
    if (!trimmed) {
      onOpenDialog("");
      return;
    }
    onSubmit(trimmed);
    setGoal("");
  };

  return (
    <form
      className="mt-auto pt-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Eyebrow kind="label">NEW GOAL / 新目标</Eyebrow>

      <div className="flex border border-ink" style={{ background: T.soft }}>
        <input
          id="goal-input"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="三个月内通过日语 N3 考试"
          aria-label="新学习目标"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-body text-ink outline-none placeholder:text-text-3"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1 border-l border-ink bg-ink px-3 text-body-sm font-bold text-cream transition-transform duration-[.16s] ease-out hover:-translate-y-px"
        >
          开始规划
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example.chip}
            type="button"
            onClick={() => setGoal(example.goal)}
            className="border border-bd-check px-2 py-1 text-micro text-text-2 transition-colors duration-[.16s] hover:border-ink hover:text-ink"
          >
            {example.chip}
          </button>
        ))}
      </div>
    </form>
  );
}
