/**
 * ds-check-vars —— rules.md R7/R8（脚本侧）：
 * 源码实际使用的 CSS 变量有三条路径，全部计入：
 *   1. var(--x) / getPropertyValue("--x") / 模板前缀 `--x-${`
 *   2. Tailwind 品牌类（bg-cream / text-body / rounded-card / shadow-md / animate-fill…）
 *      —— 类名先映射回 @theme 令牌（--color-* / --text-* / --radius-* / --shadow-* /
 *      --font-* / --animate-* / --duration-* / --ease-*），再经一层 alias（--color-cream:
 *      var(--cream)）传播到 :root 基名。
 * 与 globals.css 注册表求差集：未注册变量 = 违规；真零引用注册 Token = 废弃候选（信息，不阻断）。
 * 存量债冻结在 vars-baseline.json（棘轮）。
 *
 * 用法：node scripts/ds-check/ds-check-vars.mjs [--write-baseline] [--json]
 */
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { ROOT, scanScope, cleanedLines, loadBaseline, ratchet, writeBaseline, isMain, parseTokenRegistry } from "./_lib.mjs";

const BASELINE_PATH = join(ROOT, "scripts", "ds-check", "vars-baseline.json");
const WRITE = process.argv.includes("--write-baseline");
const JSON_OUT = process.argv.includes("--json");

