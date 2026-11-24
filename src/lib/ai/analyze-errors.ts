/**
 * AI 规划失败的原因分级（FB-07）
 *
 * 之前所有失败都返回同一句「分析未能完成，请稍后重试」，
 * 用户既不知道是超时、模型没给出计划，还是落库失败，也就不知道该不该重试。
 *
 * 这里把内部错误消息映射成稳定错误码 + 人话文案，纯函数便于单测。
 */

export type AnalyzeErrorCode =
  | "AI_TIMEOUT"
  | "INVALID_PLAN"
  | "SAVE_FAILED"
  | "AI_FAILED";

export interface AnalyzeFailure {
  code: AnalyzeErrorCode;
  message: string;
  status: number;
}

const TIMEOUT_HINTS = ["超时", "timeout", "timed out", "ETIMEDOUT", "abort"];
const INVALID_PLAN_HINTS = ["未生成有效计划", "无效计划", "INVALID_PLAN"];
const SAVE_HINTS = ["写入子任务计划失败", "replaceSubtasks", "写入失败", "保存计划失败"];

export function classifyAnalyzeError(rawMessage: string): AnalyzeFailure {
  const msg = (rawMessage ?? "").toLowerCase();
  const has = (hints: string[]) => hints.some((h) => msg.includes(h.toLowerCase()));

  if (has(TIMEOUT_HINTS)) {
    return {
      code: "AI_TIMEOUT",
      message: "模型响应超时，请重试；也可以把目标写得更具体一点，减少规划范围。",
      status: 504,
    };
  }
  if (has(INVALID_PLAN_HINTS)) {
    return {
      code: "INVALID_PLAN",
      message: "模型这次没产出可执行的计划，请重试一次。",
      status: 502,
    };
  }
  if (has(SAVE_HINTS)) {
    return {
      code: "SAVE_FAILED",
      message: "保存计划失败，原有计划未受影响，请重试。",
      status: 500,
    };
  }
  return {
    code: "AI_FAILED",
    message: "分析未能完成，请稍后重试。",
    status: 500,
  };
}
