import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { PlanCard } from "./plan-card";

test("opens the plan detail and keeps filtered view and delete entries", () => {
  const task = {
    id: "task-1",
    title: "学习 Python",
    subtasks: [],
  } as TaskWithSubtasks;

  const markup = renderToStaticMarkup(
    <PlanCard
      task={task}
      onOpen={() => {}}
      onViewPlan={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(markup).toContain("打开目标详情 学习 Python");
  expect(markup).toContain("查看阶梯");
  expect(markup).toContain("查看排期");
  expect(markup).toContain(">删除<");
  expect(markup).not.toContain("开始：今天");
});
