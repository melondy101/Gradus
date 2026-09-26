"use client";

/**
 * 屏一「新目标输入卡」（《品牌与产品设计说明》§3 屏幕一 + §1.4，原 app.css
 * `.goal` `.goal__row` `.field--lg` `.btn--app` `.chips` `.chip`）。
 *
 * §1.4 硬指标：输入框与主按钮同为 56px 高、方圆角 12，故用 Input size="lg"
 * 与 Button variant="app" size="lg"（二者都落在 h-14 / rounded-field）。
 *
 * 一条真实出口：
 *   · 开始规划 → 直接进 AI 流水线（与旧「示例目标」按钮同一动作）
 *
 * 输入为空时点「开始规划」会落到 onOpenDialog，完整新建对话框另有
 * ⌘K / N / 顶栏按钮入口。
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";

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
    <Card className="mb-3 gap-0 px-[22px] py-5">
      <Eyebrow className="mb-3">New Goal</Eyebrow>

      {/* 窄视口纵向堆叠：390px 下固定宽按钮会压扁 flex-1 输入框（体检报告 2026-09-26 阻断#3） */}
      <div className="flex flex-col gap-2.5 min-[480px]:flex-row">
        <Input
          size="lg"
          id="goal-input"
          className="min-w-0 flex-1"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="三个月内通过日语 N3 考试"
          aria-label="新学习目标"
        />
        <Button variant="app" size="lg" onClick={submit} className="shrink-0">
          <Sparkles size={16} />
          <span>开始规划</span>
        </Button>
      </div>

      <ChipRow className="mt-3">
        {EXAMPLES.map((ex) => (
          <Chip key={ex.chip} onClick={() => setGoal(ex.goal)}>
            {ex.chip}
          </Chip>
        ))}
      </ChipRow>
    </Card>
  );
}
