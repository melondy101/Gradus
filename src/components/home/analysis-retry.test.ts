import { describe, expect, test } from "bun:test";

import { getAnalysisRetry } from "./analysis-retry";
import type { AnalysisEntry } from "./analysis-types";

function entry(taskId: string): AnalysisEntry {
  return {
    taskId,
    taskTitle: "学习 Rust",
    rawInput: "学习 Rust 所有权",
    tags: ["编程"],
    stream: { phase: "error", label: "创建失败", deltaLen: 0, errorMsg: "账号不存在" },
    task: null,
  };
}

describe("getAnalysisRetry", () => {
  test("临时创建失败项重试时重新创建任务，不把 temp ID 交给分析接口", () => {
    expect(getAnalysisRetry(entry("temp-123"), "增加练习")).toEqual({
      kind: "create",
      goal: "学习 Rust 所有权",
      tags: ["编程"],
    });
  });

  test("已持久化任务保留原任务 ID，并可带调整意见重跑分析", () => {
    expect(getAnalysisRetry(entry("task-123"), "增加练习")).toEqual({
      kind: "reanalyze",
      taskId: "task-123",
      adjustment: "增加练习",
    });
  });
});
