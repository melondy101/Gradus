"use client";

/**
 * AI 卡空态说明（§4.4：深底卡承载 AI 语言；不展示任何编造指标）。
 */

export function AiIdleHint() {
  return (
    <div>
      <p className="text-[13px] leading-[20px] text-on-dark-2">
        输入一个学习目标，流水线会依次完成意图解析、资源检索、计划生成与核查修订，
        并给出可跳转的子任务排期与真实检索到的学习资源。
      </p>
      <p className="mt-2.5 border-t border-bd-dark pt-2.5 font-mono text-[9.5px] tracking-[.04em] text-on-dark-3">
        INTENT → TAVILY → PLAN → VALIDATE
      </p>
    </div>
  );
}
