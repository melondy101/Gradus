import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { NewTaskQuotaHint } from "./new-task-quota-hint";

/** 次数用完：不能只显示「还可生成 0 次」，要给购物车购买入口 */
test("次数为 0 时切换耗尽态并给出购买资源包入口", () => {
  const markup = renderToStaticMarkup(<NewTaskQuotaHint balance={0} />);
  expect(markup).toContain("AI 规划次数已用完");
  expect(markup).toContain("00:00 重置");
  expect(markup).toContain("购买资源包");
  expect(markup).toContain("<svg");
});

test("还有次数时只提示剩余次数，不弹购买入口", () => {
  const markup = renderToStaticMarkup(<NewTaskQuotaHint balance={2} />);
  expect(markup).toContain("还可生成");
  expect(markup).not.toContain("购买资源包");
  expect(markup).not.toContain("已用完");
});

test("余额未知（commerce 未开启/未校验）时不渲染", () => {
  expect(renderToStaticMarkup(<NewTaskQuotaHint balance={null} />)).toBe("");
});
