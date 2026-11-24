import { expect, test } from "bun:test";

import { classifyAnalyzeError } from "@/lib/ai/analyze-errors";

/** FB-07：失败原因分级 */
test("超时、模型无产出、保存失败分别给出不同错误码", () => {
  expect(classifyAnalyzeError("AI 服务响应超时，请稍后重试").code).toBe("AI_TIMEOUT");
  expect(classifyAnalyzeError("AI 未生成有效计划").code).toBe("INVALID_PLAN");
  expect(classifyAnalyzeError("写入子任务计划失败").code).toBe("SAVE_FAILED");
  expect(classifyAnalyzeError("something else").code).toBe("AI_FAILED");
});

test("错误文案不泄露内部细节，且都给出可操作提示", () => {
  const timeout = classifyAnalyzeError("AI 服务响应超时，请稍后重试");
  expect(timeout.message).toContain("超时");
  expect(timeout.status).toBe(504);

  const save = classifyAnalyzeError("写入子任务计划失败");
  expect(save.message).toContain("原有计划未受影响");

  const unknown = classifyAnalyzeError("boom");
  expect(unknown.message).toBe("分析未能完成，请稍后重试。");
  expect(unknown.status).toBe(500);
});
