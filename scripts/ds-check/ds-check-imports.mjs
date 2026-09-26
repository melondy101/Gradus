/**
 * ds-check-imports —— rules.md R1/R2 的确定性闸：
 * R1 UI 原语只能从 @/components/ui/<file> 深路径导入，且导入的标识符必须是该文件真实导出；
 *    禁止 barrel 导入（ui/ 无 index）。
 * R2 ui/ 之外不得定义与 ui 导出同名的本地组件（原语遮蔽），也不得定义任何 *Button / *Pill
 *    本地组件；其他原语形态（*Card/*Modal 等域组件）归独立检查 Agent 判定。
 * 存量债冻结在 imports-baseline.json（棘轮）。
 *
 * 用法：node scripts/ds-check/ds-check-imports.mjs [--write-baseline] [--json]
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, scanScope, cleanedLines, loadBaseline, ratchet, writeBaseline, isMain } from "./_lib.mjs";

const BASELINE_PATH = join(ROOT, "scripts", "ds-check", "imports-baseline.json");
const WRITE = process.argv.includes("--write-baseline");
const JSON_OUT = process.argv.includes("--json");
const UI_DIR = join(ROOT, "src", "components", "ui");

/** ui 组件注册表：文件名 → 导出标识符集合 */
function uiRegistry() {
  const reg = new Map();
  for (const name of readdirSync(UI_DIR)) {
    if (!name.endsWith(".tsx")) continue;
    const src = readFileSync(join(UI_DIR, name), "utf8");
    const names = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)) {
      names.add(m[1]);
    }
    for (const m of src.matchAll(/export\s*(?:type)?\s*\{([^}]+)\}/g)) {
      for (const part of m[1].split(",")) {
        const id = part.trim().split(/\s+as\s+/).pop();
        if (id) names.add(id);
      }
    }
    reg.set(name.replace(/\.tsx$/, ""), names);
  }
  return reg;
}

const RE_UI_IMPORT = /import\s+(type\s+)?\{([^}]+)\}\s*from\s*["']@\/components\/ui(?:\/([\w-]+))?["']/g;
// 原语遮蔽 / 按钮类本地组件（域组件 *Card/*Modal 等交由独立检查 Agent）
const RE_SHADOW = new RegExp(
  `\\b(?:export\\s+)?(?:default\\s+)?(?:function|const)\\s+([A-Z][A-Za-z0-9_]*)\\s*[=(]`,
  "g",
);

// 薄封装白名单（签字点②③ 2026-09-26 人工批准，条款见 rules.md R2）：
// 仅组合 ui/ 原语、不含自有样式语言的组件，不视为私有原语。
const WRAPPER_ALLOWLIST = new Set([
  "src/components/home/mini-action-button.tsx:MiniActionButton",
  "src/components/landing/copy-command-button.tsx:CopyCommandButton",
  "src/components/home/subtask-detail-modal.tsx:AttrPill",
  "src/components/home/onboarding-tour.tsx:TourHelpButton",
]);

export async function runCheck() {
  const reg = uiRegistry();
  const allExports = new Set();
  for (const names of reg.values()) for (const n of names) allExports.add(n);
  const violations = [];

  for (const abs of scanScope()) {
    const rel = abs.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (rel.startsWith("src/components/ui/")) continue;
    for (const { no, text } of cleanedLines(abs)) {
      // R1 barrel / 未知文件 / 未知导出
      for (const m of text.matchAll(RE_UI_IMPORT)) {
        const [, , ids, file] = m;
        if (!file) {
          violations.push({ file: rel, line: no, rule: "R1", value: m[0], nearest: "ui/ 无 barrel —— 改为深路径导入" });
          continue;
        }
        const names = reg.get(file);
        if (!names) {
          violations.push({ file: rel, line: no, rule: "R1", value: `@/components/ui/${file}`, nearest: `ui/ 下不存在 ${file}.tsx` });
          continue;
        }
        for (const part of ids.split(",")) {
          const id = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
          if (id && !names.has(id)) {
            violations.push({ file: rel, line: no, rule: "R1", value: id, nearest: `${file}.tsx 未导出 ${id}` });
          }
        }
      }
      // R2 本地定义的原语遮蔽 / *Button / *Pill
      for (const m of text.matchAll(RE_SHADOW)) {
        const name = m[1];
        const isShadow = allExports.has(name);
        const isButtonish = /(?:Button|Pill)$/.test(name);
        if ((isShadow || isButtonish) && !WRAPPER_ALLOWLIST.has(`${rel}:${name}`)) {
          violations.push({
            file: rel, line: no, rule: "R2", value: `${name}`,
            nearest: isShadow
              ? "与 ui/ 导出重名（原语遮蔽）——改用 ui 组件或走补录流程"
              : "*Button/*Pill 本地组件——改用 ui/button 或走补录流程（签字点②）",
          });
        }
      }
    }
  }

  const measured = {};
  for (const v of violations) measured[v.file] = (measured[v.file] ?? 0) + 1;

  if (WRITE) {
    const { files, total } = writeBaseline(BASELINE_PATH, measured);
    return { ok: true, wroteBaseline: true, summary: `已写入导入基线：${files} 个文件 / 共 ${total} 处`, violations };
  }
  const baseline = loadBaseline(BASELINE_PATH);
  const result = ratchet({ baseline, measured, baselinePath: BASELINE_PATH, script: "ds-check-imports" });
  return {
    ok: baseline === null ? false : result.ok,
    needsBaseline: baseline === null,
    violations,
    regressions: result.regressions,
    improved: result.improved,
    summary: baseline === null
      ? "✗ 缺少 imports-baseline.json —— 先 --write-baseline 冻结存量"
      : `违规共 ${violations.length} 处（存量基线棘轮${result.ok ? "：未恶化" : "：已恶化"}）`,
  };
}

async function main() {
  const r = await runCheck();
  if (JSON_OUT) console.log(JSON.stringify(r, null, 2));
  else {
    console.log("── ds-check-imports（rules.md R1/R2）──");
    console.log(r.summary);
    if (r.violations?.length) {
      console.log("\n违规清单（文件:行:违规值:修复指引）：");
      for (const v of r.violations) console.log(`  ${v.file}:${v.line}: ${v.value} → ${v.nearest}`);
    }
    if (r.regressions?.length) { console.log("\n基线回归："); for (const x of r.regressions) console.log("  - " + x); }
    if (r.improved?.length) { console.log("\n可收紧："); for (const x of r.improved) console.log("  · " + x); }
  }
  if (!r.ok) process.exit(1);
}

if (isMain(import.meta)) main();
