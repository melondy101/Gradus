"use client";

/**
 * 新目标表单（对照 today 视图的 goal 行）：标签 + 描边一体式输入，
 * 回车或「开始规划」直接进 AI 流水线；空输入时打开完整新建对话框。
 * 三条示例只是往输入框里填文本，不代替用户提交。
 */

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/eyebrow";

/** today 视图的三个示例目标（中文文案，与产品既有文案逐字一致） */
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

      <div className="flex border border-ink bg-cream-light transition-shadow duration-[.16s] focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <Input
          id="goal-input"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="三个月内通过日语 N3 考试"
          aria-label="新学习目标"
          className="h-12 flex-1 rounded-none border-0 bg-transparent px-3 text-body outline-none placeholder:text-text-3 focus:border-0 focus:bg-transparent focus:shadow-none"
        />
        <Button
          type="submit"
          variant="app"
          className="h-12 gap-1 rounded-none border-l border-ink px-4 text-body-sm"
        >
          开始规划
          <ArrowRight size={12} />
        </Button>
      </div>

      <ChipRow className="mt-2 gap-1.5">
        {EXAMPLES.map((example) => (
          <Chip
            key={example.chip}
            type="button"
            onClick={() => setGoal(example.goal)}
            className="rounded-tag border-bd-check bg-transparent px-2 py-1 text-micro"
          >
            {example.chip}
          </Chip>
        ))}
      </ChipRow>
    </form>
  );
}
