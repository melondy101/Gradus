/**
 * ds-check-tokens —— rules.md R3/R4/R5/R6 的确定性闸：
 * 扫描裸色值（hex / rgb / Tailwind 默认调色板类）、裸字号（任意值 + 默认命名字号 + 内联 fontSize）、
 * 档位外间距（任意值 px + 档位外数字档 + 内联 padding/margin/gap）、裸圆角。
 * 输出「文件:行:违规值:最近 Token」；存量债冻结在 tokens-baseline.json（棘轮：只许减不许增）。
 *
 * 用法：
 *   node scripts/ds-check/ds-check-tokens.mjs                  # 校验（有回归即非零退出）
 *   node scripts/ds-check/ds-check-tokens.mjs --write-baseline # 用当前实测重建基线
 *   node scripts/ds-check/ds-check-tokens.mjs --json           # 结构化输出
 */
import { join } from "node:path";
import {
  ROOT, scanScope, cleanedLines, loadBaseline, ratchet, writeBaseline, isMain,
  parseTokenRegistry, nearestIn, nearestColor, TEXT_LADDER, RADIUS_LADDER, SPACE_LADDER,
} from "./_lib.mjs";

const BASELINE_PATH = join(ROOT, "scripts", "ds-check", "tokens-baseline.json");
const WRITE = process.argv.includes("--write-baseline");
const JSON_OUT = process.argv.includes("--json");

// 令牌定义镜像文件本身允许出现字面值（与 audit:colors 白名单同理由）
function isWhitelisted(rel) {
  return /(design-tokens|theme-config|opengraph|manifest)/.test(rel);
}

