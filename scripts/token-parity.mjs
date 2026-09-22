/**
 * 令牌对等实测 —— 设计真源 output/拾级Gradus-设计预览.html 的 `:root` 里
 * 逐条声明了 §1.2 的色彩 / 字体 / 圆角令牌。这个脚本把那份声明与实现里
 * 同名自定义属性的**计算值**对表，防的就是「令牌名对上了、值悄悄漂了」
 * （实测过：--accent-soft 曾经亮色 .14、暗色 .16，而设计稿写 .16，
 * 只有量的时候才看得见）。
 *
 * 颜色一律涂到白底取像素再比：设计稿写 #F5C518，Tailwind v4 可能编译成
 * oklab(...) 或 color-mix(...)，字符串永远对不上，但同一个色能对上像素。
 * 字体族只比「设计稿点名的前两个 family 是否也在实现栈里」——
 * 实现走 next/font，会把 Noto Sans SC 之类换成本地打包的带 hash 族名，
 * 整串比较必然假红。
 *
 * 用法：node scripts/token-parity.mjs [--base=http://localhost:3111] [--page=/app]
 * 有偏差即非零退出。
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const h = argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.split("=").slice(1).join("=") : d;
};
const BASE = arg("base", "http://localhost:3111");
const PAGE = arg("page", "/app");
const DESIGN = resolve("output/拾级Gradus-设计预览.html");

/** 解析设计稿 :root{…}：去注释、按行取 name: value */
function parseDesignTokens(html) {
  const open = html.indexOf(":root{");
  if (open < 0) throw new Error("设计稿里找不到 :root{ 块");
  const close = html.indexOf("}", open);
  const block = html
    .slice(open + ":root{".length, close)
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const out = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/**
 * 设计稿 :root 里声明但自己从不引用的令牌——只是留给评审做对照的存档值，
 * 实现侧不该为它凭空造一个属性。判定依据（不是猜）：
 *   --text-3-spec  稿内注释「仅存档，不参与渲染」
 *   --hairline-dark 全文件 grep 只有声明处 1 处、零引用；#评审要点 里
 *                   它作为文字色被判 1.66:1 不达标、已换成 rgba(cream,.72)。
 *                   深底描边用的是 --bd-dark #2B2924。
 */
const ARCHIVE_ONLY = new Set(["--text-3-spec", "--hairline-dark"]);

const design = parseDesignTokens(readFileSync(DESIGN, "utf8"));
const names = Object.keys(design).filter((n) => !ARCHIVE_ONLY.has(n));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("gradus_onboarding_completed_v1", "true");
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
await page.goto(`${BASE}${PAGE}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(1500);

const live = await page.evaluate((keys) => {
  const cs = getComputedStyle(document.documentElement);
  const raw = {};
  for (const k of keys) raw[k] = cs.getPropertyValue(k).trim();
  // 实现里不少令牌是 var() 转指（--color-x: var(--x)），先把引用解开一层层
  const deref = (v) =>
    v.replace(/var\((--[a-z0-9-]+)\s*,?\s*[^)]*\)/gi, (m, name) => raw[name] ?? (raw[name] = cs.getPropertyValue(name).trim()) ?? m);
  const resolved = {};
  for (const k of keys) {
    let v = raw[k] || "";
    for (let i = 0; i < 6 && v.includes("var("); i++) v = deref(v);
    resolved[k] = v;
  }
  const ow = (v) => {
    if (!v) return undefined;
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const x = c.getContext("2d");
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 1, 1);
    x.fillStyle = v;
    if (x.fillStyle !== v && !/#[0-9a-f]{3,8}/i.test(v)) {
      // canvas 不接受这个写法（例如仍带 var()）→ 放弃涂色，退回字符串比较
      return undefined;
    }
    x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return d[3] === 0 ? "transparent" : [d[0], d[1], d[2]].join(",");
  };
  const out = {};
  for (const k of keys) {
    const v = resolved[k];
    out[k] = v
      ? { raw: v, rgb: ow(v), list: v.split(/["',]+/).map((s) => s.trim()).filter(Boolean) }
      : null;
  }
  return out;
}, names);

await browser.close();

/** 同一个色但写法不同（#F5C518 / rgb(...) / rgba(...,.72) / 0.72 vs .72）都要判等 */
const canon = (s) => s.replace(/\s+/g, "").toLowerCase().replace(/,(\d)/g, ",0$1").replace(/0\.(\d)/g, ".$1");
const LOOKS_COLOR = /^(#|rgb|rgba|oklab|oklch|hsl|color-mix|var\()/i;

let fails = 0;
const rows = [];
for (const name of names) {
  const want = design[name];
  const got = live[name];
  if (!got) {
    rows.push({ name, verdict: "MISSING", want, got: "（实现里没有这个自定义属性）" });
    fails++;
    continue;
  }
  if (/^--(sans|mono)$/.test(name)) {
    // 字体栈：只要求设计稿点名的前两个 family 也在栈里（忽略 next/font 的 hash 族名）
    const wantFams = want.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")).slice(0, 2) ?? [];
    const missing = wantFams.filter((f) => !got.list.some((g) => g === f || g.startsWith(f)));
    if (missing.length) {
      rows.push({ name, verdict: "FONT?", want, got: got.raw });
      fails++;
    } else {
      rows.push({ name, verdict: "ok", want: `含 ${wantFams.join(" + ")}`, got: got.raw.slice(0, 46) });
    }
    continue;
  }
  // 两侧都折成「涂在 #fff 上的实际像素」再比：设计稿的字面量都是 hex / rgba，
  // 实现侧可能是 oklab / color-mix / 小数点写法差异，字符串永远对不上。
  const overWhite = (r, g, b, a) =>
    [r, g, b].map((c) => Math.round(c * a + 255 * (1 - a))).join(",");
  function parseColor(v) {
    const s = v.trim();
    let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
      return overWhite(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1);
    }
    m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      const [r, g, b] = p;
      const a = p.length > 3 ? p[3] : 1;
      if ([r, g, b].some(Number.isNaN)) return undefined;
      return overWhite(r, g, b, Number.isNaN(a) ? 1 : a);
    }
    return undefined;
  }
  const wantRGB = parseColor(want);
  const sameColor = wantRGB !== undefined && got.rgb === wantRGB;
  if (sameColor || canon(want) === canon(got.raw) || (LOOKS_COLOR.test(want) && !got.rgb)) {
    if (LOOKS_COLOR.test(want) && !got.rgb) {
      rows.push({ name, verdict: "SKIP", want, got: got.raw + "（涂色取不到像素，仅按字符串比）" });
    } else {
      rows.push({ name, verdict: "ok", want: sameColor ? `${want} → ${wantRGB}` : want, got: got.raw });
    }
    continue;
  }
  rows.push({ name, verdict: "DIFF", want, got: got.raw });
  fails++;
}

console.log(`\n令牌对等 —— 设计真源 :root vs ${BASE}${PAGE} 计算值（共 ${names.length} 条，不含仅存档项）\n`);
for (const r of rows) {
  const mark = r.verdict === "ok" ? "✓" : "✗";
  console.log(`  ${mark} ${r.verdict.padEnd(7)} ${r.name.padEnd(14)} 设计 ${r.want}   实现 ${r.got}`);
}
console.log(`\n════ 令牌对等结论：${fails ? `${fails} 项偏差` : "全部通过"} ════`);
process.exit(fails ? 1 : 0);
