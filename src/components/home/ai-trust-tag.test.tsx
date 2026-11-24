import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiTrustTag } from "./ai-trust-tag";
import type { Resource } from "./use-analysis-panel";

function res(patch: Record<string, unknown>): Resource {
  return {
    type: "course",
    title: "英语语言学概论",
    trust_level: "verified",
    ...patch,
  } as Resource;
}

/** FB-05：链接活着但课已结课时，不能再标「已校验」 */
test("内容已结束的资源不再显示「已校验」", () => {
  const markup = renderToStaticMarkup(
    <AiTrustTag res={res({ content_status: "ended", status_evidence: "当前开课已结束" })} />,
  );
  expect(markup).toContain("已结束 · 不可学");
  expect(markup).not.toContain("已校验");
  expect(markup).toContain("当前开课已结束");
});

test("内容已关闭的资源同样降级", () => {
  const markup = renderToStaticMarkup(
    <AiTrustTag res={res({ content_status: "closed" })} />,
  );
  expect(markup).toContain("已结束 · 不可学");
});

test("链接失效优先显示「链接失效」", () => {
  const markup = renderToStaticMarkup(
    <AiTrustTag res={res({ url_status: "not_found", content_status: "ended" })} />,
  );
  expect(markup).toContain("链接失效");
  expect(markup).not.toContain("已结束 · 不可学");
});

test("正常资源仍然显示「已校验」", () => {
  const markup = renderToStaticMarkup(
    <AiTrustTag res={res({ content_status: "available" })} />,
  );
  expect(markup).toContain("已校验");
});
