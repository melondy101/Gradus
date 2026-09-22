/**
 * 设计对等实测 —— 把 output/拾级Gradus-设计预览.html（设计真源）与实现放在同一无头浏览器里
 * 逐量 computed 值，替代"看着像"。
 * 用法：node scripts/design-parity.mjs [--live=http://localhost:3111] [--w=1440] [--h=900] [--page=/app]
 * 退出码非 0 = 有硬偏差（某一侧缺元素只警告：多为无数据被条件渲染门掉）。
 *
 * 两侧 DOM 结构完全不同（设计稿是静态 mock，实现走 data-slot 契约），
 * 所以每条指标用「选择器 + 文本锚点」定位同一个语义元素。
 */
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => { const h = argv.find((a) => a.startsWith(`--${k}=`)); return h ? h.split("=").slice(1).join("=") : d; };
const LIVE = arg("live", "http://localhost:3111");
const REF = pathToFileURL(resolve("output/拾级Gradus-设计预览.html")).href;
const VIEW = { width: +arg("w", 1440), height: +arg("h", 900) };
const PAGE = arg("page", "");

// page = 实现侧要打开的路由；设计稿是一个单文件，落地页与三屏 mock 都在里面
const METRICS = [
  // ── §3 屏幕一 · 今日面板 ──
  { page: "/app", name: "新目标卡（白卡）", ref: [".card", "开始规划"], live: ['[data-slot="card"]', "开始规划"], props: ["borderRadius", "backgroundColor", "borderTopWidth", "borderTopColor", "padding", "fontSize"] },
  { page: "/app", name: "大输入框 .field--lg", ref: [".field--lg", ""], live: ['[data-slot="input"]', ""], props: ["height", "borderRadius", "fontSize", "padding", "backgroundColor", "borderTopColor"] },
  { page: "/app", name: "App 主按钮 .btn--app", ref: [".btn--app", "开始规划"], live: ['[data-slot="button"]', "开始规划"], props: ["height", "borderRadius", "fontSize", "padding", "backgroundColor", "color"] },
  { page: "/app", name: "示例 chip", ref: [".chip", ""], live: ['[data-slot="chip"]', ""], props: ["height", "borderRadius", "fontSize", "backgroundColor", "color", "borderTopColor"] },
  { page: "/app", name: "页头眉题 .eyebrow", ref: [".main__head .eyebrow", ""], live: ["p.font-mono", "TODAY"], props: ["fontFamily", "fontSize", "letterSpacing", "fontWeight", "textTransform"] },
  { page: "/app", name: "统计卡 .stat", ref: [".stat", ""], live: ['[data-slot="stat"]', ""], props: ["backgroundColor", "borderRadius", "padding"] },
  { page: "/app", name: "统计数值 .stat b", ref: [".stat b", ""], live: ['[data-slot="stat"] b', ""], props: ["fontSize", "fontWeight"] },
  { page: "/app", name: "AI 深底卡", ref: [".ai-dark", ""], live: ['[data-slot="card"][data-tone="dark"]', ""], props: ["backgroundColor", "color", "borderRadius", "borderTopWidth", "borderTopColor"] },
  { page: "/app", name: "侧栏宽 232", ref: [".side", ""], live: ["aside", ""], props: ["width", "backgroundColor", "borderRightColor"] },
  // ── §3 屏幕二 · 任务详情（/task/parity-probe 用固定样例渲染同一块版面）──
  { page: "/task/parity-probe", name: "屏二 详情面板标题 .panel__title", ref: [".panel__title", ""], live: ["aside h3", ""], props: ["fontSize", "lineHeight", "fontWeight", "color"] },
  { page: "/task/parity-probe", name: "屏二 状态徽章 .badge--live", ref: [".badge--live", ""], live: ['[data-slot="badge"]', "进行中"], props: ["borderRadius", "fontSize", "fontWeight", "letterSpacing", "backgroundColor", "color", "borderTopColor"] },
  { page: "/task/parity-probe", name: "屏二 面板主按钮 .panel__foot .btn--app", ref: [".panel__foot .btn--app", ""], live: ['[data-slot="button"]', "完成此项"], props: ["height", "borderRadius", "fontSize", "backgroundColor", "color"] },
  { page: "/task/parity-probe", name: "屏二 面板次按钮 .panel__foot .btn--ghost", ref: [".panel__foot .btn--ghost", ""], live: ['[data-slot="button"]', "稍后"], props: ["height", "borderRadius", "paddingRight", "color", "borderTopColor"] },
  // 悬浮 pill 的落点在落地页 Hero（.lp-hero__visual .ai-pill）；屏二那枚要等 /task 有真实任务才谈得上
  { page: "/", name: "Hero 悬浮 AI pill", ref: [".lp-hero__visual .ai-pill", ""], live: ['[data-slot="ai-pill"]', ""], props: ["borderRadius", "backgroundColor", "color", "fontSize", "padding", "gap"] },

  // ── §1.3 / §2 落地页 ──
  { page: "/", name: "Hero 大标题 .h-hero", ref: [".h-hero", ""], live: ["h1", ""], props: ["fontSize", "lineHeight", "fontWeight", "letterSpacing", "color"] },
  { page: "/", name: "章节标题 .h-sec.sm", ref: [".h-sec.sm", ""], live: ["main section h2", ""], props: ["fontSize", "lineHeight", "fontWeight", "letterSpacing"] },
  { page: "/", name: "Hero 说明文 .hero-lede", ref: [".hero-lede", ""], live: ["main p", "说出你想学什么"], props: ["fontSize", "lineHeight", "color", "maxWidth"] },
  { page: "/", name: "主按钮墨色药丸", ref: [".btn--primary", ""], live: ["main a, main button", "开始规划我的目标"], props: ["height", "borderRadius", "padding", "backgroundColor", "color", "fontSize"] },
  { page: "/", name: "次按钮描边药丸", ref: [".btn--ghost", ""], live: ["main a, main button", "看看它怎么工作"], props: ["height", "borderRadius", "padding", "backgroundColor", "color", "borderTopColor"] },
  { page: "/", name: "深底按钮 .btn--on-dark", ref: [".btn--on-dark", "复制部署命令"], live: ["main a, main button", "复制部署命令"], props: ["height", "borderRadius", "color", "backgroundColor"] },
  { page: "/", name: "色带上内距 100", ref: [".lp-band--light", ""], live: ["#sec-how", ""], props: ["paddingTop", "paddingBottom", "backgroundColor"] },
  { page: "/", name: "吸顶导航", ref: [".lp-nav", ""], live: ["header", ""], props: ["position", "height", "backgroundColor", "backdropFilter"] },
  { page: "/", name: "GitHub 深色卡", ref: [".gh-card", ""], live: ['[data-slot="card"][data-tone="dark"]', "TalkTask"], props: ["backgroundColor", "borderRadius", "color", "borderTopWidth"] },
  { page: "/", name: "订阅输入框", ref: [".subscribe input", ""], live: ['input[type="email"], input[type="text"]', ""], props: ["height", "borderRadius", "backgroundColor", "borderTopColor"] },
  { page: "/", name: "页脚深色带", ref: [".lp-foot", ""], live: ["footer", ""], props: ["backgroundColor", "color", "paddingTop"] },
];

