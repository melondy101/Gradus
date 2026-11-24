/**
 * `bun run check:env` —— 部署前的环境变量自检。
 *
 * 用法：
 *   bun run check:env                  # 读取 .env.local / .env，输出逐项结论
 *   bun run check:env -- --mode local  # 本地开发口径（AUTH_SECRET 缺失只警告）
 *   bun run check:env -- --connect     # 额外实测数据库连通性与表结构
 *   bun run check:env -- --json        # 机器可读输出（Agent 消费）
 *
 * 退出码：有 error → 1；否则 0。**不输出任何密钥原文。**
 */

import fs from "node:fs";
import path from "node:path";

import { buildEnvReport, type EnvMap } from "./env-check";

const ROOT = process.cwd();
const ICONS: Record<string, string> = { ok: "✅", warn: "⚠️ ", error: "❌", info: "ℹ️ " };

function parseEnvFile(file: string): EnvMap {
  const out: EnvMap = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * 合并优先级：进程环境变量 > .env.local > .env（与 Next.js 行为一致）。
 *
 * 注意：Bun 运行时会把 `.env` / `.env.local` / `.env.<NODE_ENV>.local` 自动注入 process.env，
 * 所以「文件里的值」往往也出现在 process.env 里。归因时：值与文件一致 → 记文件来源；
 * 不一致 → 记 process.env（说明是外部注入的，更可能是真实生效值）。
 */
function loadEnv(extraFile?: string): { env: EnvMap; sources: EnvMap; files: string[] } {
  const sources: EnvMap = {};
  const env: EnvMap = {};
  const files = extraFile ? [extraFile] : [".env", ".env.local"];
  for (const file of files) {
    const parsed = parseEnvFile(path.join(ROOT, file));
    for (const [k, v] of Object.entries(parsed)) {
      env[k] = v;
      sources[k] = file;
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    const fromFile = sources[k];
    if (fromFile && env[k] !== v) {
      env[k] = v;
      sources[k] = "process.env";
    } else if (!fromFile) {
      env[k] = v;
      sources[k] = "process.env";
    }
  }
  return { env, sources, files };
}

interface SqlClient {
  unsafe: (query: string) => Promise<Record<string, unknown>[]>;
  end: (options?: unknown) => Promise<void>;
}

/** postgres.js 的连接失败常是 AggregateError，message 为空，要从 code / errors 里取真实原因 */
function describeError(err: unknown): string {
  if (err instanceof Error) {
    const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
    const subs =
      "errors" in err && Array.isArray((err as { errors?: unknown[] }).errors)
        ? (err as { errors: { message?: string }[] }).errors.map((e) => e?.message ?? "").filter(Boolean)
        : [];
    const parts = [err.message || err.name, ...subs].filter(Boolean);
    return [code, ...parts].filter(Boolean).join(" · ");
  }
  return String(err);
}

/** 实测数据库：连通性 / 当前库 / 表数量 / 迁移记录表 */
async function checkDatabase(dbUrl: string): Promise<{ ok: boolean; lines: string[] }> {
  const lines: string[] = [];
  let sql: SqlClient | null = null;
  try {
    const mod = await import("postgres");
    const postgres = (mod.default ?? mod) as (url: string, opts: unknown) => SqlClient;
    // 注意：postgres.js 的连接串要作为**第一个位置参数**传入，
    // 放进 options 的 connectionString 会被静默忽略并退回 localhost:5432。
    sql = postgres(dbUrl, { max: 1, connect_timeout: 8, idle_timeout: 5 });
    const rows = await sql.unsafe("select current_database() as db, version() as ver");
    const db = String(rows[0]?.db ?? "?");
    const ver = String(rows[0]?.ver ?? "").split(" ")[1] ?? "?";
    lines.push(`数据库连通：${db}（PostgreSQL ${ver}）`);
    const tables = await sql.unsafe(
      "select count(*)::int as count from information_schema.tables where table_schema = 'public'",
    );
    lines.push(`public schema 表数量：${Number(tables[0]?.count ?? 0)}`);
    const mig = await sql.unsafe(
      "select count(*)::int as count from information_schema.tables where table_schema = 'drizzle'",
    );
    lines.push(
      Number(mig[0]?.count ?? 0) > 0
        ? "迁移记录表存在，库已初始化"
        : "未发现 drizzle 迁移记录表，请执行 bun run db:migrate",
    );
    return { ok: true, lines };
  } catch (err) {
    lines.push(`数据库连通失败：${describeError(err)}`);
    return { ok: false, lines };
  } finally {
    if (sql) await sql.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const connect = args.includes("--connect");
  const modeIndex = args.indexOf("--mode");
  const mode = modeIndex >= 0 && args[modeIndex + 1] === "local" ? "local" : "production";
  const fileIndex = args.indexOf("--file");
  const extraFile = fileIndex >= 0 ? args[fileIndex + 1] : undefined;

  const { env, sources, files } = loadEnv(extraFile);
  const report = buildEnvReport(env, mode);
  const db = connect && env.DATABASE_URL ? await checkDatabase(env.DATABASE_URL) : null;
  if (db) {
    report.items.push({
      id: "DB-05",
      label: "数据库连通性",
      status: db.ok ? "ok" : "error",
      detail: db.lines[db.lines.length - 1] ?? "",
      fix: db.ok ? undefined : "核对连接串、数据库存活状态与 IP 白名单；Serverless 需用池化地址",
    });
    report.errors = report.items.filter((i) => i.status === "error").length;
    report.warnings = report.items.filter((i) => i.status === "warn").length;
    report.ready = report.items.every((i) => i.status !== "error");
  }
  const dbLines = db?.lines ?? [];

  if (json) {
    console.log(
      JSON.stringify(
        { mode, ready: report.ready, errors: report.errors, warnings: report.warnings, items: report.items, database: dbLines },
        null,
        2,
      ),
    );
  } else {
    console.log("拾级 Gradus · 环境变量自检");
    console.log(`口径：${mode === "local" ? "本地开发" : "生产部署"}`);
    console.log(`读取文件：${files.join("、")}${extraFile ? "（指定）" : "（缺省 .env → .env.local）"}`);
    console.log("提示：Bun 运行时还会自动加载 .env.<NODE_ENV>.local，来源一栏会标出实际生效路径。");
    console.log(`已加载：${Object.keys(env).length} 个变量（进程环境变量优先级最高）`);
    console.log("");
    for (const item of report.items) {
      console.log(`${ICONS[item.status]} [${item.id}] ${item.label} —— ${item.detail}`);
      if (item.fix) console.log(`        ↳ 修复：${item.fix}`);
    }
    if (dbLines.length > 0) {
      console.log("");
      console.log("数据库实测：");
      for (const line of dbLines) console.log(`  · ${line}`);
    }
    const tracked = [
      "DATABASE_URL",
      "AUTH_SECRET",
      "GEMINI_API_KEY",
      "AI_PROVIDER_BASE_URL",
      "AI_PROVIDER_API_KEY",
      "AI_PROVIDER_MODEL",
      "GRADUS_PUBLIC_ORIGIN",
      "WATCHA_REDIRECT_URI",
    ];
    const origins = tracked
      .filter((k) => (env[k] ?? "").trim().length > 0)
      .map((k) => `${k} ← ${sources[k] ?? "未知来源"}`);
    if (origins.length > 0) {
      console.log("");
      console.log("关键变量来源（只列来源，不列值）：");
      for (const line of origins) console.log(`  · ${line}`);
    }
    console.log("");
    console.log(
      report.ready
        ? `结论：没有阻断项（${report.warnings} 条警告）。可以进入下一步。`
        : `结论：${report.errors} 项阻断，必须先修复。`,
    );
    if (report.ready && !connect) {
      console.log("提示：加 --connect 可实测数据库连通性。");
    }
  }

  process.exit(report.ready ? 0 : 1);
}

void main();