// Tailwind 默认调色板（品牌令牌占用名 accent/card/error… 不在列）
const PALETTE =
  "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const RE_PALETTE = new RegExp(
  `\\b(?:bg|text|border|ring|fill|stroke|from|to|via|decoration|divide|outline|caret)-(?:${PALETTE})(?:-\\d{2,3})?\\b`,
  "g",
);
const RE_HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RE_RGB = /\brgba?\([^)]*\)/g;
const RE_TEXT_ARBITRARY = /\btext-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
const RE_TEXT_NAMED = /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g;
const TEXT_NAMED_PX = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48, "6xl": 60, "7xl": 72, "8xl": 96, "9xl": 128 };
// 间距（阻断类前缀）；宽高/定位归 size-info 只记录不阻断
const RE_SPACING_ARBITRARY = /\b(p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y)-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
const SPACE_ALLOWED = new Set([0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]);
const RE_SPACING_NAMED = /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.\d+)?)\b/g;
const RE_RADIUS_ARBITRARY = /\brounded-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
const RE_INLINE_BLOCK =
  /\b(fontSize|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingX|paddingY|margin|marginTop|marginBottom|marginLeft|marginRight|gap|rowGap|columnGap|borderRadius)\s*:\s*["']?(\d+(?:\.\d+)?)\s*(px)?["']?[,\s}]/g;
const RE_SIZE_INFO = /\b(w|h|min-w|min-h|max-w|max-h|top|bottom|left|right|inset|size|basis)-\[(\d+(?:\.\d+)?)(px|rem)\]/g;

const VAR_FALLBACK = /var\(\s*--[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\s*\)/g;
const toPx = (v, unit) => (unit === "rem" ? parseFloat(v) * 16 : parseFloat(v));
const spaceToken = (px) => {
  // 就近吸附到档位（不发明新档位）
  let best = SPACE_LADDER[0];
  for (const v of SPACE_LADDER) if (Math.abs(v - px) < Math.abs(best - px)) best = v;
  const n = best / 4;
  return `--space-${Number.isInteger(n) ? n : n.toFixed(1)}（${best}px）`;
};

export async function runCheck() {
  const { names: _reg, lightValues } = parseTokenRegistry();
  const violations = [];
  const sizeInfo = [];

  for (const abs of scanScope()) {
    const rel = abs.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (isWhitelisted(rel)) continue;
    for (const { no, text } of cleanedLines(abs)) {
      const t = text.replace(VAR_FALLBACK, "");
      const push = (category, value, nearest) =>
        violations.push({ file: rel, line: no, category, value, nearest, blocking: true });
      const info = (value, nearest) =>
        sizeInfo.push({ file: rel, line: no, category: "size-info", value, nearest, blocking: false });

      for (const m of t.matchAll(RE_HEX)) push("color-hex", m[0], nearestColor(m[0], lightValues)?.name ?? "无近似 Token");
      for (const m of t.matchAll(RE_RGB)) push("color-rgb", m[0], "改用 var(--token) 或 T.*");
      for (const m of t.matchAll(RE_PALETTE)) push("color-palette", m[0], "改用品牌语义类（bg-card/text-ink…）");
      for (const m of t.matchAll(RE_TEXT_ARBITRARY)) {
        const px = toPx(m[1], m[2]);
        push("font-size", m[0], `${nearestIn(TEXT_LADDER, px)?.name}（${nearestIn(TEXT_LADDER, px)?.v}px）`);
      }
      for (const m of t.matchAll(RE_TEXT_NAMED)) {
        const px = TEXT_NAMED_PX[m[1]];
        push("font-size", m[0], `${nearestIn(TEXT_LADDER, px)?.name}（${nearestIn(TEXT_LADDER, px)?.v}px）`);
      }
      for (const m of t.matchAll(RE_SPACING_ARBITRARY)) {
        const px = toPx(m[2], m[3]);
        push("spacing", m[0], spaceToken(px));
      }
      for (const m of t.matchAll(RE_SPACING_NAMED)) {
        const v = parseFloat(m[2]);
        if (!SPACE_ALLOWED.has(v)) push("spacing", m[0], `${spaceToken(v * 4)}（档位外数字档）`);
      }
      for (const m of t.matchAll(RE_RADIUS_ARBITRARY)) {
        const px = toPx(m[1], m[2]);
        push("radius", m[0], `${nearestIn(RADIUS_LADDER, px)?.name}（${nearestIn(RADIUS_LADDER, px)?.v}px）`);
      }
      for (const m of t.matchAll(RE_INLINE_BLOCK)) {
        const px = parseFloat(m[2]);
        const isFont = m[1] === "fontSize";
        const isRadius = m[1] === "borderRadius";
        const isSpace = /^(padding|margin|gap|rowGap|columnGap)/.test(m[1]);
        if (isFont) push("font-size", `${m[1]}: ${m[2]}px`, `${nearestIn(TEXT_LADDER, px)?.name}`);
        else if (isRadius) push("radius", `${m[1]}: ${m[2]}px`, `${nearestIn(RADIUS_LADDER, px)?.name}`);
        else if (isSpace) push("spacing", `${m[1]}: ${m[2]}px`, spaceToken(px));
      }
      for (const m of t.matchAll(RE_SIZE_INFO)) info(m[0], "记录不阻断（组件固有尺寸）");
    }
  }

  const measured = {};
  for (const v of violations) measured[v.file] = (measured[v.file] ?? 0) + 1;

  if (WRITE) {
    const { files, total } = writeBaseline(BASELINE_PATH, measured);
    return { ok: true, wroteBaseline: true, summary: `已写入 Token 基线：${files} 个文件 / 共 ${total} 处阻断级违规（冻结存量）`, violations, sizeInfo };
  }
  const baseline = loadBaseline(BASELINE_PATH);
  const result = ratchet({ baseline, measured, baselinePath: BASELINE_PATH, script: "ds-check-tokens" });
  const blockingTotal = Object.values(measured).reduce((s, n) => s + n, 0);
  const ok = baseline === null ? false : result.ok; // 缺基线视为未初始化 → 失败并提示
  return {
    ok,
    needsBaseline: baseline === null,
    violations,
    sizeInfo,
    regressions: result.regressions,
    improved: result.improved,
    summary: baseline === null
      ? `✗ 缺少 ${BASELINE_PATH.replace(ROOT + "\\", "")} —— 先运行 --write-baseline 冻结存量`
      : `阻断级违规共 ${blockingTotal} 处 / ${Object.keys(measured).length} 个文件（存量基线棘轮${result.ok ? "：未恶化" : "：已恶化"}）`,
  };
}

async function main() {
  const r = await runCheck();
  if (JSON_OUT) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log("── ds-check-tokens（rules.md R3/R4/R5/R6）──");
    console.log(r.summary);
    if (r.violations?.length) {
      console.log("\n违规清单（文件:行:违规值:最近 Token）：");
      for (const v of r.violations) console.log(`  ${v.file}:${v.line}: ${v.value} → ${v.nearest}`);
    }
    if (r.sizeInfo?.length) console.log(`\n（另有 ${r.sizeInfo.length} 处任意值宽高/定位，仅记录不阻断）`);
    if (r.regressions?.length) { console.log("\n基线回归："); for (const x of r.regressions) console.log("  - " + x); }
    if (r.improved?.length) {
      console.log("\n债务已减少，可用 --write-baseline 收紧：");
      for (const x of r.improved) console.log("  · " + x);
    }
  }
  if (!r.ok) process.exit(1);
}

if (isMain(import.meta)) main();
