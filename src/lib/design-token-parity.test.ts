import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES } from "./theme-config";

// 令牌镜像一致性：design-tokens.ts 与 theme-config.ts 的 fallback/色值
// 必须逐条等于 globals.css 的真源值（审计报告 §3.3-2）。纯文本解析，
// 不 import design-tokens.ts —— 避免测试运行时依赖 DOM（tokens()）。

const root = join(import.meta.dir, "..", "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const tokensSrc = readFileSync(join(root, "src/lib/design-tokens.ts"), "utf8");

/** 归一化色值：去空白、小写，数字统一（0.16 === .16），十六进制小写 */
function norm(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\d*\.\d+|\d+/g, (m) => String(parseFloat(m)));
}

/** 取某个选择器块内的 `--name: value;` 映射（块选择器须自带闭合 `}`） */
function cssBlockVars(selector: RegExp): Record<string, string> {
  const m = css.match(selector);
  if (!m) throw new Error(`globals.css 缺少块 ${selector}`);
  const body = m[0].slice(m[0].indexOf("{") + 1, m[0].lastIndexOf("}"));
  const vars: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const t = line.match(/^\s*(--[a-z0-9-]+):\s*([^;/]+);/);
    if (t) vars[t[1]] = t[2].trim();
  }
  return vars;
}

const LIGHT = cssBlockVars(/^:root\s*\{[\s\S]*?\n\}/m);
// CSS 自定义属性有继承：.dark 与各 data-theme 块只覆盖列出的变量，
// 未列出的（如 --accent、--accent-ink）沿用 :root。这里显式合并出「有效值」。
const DARK = { ...LIGHT, ...cssBlockVars(/^\.dark\s*\{[\s\S]*?\n\}/m) };
const THEMED = {
  forest: { ...LIGHT, ...cssBlockVars(/:root\[data-theme="forest"\]\s*\{[\s\S]*?\n\}/) },
  ocean: { ...LIGHT, ...cssBlockVars(/:root\[data-theme="ocean"\]\s*\{[\s\S]*?\n\}/) },
  rose: { ...LIGHT, ...cssBlockVars(/:root\[data-theme="rose"\]\s*\{[\s\S]*?\n\}/) },
};

