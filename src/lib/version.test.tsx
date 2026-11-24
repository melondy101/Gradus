import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero";
import { PRODUCT_VERSION } from "@/lib/version";

/**
 * FB-12 版本同步守卫
 *
 * 产品版本只有一个真源：package.json 的 version 与 src/lib/version.ts 的 PRODUCT_VERSION。
 * 任何一处漏改都会让这个测试失败 —— 发版纪律由测试兜底，不靠人记。
 */
test("package.json 版本与 PRODUCT_VERSION 一致", () => {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { version?: string };
  expect(pkg.version).toBe(PRODUCT_VERSION);
});

test("落地页徽章与页脚都展示当前产品版本", () => {
  const hero = renderToStaticMarkup(<LandingHero />);
  const footer = renderToStaticMarkup(<LandingFooter />);
  expect(hero).toContain(`v${PRODUCT_VERSION}`);
  expect(footer).toContain(`v${PRODUCT_VERSION}`);
  expect(footer).toContain("/blob/main/LICENSE");
});
