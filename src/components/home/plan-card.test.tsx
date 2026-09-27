import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { PlanCard } from "./plan-card";

test("renders the detail entry without a start-date action", () => {
  const task = {
    id: "task-1",
    title: "学习 Python",
    subtasks: [],
  } as TaskWithSubtasks;

  const markup = renderToStaticMarkup(
    <PlanCard task={task} onOpen={() => {}} onOpenDetail={() => {}} onDelete={() => {}} />,
  );

  expect(markup).toContain("进入详情 →");
  expect(markup).toContain(">删除<");
  expect(markup).not.toContain("开始：今天");
});