/** 去掉行/块注释，避免文档注释里的示例 var(--x, …) 被误当成真源引用 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}
const tokensSrcClean = stripComments(tokensSrc);

// ── design-tokens.ts 的 var(--x, fallback) 表达式 ──────────────────────
function varExpressions(src: string): Array<{ cssVar: string; fallback: string }> {
  const out: Array<{ cssVar: string; fallback: string }> = [];
  // 允许一层嵌套括号，正确捕获 rgba(…) 这类回退值
  const re = /var\((--[a-z0-9-]+),\s*((?:[^()]|\([^()]*\))+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push({ cssVar: m[1], fallback: m[2].trim() });
  return out;
}

describe("design-tokens.ts ↔ globals.css", () => {
  test("T / BLOOM_CONFIG 的每个 var(--x, 回退) 与 :root 浅色值逐条相等", () => {
    const offenders: string[] = [];
    for (const { cssVar, fallback } of varExpressions(tokensSrcClean)) {
      const truth = LIGHT[cssVar];
      if (truth === undefined) {
        offenders.push(`${cssVar} 在 globals.css :root 中不存在`);
      } else if (norm(truth) !== norm(fallback)) {
        offenders.push(`${cssVar}: CSS=${truth} ≠ fallback=${fallback}`);
      }
    }
    expect(offenders, `漂移项:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("tokens()/STATIC_TOKENS 的 || 回退与 get() 的变量一致", () => {
    const re = /get\("(--[a-z0-9-]+)"\)\s*\|\|\s*"([^"]+)"/g;
    const offenders: string[] = [];
    let matched = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tokensSrcClean))) {
      matched++;
      const truth = LIGHT[m[1]];
      if (truth === undefined) offenders.push(`${m[1]} 不存在`);
      else if (norm(truth) !== norm(m[2])) offenders.push(`${m[1]}: ${truth} ≠ ${m[2]}`);
    }
    expect(matched).toBeGreaterThan(0); // 防止正则失配导致空转
    expect(offenders, `漂移项:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("STATIC_TOKENS 逐键对号 :root", () => {
    const staticBlock = tokensSrc.match(/STATIC_TOKENS\s*=\s*\{([\s\S]*?)\n\} as const/);
    expect(staticBlock).not.toBeNull();
    const map: Record<string, string> = {
      bg: "--cream", surface: "--card", soft: "--cream-light", line: "--bd-card",
      ink: "--ink", muted: "--text-2", subtle: "--text-3", band: "--dark",
      accent: "--accent", accentSoft: "--accent-soft",
      success: "--success", warning: "--warning", error: "--error",
    };
    const offenders: string[] = [];
    for (const [key, cssVar] of Object.entries(map)) {
      const m = staticBlock![1].match(new RegExp(`${key}:\\s*"([^"]+)"`));
      if (!m) { offenders.push(`STATIC_TOKENS.${key} 未找到`); continue; }
      if (norm(LIGHT[cssVar]) !== norm(m[1])) offenders.push(`${key}(${cssVar}): ${LIGHT[cssVar]} ≠ ${m[1]}`);
    }
    const bloom = staticBlock![1].match(/bloom:\s*\[([^\]]+)\]/);
    expect(bloom).not.toBeNull();
    const colors = [...bloom![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    colors.forEach((c, i) => {
      if (norm(LIGHT[`--bloom-${i + 1}`]) !== norm(c)) offenders.push(`bloom[${i}](${`--bloom-${i + 1}`}): ${LIGHT[`--bloom-${i + 1}`]} ≠ ${c}`);
    });
    expect(offenders, `漂移项:\n${offenders.join("\n")}`).toEqual([]);
  });
});

// ── theme-config.ts ↔ globals.css 各主题块 ─────────────────────────────
describe("theme-config.ts ↔ globals.css 主题块", () => {
  const MIRROR_TO_CSS_VAR = {
    bg: "--cream", surface: "--card", cardBg: "--card", soft: "--cream-light",
    line: "--bd-card", border: "--bd-card", ink: "--ink", muted: "--text-2",
    subtle: "--text-3", accent: "--accent", badgeBg: "--accent-soft",
    badgeText: "--accent-ink",
  } as const;

  function check(name: string, t: (typeof THEMES)[keyof typeof THEMES], vars: Record<string, string>) {
    const offenders: string[] = [];
    for (const [key, cssVar] of Object.entries(MIRROR_TO_CSS_VAR)) {
      const truth = vars[cssVar];
      const mirror = (t as Record<string, string | undefined>)[key];
      if (mirror === undefined) continue;
      if (truth === undefined) { offenders.push(`${name}: ${cssVar} 不存在`); continue; }
      if (norm(truth) !== norm(mirror)) offenders.push(`${name}.${key}(${cssVar}): CSS=${truth} ≠ theme=${mirror}`);
    }
    expect(offenders, `漂移项:\n${offenders.join("\n")}`).toEqual([]);
  }

  test("cream ↔ :root", () => check("cream", THEMES.cream, LIGHT));
  test("ink ↔ .dark", () => check("ink", THEMES.ink, DARK));
  test("forest ↔ [data-theme=forest]", () => check("forest", THEMES.forest, THEMED.forest));
  test("ocean ↔ [data-theme=ocean]", () => check("ocean", THEMES.ocean, THEMED.ocean));
  test("rose ↔ [data-theme=rose]", () => check("rose", THEMES.rose, THEMED.rose));

  test("历史别名已清除：globals.css 不再定义 --color-bg 等迁移期变量", () => {
    for (const dead of ["--color-bg:", "--color-surface:", "--color-soft:", "--color-line:", "--color-accent-hover:", "--color-secondary-accent:"]) {
      expect(css.includes(dead), `globals.css 仍含 ${dead}`).toBe(false);
    }
  });
});
