/**
 * ds-report —— 阶段三第一层汇总：跑三个确定性检查，输出固定格式报告并存档
 * （docs/design-system/audits/<日期>-ds-report.md + .json）。
 * 第二层（独立检查 Agent）的报告按同日期前缀手工/代理存档在同目录。
 *
 * 用法：node scripts/ds-check/ds-report.mjs
 * 退出码：三个检查全 ok = 0，否则 1。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, AUDITS_DIR, isMain } from "./_lib.mjs";
import { runCheck as tokensCheck } from "./ds-check-tokens.mjs";
import { runCheck as importsCheck } from "./ds-check-imports.mjs";
import { runCheck as varsCheck } from "./ds-check-vars.mjs";

export async function runReport() {
  const results = [];
  for (const [name, fn, rules] of [
    ["ds-check-tokens", tokensCheck, "R3 R4 R5 R6"],
    ["ds-check-imports", importsCheck, "R1 R2"],
    ["ds-check-vars", varsCheck, "R7 R8(脚本侧)"],
  ]) {
    const r = await fn();
    results.push({ name, rules, ok: r.ok, summary: r.summary, violations: r.violations ?? [], needsBaseline: !!r.needsBaseline });
  }
  const ok = results.every((r) => r.ok);
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { ok, results, date: now.toISOString(), localDate: local };
}

function markdown(report) {
  const rows = report.results
    .map((r) => `| \`${r.name}\` | ${r.rules} | ${r.ok ? "✅ exit 0" : "❌ exit 1"} | ${r.violations.length} 处 | ${r.summary} |`)
    .join("\n");
  return `# DS 体检报告（第一层 · 确定性脚本）

> 生成：${report.date} · **状态：provisional（签字点 ① 未签，基准未经人工确认）**

| 检查 | 规则 | 状态 | 违规 | 摘要 |
|---|---|---|---|---|
${rows}

- 存量债策略：基线棘轮（tokens/imports/vars-baseline.json），只许减不许增；新增违规即失败。
- R9（令牌三方一致）由 \`bun test\` 与 \`bun run audit:tokens\` 把管，不在本报告内。
- 第二层（独立检查 Agent 视觉/交互报告）应以同日期前缀存档于本目录。
`;
}

async function main() {
  const report = await runReport();
  mkdirSync(AUDITS_DIR, { recursive: true });
  const stamp = report.localDate;
  writeFileSync(join(AUDITS_DIR, `${stamp}-ds-report.json`), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(AUDITS_DIR, `${stamp}-ds-report.md`), markdown(report));

  console.log("── ds-report（阶段三第一层汇总）──");
  for (const r of report.results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}（${r.rules}）：${r.summary}`);
  }
  console.log(`\n报告已存档：docs/design-system/audits/${stamp}-ds-report.{md,json}`);
  if (!report.ok) {
    console.log("存在未通过项 —— 按 rules.md 阶段三流程：当场修复，重跑至清零。");
    process.exit(1);
  }
}

if (isMain(import.meta)) main();
