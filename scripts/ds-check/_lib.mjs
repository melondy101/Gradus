/**
 * ds-check 共享库：文件遍历、注释剥离、基线棘轮、令牌注册表、最近 Token 推断。
 * 被 ds-check-tokens / ds-check-imports / ds-check-vars / ds-report 复用。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = process.cwd();
export const DOCS_DIR = join(ROOT, "docs", "design-system");
export const AUDITS_DIR = join(DOCS_DIR, "audits");

/** 递归收集扩展名匹配的文件（绝对路径） */
export function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** 扫描域：组件 + 页面 + lib（相对路径，统一 / 分隔）；测试文件不算 UI 代码 */
export function scanScope() {
  return ["src/components", "src/app", "src/lib"].flatMap((d) =>
    walk(join(ROOT, d), [".tsx", ".ts"]),
  ).filter((f) => !/\.test\.(ts|tsx)$/.test(f));
}

/** 剥离块注释与行注释（保护 https:// 的 //） */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(?<!:)\/\/[^\n]*/g, "");
}

/** 带行号的已清理源码行：字符级扫描跟踪块注释状态，行注释按行剥离（保护 https://） */
export function cleanedLines(file) {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n");
  let inBlock = false;
  return lines.map((line, i) => {
    let out = "";
    for (let j = 0; j < line.length; j++) {
      if (!inBlock && line[j] === "/" && line[j + 1] === "*") { inBlock = true; j++; continue; }
      if (inBlock && line[j] === "*" && line[j + 1] === "/") { inBlock = false; j++; continue; }
      if (!inBlock) out += line[j];
    }
    // 行注释剥离：保护 https:// 等协议双斜杠
    out = out.replace(/(?<!:)\/\/[^\n]*/g, "");
    return { no: i + 1, text: out, raw: line };
  });
}

// ── 基线棘轮：文件→违规数，只许减不许增 ────────────────────────────────
export function loadBaseline(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function ratchet({ baseline, measured, baselinePath, script }) {
  const regressions = [];
  const improved = [];
  for (const [rel, count] of Object.entries(measured)) {
    const base = baseline?.[rel];
    if (baseline === null) continue; // 无基线时仅报告
    if (base === undefined) regressions.push(`${rel}: 新增违规文件（${count} 处，基线未登记）`);
    else if (count > base) regressions.push(`${rel}: ${count} 处 > 基线 ${base} 处（+${count - base}）`);
    else if (count < base) improved.push(`${rel}: ${count} 处 < 基线 ${base} 处（可收紧 -${base - count}）`);
  }
  if (baseline !== null) {
    for (const rel of Object.keys(baseline)) {
      if (measured[rel] === undefined) improved.push(`${rel}: 已清零（基线 ${baseline[rel]} 处可移除）`);
    }
  }
  const ok = baseline === null ? true : regressions.length === 0;
  return { ok, regressions, improved, baselinePath, script };
}

export function writeBaseline(path, measured) {
  writeFileSync(path, JSON.stringify(measured, null, 2) + "\n");
  const total = Object.values(measured).reduce((s, n) => s + n, 0);
  return { files: Object.keys(measured).length, total };
}

// ── 令牌注册表：从 globals.css 解析 ───────────────────────────────────
export function parseTokenRegistry() {
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  const names = new Set();
  const lightValues = new Map(); // 浅色主题值 → 名称（最近 Token 推断用）
  const re = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm;
  let m;
  while ((m = re.exec(css))) {
    names.add(m[1]);
    const val = m[2].trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(val) && !lightValues.has(val.toLowerCase())) {
      lightValues.set(val.toLowerCase(), m[1]);
    }
  }
  return { names, lightValues };
}

export const TEXT_LADDER = [
  ["--text-2xs", 9.5], ["--text-micro", 10], ["--text-caption", 11], ["--text-body-sm", 12],
  ["--text-body", 13], ["--text-body-lg", 15], ["--text-title-sm", 17], ["--text-title", 19],
];
export const RADIUS_LADDER = [
  ["--radius-chip-sm", 4], ["--radius-tag", 6], ["--radius-tile", 8], ["--radius-icon", 10],
  ["--radius-field", 12], ["--radius-card", 16], ["--radius-popover", 20], ["--radius-2xl", 24],
  ["--radius-pill", 999],
];
export const SPACE_LADDER = [2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

export function nearestIn(ladder, px) {
  let best = null;
  for (const [name, v] of ladder) {
    const d = Math.abs(v - px);
    if (!best || d < best.d) best = { name, v, d };
  }
  return best;
}

export function nearestColor(hex, lightValues) {
  const h = hex.replace("#", "");
  const full = h.length <= 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  let best = null;
  for (const [val, name] of lightValues) {
    const t = val.replace("#", "");
    const trgb = [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16));
    const d = rgb.reduce((s, v, i) => s + (v - trgb[i]) ** 2, 0);
    if (!best || d < best.d) best = { name, val, d };
  }
  return best;
}

// ── CLI 入口守卫与 JSON 输出 ──────────────────────────────────────────
/** 用调用方传入的 import.meta 比较（在 _lib 内读 import.meta.url 会拿到本文件） */
export function isMain(meta) {
  return Boolean(process.argv[1]) && meta.url === pathToFileURL(process.argv[1]).href;
}

export function groupByFile(violations) {
  const out = new Map();
  for (const v of violations) {
    if (!out.has(v.file)) out.set(v.file, []);
    out.get(v.file).push(v);
  }
  return out;
}

export function printViolations(violations) {
  const byFile = groupByFile(violations);
  for (const [file, list] of byFile) {
    console.log(`\n  ${file}`);
    for (const v of list) {
      console.log(`    :${v.line}: ${v.value}  → 最近 ${v.nearest}`);
    }
  }
}