// next/font 会往栈里插 "X Fallback" 占位名，不影响实际字形，比较时剔掉并去重
const norm = (v) => [...new Set((v || "").split(",").map((x) => x.trim().replace(/ ?Fallback("?)$/, "$1")))].join(",");

const probe = (metrics) => {
  const all = [...document.querySelectorAll("*")];
  return metrics.map(({ name, sel, anchor, props }) => {
    const cands = [...document.querySelectorAll(sel)];
    let el = anchor ? cands.find((e) => (e.textContent || "").includes(anchor)) : cands[0];
    if (!el && anchor) {
      // 退一步：找包含该文本的最小叶子，再向上回到该选择器
      const leaf = all.find((e) => e.children.length === 0 && (e.textContent || "").includes(anchor));
      el = leaf ? leaf.closest(sel) : null;
    }
    if (!el) return { name, miss: sel };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { name, w: Math.round(r.width), h: Math.round(r.height), vals: Object.fromEntries(props.map((p) => [p, cs[p]])) };
  });
};

const wanted = METRICS.filter((m) => !PAGE || m.page === PAGE);
const byPage = [...new Set(wanted.map((m) => m.page))];
const results = {};

{
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: VIEW })).newPage();
  await page.goto(REF, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log("设计稿导航失败", String(e).slice(0, 70)));
  await page.waitForTimeout(900);
  results["设计稿"] = await page.evaluate(probe, wanted.map((m) => ({ name: m.name, sel: m.ref[0], anchor: m.ref[1], props: m.props })));
  await browser.close();
}

for (const route of byPage) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: VIEW })).newPage();
  await page.goto(LIVE + route, { waitUntil: "domcontentloaded", timeout: 90000 }).catch((e) => console.log(`${route} 导航失败`, String(e).slice(0, 70)));
  await page.waitForTimeout(2600);
  const sub = wanted.filter((m) => m.page === route);
  results[route] = await page.evaluate(probe, sub.map((m) => ({ name: m.name, sel: m.live[0], anchor: m.live[1], props: m.props })));
  await browser.close();
}

let hard = 0, soft = 0, ok = 0;
const refByName = new Map(results["设计稿"].map((x) => [x.name, x]));
const liveByName = new Map(byPage.flatMap((r) => results[r].map((x) => [x.name, x])));
console.log(`\n视口 ${VIEW.width}×${VIEW.height} —— ${decodeURIComponent(REF.split("/").pop())} (设计真源) vs ${LIVE}`);
for (const m of wanted) {
  const a = refByName.get(m.name) || { miss: m.ref[0] };
  const b = liveByName.get(m.name) || { miss: m.live[0] };
  if (a.miss && b.miss) { console.log(`▹ ${m.name}\n   两侧都无元素`); continue; }
  if (a.miss) { soft++; console.log(`▹ ${m.name}\n   ⚠ 设计稿缺 ${a.miss}（稿改了就到这儿更新选择器）`); continue; }
  if (b.miss) { soft++; console.log(`▹ ${m.name}\n   ⚠ 实现缺 ${b.miss}（多为无数据被条件渲染门掉）`); continue; }
  const delta = m.props.filter((p) => norm(a.vals[p]).slice(0, 30) !== norm(b.vals[p]).slice(0, 30));
  if (delta.length) {
    hard++;
    console.log(`▹ ${m.name}  ${delta.length} 项不一致`);
    for (const p of delta) console.log(`     ${p.padEnd(14)} 设计稿 ${a.vals[p]}   |   实现 ${b.vals[p]}`);
  } else ok++;
}
console.log(`\n════ 对等结论：${ok} 项 ✓ 一致 / ${hard} 项硬偏差 / ${soft} 项缺元素待查 ════`);
process.exit(hard ? 1 : 0);
