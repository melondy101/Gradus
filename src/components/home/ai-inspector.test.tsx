import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiInspector } from "./ai-inspector";
import type { AnalysisEntry } from "./analysis-types";

test("shows a retry action for a failed plan entry", () => {
  const entries: AnalysisEntry[] = [{
    taskId: "temp-123",
    taskTitle: "学习 Rust",
    rawInput: "学习 Rust 所有权",
    stream: { phase: "error", label: "创建失败", deltaLen: 0, errorMsg: "账号状态已失效，请重试" },
    task: null,
  }];

  const markup = renderToStaticMarkup(
    <AiInspector
      entries={entries}
      focusedId="temp-123"
      setFocusedId={() => {}}
      regenAnalysis={() => {}}
      removeEntry={() => {}}
      onToggleSubtask={() => {}}
    />,
  );

  expect(markup).toContain("账号状态已失效，请重试");
  expect(markup).toContain("重新尝试");
});
