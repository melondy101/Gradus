/**
 * 色值静态闸 —— 防止组件里重新散落硬编码十六进制色（审计报告 §3.3-4 / §164）。
 * 设计令牌单一真源是 globals.css；组件应通过 design-tokens.ts 的 T/tokens() 或
 * Tailwind 语义类取色，而不是写死 #RRGGBB。
 *
 * 存量债用基线冻结：scripts/color-baseline.json 记录每个文件当前的硬编码色数量。
 *   - 数量增加 或 出现基线外的新违规文件  → 失败（防止继续恶化）。
 *   - 数量减少                              → 通过，并提示收紧基线。
 * 允许 `var(--x, #hex)` 形式的回退值：这类色是 SSR 首帧兜底，由
 * design-token-parity.test.ts 保证与 :root 真源逐条相等，不算硬编码。
 * 白名单：design-tokens.ts / opengraph / manifest（元数据与令牌定义本身）。
 *
 * 用法：
 *   node scripts/color-audit.mjs                # 校验
 *   node scripts/color-audit.mjs --write-baseline  # 用当前实测重建基线
 * 有回归即非零退出。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIR = join(ROOT, "src/components");
const BASELINE_PATH = join(ROOT, "scripts/color-baseline.json");
const WRITE = process.argv.includes("--write-baseline");

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
// 先剔除合法的 var(--x, #hex) 回退，再剔除注释，最后计数
const VAR_FALLBACK = /var\(\s*--[a-zA-Z0-9_-]+\s*,\s*#[0-9a-fA-F]{3,8}\s*\)/g;

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

function isWhitelisted(rel) {
  return /(design-tokens|opengraph|manifest)/.test(rel);
}

function countHexes(file) {
  const src = readFileSync(file, "utf8");
  const cleaned = stripComments(src).replace(VAR_FALLBACK, "");
  return (cleaned.match(HEX) || []).length;
}

const files = walk(SCAN_DIR)
  .map((f) => relative(ROOT, f).replace(/\\/g, "/"))
  .filter((rel) => !isWhitelisted(rel))
  .map((rel) => ({ rel, count: countHexes(join(ROOT, rel)) }))
  .filter((x) => x.count > 0);

const measured = Object.fromEntries(files.map((f) => [f.rel, f.count]));

if (WRITE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(measured, null, 2) + "\n");
  const total = files.reduce((s, f) => s + f.count, 0);
  console.log(`✓ 已写入色值基线：${files.length} 个文件 / 共 ${total} 处硬编码色`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error("✗ 缺少 scripts/color-baseline.json —— 先运行 `node scripts/color-audit.mjs --write-baseline`");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const regressions = [];
const improved = [];

for (const { rel, count } of files) {
  const base = baseline[rel];
  if (base === undefined) regressions.push(`${rel}: 新增违规文件（${count} 处，基线未登记）`);
  else if (count > base) regressions.push(`${rel}: ${count} 处 > 基线 ${base} 处（+${count - base}）`);
  else if (count < base) improved.push(`${rel}: ${count} 处 < 基线 ${base} 处（可收紧 -${base - count}）`);
}

// 基线里有、但实测已归零的文件，也提示可收紧
for (const rel of Object.keys(baseline)) {
  if (measured[rel] === undefined) improved.push(`${rel}: 已清零（基线 ${baseline[rel]} 处可移除）`);
}

const total = files.reduce((s, f) => s + f.count, 0);

if (regressions.length) {
  console.error(`✗ 色值静态闸：检出 ${regressions.length} 项回归`);
  for (const r of regressions) console.error("  - " + r);
  console.error("\n组件请改用 design-tokens.ts 的 T/tokens() 或 Tailwind 语义类取色。");
  process.exit(1);
}

console.log(`✓ 色值静态闸通过：${files.length} 个文件 / 共 ${total} 处硬编码色（未超基线）`);
if (improved.length) {
  console.log("提示：以下文件债务已减少，可用 `--write-baseline` 收紧基线：");
  for (const i of improved) console.log("  · " + i);
}