const RE_VAR = /var\(\s*(--[\w-]+)/g;
const RE_GET = /getPropertyValue\(\s*["'](--[\w-]+)["']/g;
const RE_TEMPLATE_PREFIX = /`--([\w-]+)\$\{/g; // 动态变量名前缀，如 `--bloom-${i}`
// Tailwind 类 → 令牌命名空间（变体前缀 hover:/dark:/md: 等已在 cleanedLines 后仍存在，需剥离）
const COLOR_PREFIXES = new Set(["bg", "text", "border", "ring", "fill", "stroke", "from", "to", "via", "decoration", "divide", "outline", "caret", "accent", "shadow"]);
const RE_CLASS = /(?:[a-z0-9-]+:)*([a-z]+)-([a-z0-9]+[a-z0-9-]*)(?:\/\d{1,3})?\b/g;

function isWhitelisted(rel) {
  return /(opengraph|manifest)/.test(rel);
}

/** globals.css：@theme 别名（--color-cream: var(--cream)）与命名空间令牌集合 */
function parseThemeStructure(css) {
  const aliasToBase = new Map(); // --color-cream → --cream
  const nsTokens = new Map(); // 命名空间 → Set(短名)，如 color → {cream, ink, ...}
  const nsOf = { color: "--color-", text: "--text-", radius: "--radius-", shadow: "--shadow-", font: "--font-", animate: "--animate-", duration: "--duration-", ease: "--ease-" };
  for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    const name = m[1];
    for (const [ns, prefix] of Object.entries(nsOf)) {
      if (name.startsWith(prefix)) {
        if (!nsTokens.has(ns)) nsTokens.set(ns, new Set());
        nsTokens.get(ns).add(name.slice(prefix.length));
        const base = m[2].trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
        if (base) aliasToBase.set(name, base[1]);
      }
    }
  }
  return { aliasToBase, nsTokens };
}

export async function runCheck() {
  const { names } = parseTokenRegistry();
  // next/font 的 variable:"--x" 注册在 layout 运行时（不在 globals.css），并入注册表
  const layoutPath = join(ROOT, "src/app/layout.tsx");
  const layoutSrc = readFileSync(layoutPath, "utf8");
  for (const m of layoutSrc.matchAll(/variable:\s*["'](--[\w-]+)["']/g)) names.add(m[1]);
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  const { aliasToBase, nsTokens } = parseThemeStructure(css);
  const used = new Map(); // varName → [{file,line}]
  const usedPrefixes = [];
  const mark = (name, rel, no) => {
    if (!used.has(name)) used.set(name, []);
    used.get(name).push({ file: rel, line: no });
    const base = aliasToBase.get(name);
    if (base) mark(base, rel, no); // alias 使用传播到 :root 基名
  };
  // globals.css 自身的 var() 引用（如 --font-sans: var(--font-noto-sc)）也算使用
  for (const m of css.matchAll(RE_VAR)) mark(m[1], "src/app/globals.css", 0);

  for (const abs of scanScope()) {
    const rel = abs.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (isWhitelisted(rel)) continue;
    for (const { no, text } of cleanedLines(abs)) {
      for (const m of text.matchAll(RE_VAR)) mark(m[1], rel, no);
      for (const m of text.matchAll(RE_GET)) mark(m[1], rel, no);
      for (const m of text.matchAll(RE_TEMPLATE_PREFIX)) usedPrefixes.push(m[1]);
      for (const m of text.matchAll(RE_CLASS)) {
        const [, prefix, short] = m;
        if (prefix === "rounded" && nsTokens.get("radius")?.has(short)) mark(`--radius-${short}`, rel, no);
        else if (prefix === "animate" && nsTokens.get("animate")?.has(short)) mark(`--animate-${short}`, rel, no);
        else if (prefix === "font" && nsTokens.get("font")?.has(short)) mark(`--font-${short}`, rel, no);
        else if (prefix === "duration" && nsTokens.get("duration")?.has(short)) mark(`--duration-${short}`, rel, no);
        else if (prefix === "ease" && nsTokens.get("ease")?.has(short)) mark(`--ease-${short}`, rel, no);
        else if (COLOR_PREFIXES.has(prefix)) {
          if (nsTokens.get("color")?.has(short)) mark(`--color-${short}`, rel, no);
          // shadow-X 歧义：X 同时可能是阴影档令牌（shadow-md）
          if (prefix === "shadow" && nsTokens.get("shadow")?.has(short)) mark(`--shadow-${short}`, rel, no);
          // text-X 歧义：X 同时可能是字号令牌（text-body）
          if (prefix === "text" && nsTokens.get("text")?.has(short)) mark(`--text-${short}`, rel, no);
        }
      }
    }
  }

  // 未注册变量 = 违规
  const violations = [];
  for (const [name, hits] of used) {
    if (!names.has(name)) {
      for (const h of hits) {
        violations.push({ file: h.file, line: h.line, value: name, nearest: "globals.css 未注册此变量" });
      }
    }
  }
  const coveredByPrefix = (name) => usedPrefixes.some((p) => name.startsWith(p));
  const zeroRef = [...names].filter((n) => !used.has(n) && !coveredByPrefix(n));

  const measured = {};
  for (const v of violations) measured[v.file] = (measured[v.file] ?? 0) + 1;

  if (WRITE) {
    const { files, total } = writeBaseline(BASELINE_PATH, measured);
    return { ok: true, wroteBaseline: true, summary: `已写入变量基线：${files} 个文件 / 共 ${total} 处`, violations, zeroRef };
  }
  const baseline = loadBaseline(BASELINE_PATH);
  const result = ratchet({ baseline, measured, baselinePath: BASELINE_PATH, script: "ds-check-vars" });
  return {
    ok: baseline === null ? false : result.ok,
    needsBaseline: baseline === null,
    violations,
    zeroRef,
    regressions: result.regressions,
    improved: result.improved,
    summary: baseline === null
      ? "✗ 缺少 vars-baseline.json —— 先 --write-baseline 冻结存量"
      : `未注册变量违规 ${violations.length} 处；零引用注册 Token ${zeroRef.length} 个（废弃候选，不阻断）`,
  };
}

async function main() {
  const r = await runCheck();
  if (JSON_OUT) console.log(JSON.stringify(r, null, 2));
  else {
    console.log("── ds-check-vars（rules.md R7/R8 脚本侧）──");
    console.log(r.summary);
    if (r.violations?.length) {
      console.log("\n未注册变量（文件:行:变量名）：");
      for (const v of r.violations) console.log(`  ${v.file}:${v.line}: ${v.value}`);
    }
    if (r.zeroRef?.length) {
      console.log("\n零引用 Token（阶段五废弃候选）：");
      for (const z of r.zeroRef) console.log("  · " + z);
    }
    if (r.regressions?.length) { console.log("\n基线回归："); for (const x of r.regressions) console.log("  - " + x); }
  }
  if (!r.ok) process.exit(1);
}

if (isMain(import.meta)) main();
