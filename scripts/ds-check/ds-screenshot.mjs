/**
 * ds-screenshot —— 阶段一输入采集：对产品关键页面截取 PNG，存入 output/ds-screenshots/。
 * 仅供设计系统流程使用（get_screenshot 的替代实现），不参与验收判定。
 *
 * 用法：
 *   node scripts/ds-check/ds-screenshot.mjs [--base http://localhost:3000]
 * 前置：dev server 已在 --base 指定端口运行（README：bun dev → 3000）。
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const OUT = join(ROOT, "output", "ds-screenshots");
mkdirSync(OUT, { recursive: true });

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const BASE = arg("base", "http://localhost:3000");
const ONLY = arg("only", "");
// 首次访问会弹新手引导（src/components/home/onboarding-tour.tsx），预置完成键跳过
const ONBOARDING_KEY = "gradus_onboarding_completed_v1";

// 核心界面 × 1 张：落地页（展开内滚容器取整页）、产品壳四视图、探针页（固定样例的屏二/屏三版面）
const SHOTS = [
  { name: "landing-desktop", url: "/", viewport: { width: 1440, height: 900 }, fullPage: true },
  { name: "app-today-desktop", url: "/app?view=today", viewport: { width: 1440, height: 900 } },
  { name: "app-plans-desktop", url: "/app?view=plans", viewport: { width: 1440, height: 900 } },
  { name: "app-steps-desktop", url: "/app?view=steps", viewport: { width: 1440, height: 900 } },
  { name: "app-timeline-desktop", url: "/app?view=timeline", viewport: { width: 1440, height: 900 } },
  { name: "probe-ritual-desktop", url: "/task/parity-probe", viewport: { width: 1440, height: 900 } },
  { name: "app-today-mobile", url: "/app?view=today", viewport: { width: 390, height: 844 } },
];

const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    if (ONLY && !shot.name.startsWith(ONLY)) continue;
    const ctx = await browser.newContext({
      viewport: shot.viewport,
      deviceScaleFactor: 2,
      reducedMotion: "reduce", // globals.css 的降级开关：动画压到 .001s，避免截到半程帧
    });
    await ctx.addInitScript(
      `try{localStorage.setItem(${JSON.stringify(ONBOARDING_KEY)},"true")}catch(e){}`,
    );
    const page = await ctx.newPage();
    await page.goto(BASE + shot.url, { waitUntil: "networkidle", timeout: 90000 }).catch(async () => {
      // networkidle 在长轮询/未响应 API 下可能超时，退回 domcontentloaded + 固定等待
      await page.goto(BASE + shot.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(4000);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    if (shot.fullPage) {
      // body overflow:hidden、滚动发生在 .lp 内部：展开内滚容器让 fullPage 截到整页
      await page.addStyleTag({
        content: ".lp{height:auto!important;overflow:visible!important}body{overflow:visible!important}html,body{height:auto!important}",
      });
    }
    // 隐藏 Next.js dev DevTools 浮标（体检报告 2026-09-26 疑似#1：环境产物混入截图）
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.screenshot({ path: join(OUT, `${shot.name}.png`), fullPage: !!shot.fullPage });
    console.log(`✓ ${shot.name}.png  ←  ${shot.url}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`\n完成：${SHOTS.length} 张截图 → output/ds-screenshots/`);
