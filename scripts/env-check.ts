/**
 * 环境变量自检规则（纯函数，可单测）。
 *
 * 供 `bun run check:env` 使用：把「环境变量有没有配对、格式对不对」这件事
 * 从「部署时凭经验排查」变成「一条命令给出逐项结论 + 修复指引」。
 *
 * 铁律：**永远不输出密钥原文**，只输出「是否存在 / 长度 / 来自哪个文件」。
 */

export type CheckStatus = "ok" | "warn" | "error" | "info";

export interface EnvCheckItem {
  /** 规则编号，便于在文档与 issue 里对齐 */
  id: string;
  /** 人话标题 */
  label: string;
  status: CheckStatus;
  /** 判断依据（不含任何密钥原文） */
  detail: string;
  /** 出错时该怎么修 */
  fix?: string;
}

export interface EnvReport {
  items: EnvCheckItem[];
  errors: number;
  warnings: number;
  /** 是否可以进入下一步（无 error） */
  ready: boolean;
}

export type EnvMap = Record<string, string>;

const PLACEHOLDER_PATTERNS = [
  "your-",
  "your_",
  "changeme",
  "placeholder",
  "xxxx",
  "<",
  "todo",
];

function get(env: EnvMap, key: string): string {
  return (env[key] ?? "").trim();
}

function has(env: EnvMap, key: string): boolean {
  return get(env, key).length > 0;
}

function looksLikePlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return PLACEHOLDER_PATTERNS.some((p) => v.includes(p));
}

function isPostgresUrl(value: string): boolean {
  return /^postgres(ql)?:\/\/[^/\s]+/.test(value);
}

/** BYOK 三件套是否齐全（对应 `src/lib/ai-client.ts` 的 `byokConfigured()`） */
export function byokReady(env: EnvMap): boolean {
  return has(env, "AI_PROVIDER_BASE_URL") && has(env, "AI_PROVIDER_API_KEY") && has(env, "AI_PROVIDER_MODEL");
}

/**
 * 与 `resolveProvider()` 完全一致的判定顺序（`src/lib/ai-client.ts`）。
 * 注意其中的优先级细节：BYOK 三件套齐 **且** 没有 `GEMINI_API_KEY` 才走 BYOK；
 * 两者同时配置时实际走 Gemini，BYOK 被闲置。
 */
export function resolveProviderMode(env: EnvMap): "gemini" | "byok" | "none" {
  const explicit = get(env, "AI_PROVIDER_MODE").toLowerCase();
  if (explicit === "gemini") return "gemini";
  if (explicit === "byok" && byokReady(env)) return "byok";
  if (byokReady(env) && !has(env, "GEMINI_API_KEY")) return "byok";
  if (has(env, "GEMINI_API_KEY")) return "gemini";
  return "none";
}

/**
 * 生成完整报告。
 * @param mode local 只把「生产必备项」降级为警告；production 则严格报错。
 */
export function buildEnvReport(env: EnvMap, mode: "local" | "production" = "production"): EnvReport {
  const items: EnvCheckItem[] = [];
  const strict = mode === "production";
  const add = (item: EnvCheckItem) => items.push(item);
  const fail = (id: string, label: string, detail: string, fix: string) =>
    add({ id, label, status: "error", detail, fix });

  // --- DATABASE_URL ---
  const dbUrl = get(env, "DATABASE_URL");
  if (!dbUrl) {
    fail("DB-01", "DATABASE_URL 未配置", "数据库连接串为空", "从托管 Postgres（Neon / Supabase）复制带 pooler 的连接串，写入 .env.local");
  } else if (!isPostgresUrl(dbUrl)) {
    fail("DB-02", "DATABASE_URL 格式非法", "不是 postgres:// 或 postgresql:// 开头的合法 URL", "确认没有把占位值当连接串；本机 .env.production.local 的 13 字符占位值会导致 next build 报 ERR_INVALID_URL");
  } else if (looksLikePlaceholder(dbUrl)) {
    fail("DB-03", "DATABASE_URL 疑似占位值", "连接串里含有占位关键词", "换成数据库控制台复制出来的真实连接串");
  } else {
    add({ id: "DB-04", label: "DATABASE_URL", status: "ok", detail: "格式合法（未输出内容）" });
  }

  // --- AUTH_SECRET ---
  const secret = get(env, "AUTH_SECRET");
  const insecure = get(env, "AUTH_SECRET_ALLOW_INSECURE") === "1";
  if (!secret) {
    const status: CheckStatus = strict ? "error" : "warn";
    add({
      id: "AUTH-01",
      label: "AUTH_SECRET 未配置",
      status,
      detail: strict ? "生产环境缺少 JWT 签名密钥，鉴权请求会直接 503" : "本地开发会退化为占位串",
      fix: "生成：openssl rand -hex 32（Windows：-join ((1..32)|%{[char](Get-Random -Max 256)}))",
    });
  } else if (secret.length < 32) {
    fail("AUTH-02", "AUTH_SECRET 太短", `当前长度 ${secret.length}，要求 ≥ 32 字符`, "重新生成：openssl rand -hex 32");
  } else if (insecure) {
    add({
      id: "AUTH-03",
      label: "AUTH_SECRET_ALLOW_INSECURE=1",
      status: "warn",
      detail: "生产环境等于关掉防伪造，任何人都能伪造会话",
      fix: "生产部署务必删除该变量",
    });
  } else {
    add({ id: "AUTH-04", label: "AUTH_SECRET", status: "ok", detail: `已配置（长度 ${secret.length}，未输出内容）` });
  }

  // --- AI 提供方 ---
  const mode_ = resolveProviderMode(env);
  const explicitMode = get(env, "AI_PROVIDER_MODE").toLowerCase();
  if (explicitMode === "gemini" && !has(env, "GEMINI_API_KEY")) {
    fail("AI-05", "显式指定 gemini 但没有 GEMINI_API_KEY", "AI_PROVIDER_MODE=gemini 与实际密钥不匹配", "补 GEMINI_API_KEY，或改用 BYOK 三件套");
  }
  if (explicitMode === "byok" && !byokReady(env)) {
    fail("AI-06", "显式指定 byok 但三件套不齐", "AI_PROVIDER_MODE=byok 缺少 BASE_URL / API_KEY / MODEL", "补齐三件套");
  }
  if (mode_ === "none") {
    fail(
      "AI-01",
      "AI 提供方未配置",
      "GEMINI_API_KEY 与 BYOK 三件套都没配齐，分析流程必然失败",
      "二选一：GEMINI_API_KEY，或 AI_PROVIDER_BASE_URL + AI_PROVIDER_API_KEY + AI_PROVIDER_MODEL",
    );
  } else {
    add({
      id: "AI-02",
      label: "AI 提供方",
      status: "ok",
      detail: `将走 ${mode_ === "gemini" ? "Gemini" : "BYOK 自建端点"} 分支`,
    });
    const baseUrl = get(env, "AI_PROVIDER_BASE_URL");
    if (baseUrl && !/\/v1\/?$/.test(baseUrl)) {
      add({
        id: "AI-03",
        label: "AI_PROVIDER_BASE_URL 层级可疑",
        status: "warn",
        detail: "代码会自动拼 /chat/completions，BASE_URL 必须写到 /v1 这一层",
        fix: "例如 https://api.deepseek.com/v1",
      });
    }
    if (mode_ === "gemini" && byokReady(env)) {
      add({
        id: "AI-04",
        label: "Gemini 与 BYOK 同时配置",
        status: "info",
        detail: "按 resolveProvider() 的优先级，实际会走 Gemini 分支，BYOK 配置被闲置",
        fix: "确认这是预期；否则删掉多余的那条",
      });
    }
  }

  // --- 搜索（可选）---
  const searchKeys = ["TAVILY_API_KEY", "SERPAPI_API_KEY", "BRAVE_SEARCH_API_KEY", "DOUBAO_API_KEY"];
  const searchHit = searchKeys.filter((k) => has(env, k));
  add({
    id: "WEB-01",
    label: "资源搜索服务",
    status: searchHit.length > 0 ? "ok" : "info",
    detail: searchHit.length > 0 ? `已配置 ${searchHit.length} 个` : "未配置，学习资源会降级为搜索链接，不影响核心流程",
    fix: searchHit.length > 0 ? undefined : "至少填一个（按 豆包 → Tavily → SerpAPI → Brave 顺序回退）",
  });

  // --- 邮件验证码（可选）---
  const qq = has(env, "QQ_EMAIL_USER") && has(env, "QQ_EMAIL_PASS");
  const smtp = has(env, "SMTP_USER") && has(env, "SMTP_PASS");
  add({
    id: "MAIL-01",
    label: "邮件验证码",
    status: qq || smtp ? "ok" : "info",
    detail: qq || smtp ? "已配置" : "未配置，验证码会走 mock（页面 toast 直接显示验证码）",
    fix: qq || smtp ? undefined : "填 QQ 邮箱 + 16 位授权码，或 SMTP_* 四件套",
  });

  // --- 收款（可选）---
  const commerceOn = get(env, "GRADUS_COMMERCE_ENABLED") === "true";
  if (!commerceOn) {
    add({
      id: "PAY-01",
      label: "收款",
      status: "info",
      detail: "GRADUS_COMMERCE_ENABLED 未开启，购买入口关闭",
      fix: "自托管默认保持关闭；开启前必须先完成商品、权益、回跳域名配置",
    });
  } else {
    const missing: string[] = [];
    if (!has(env, "GRADUS_PAYMENT_PROVIDER")) missing.push("GRADUS_PAYMENT_PROVIDER");
    if (!has(env, "GRADUS_PUBLIC_ORIGIN")) missing.push("GRADUS_PUBLIC_ORIGIN");
    if (get(env, "GRADUS_PAYMENT_PROVIDER") === "watcha") {
      if (!has(env, "WATCHA_PAY_API_KEY")) missing.push("WATCHA_PAY_API_KEY");
      if (!has(env, "WATCHA_PAY_PACK10_ENTITLEMENT_ID")) missing.push("WATCHA_PAY_PACK10_ENTITLEMENT_ID");
      if (!has(env, "WATCHA_PAY_PACK30_ENTITLEMENT_ID")) missing.push("WATCHA_PAY_PACK30_ENTITLEMENT_ID");
    }
    if (missing.length > 0) {
      fail("PAY-02", "收款已开启但配置不全", `缺少：${missing.join(", ")}`, "补齐后再部署；否则购买链路会在服务端报错");
    } else {
      add({ id: "PAY-03", label: "收款配置", status: "ok", detail: "必需变量齐全" });
    }
    const origin = get(env, "GRADUS_PUBLIC_ORIGIN");
    if (origin && !origin.startsWith("https://")) {
      add({
        id: "PAY-04",
        label: "GRADUS_PUBLIC_ORIGIN 非 HTTPS",
        status: "warn",
        detail: "浏览器端跳转会降级，回跳域名必须与公网地址一致",
        fix: "改成 https:// 开头且与实际访问地址完全一致的地址",
      });
    }
  }

  // --- 观猹 OAuth（可选）---
  if (has(env, "WATCHA_CLIENT_ID") || has(env, "WATCHA_CLIENT_SECRET")) {
    const both = has(env, "WATCHA_CLIENT_ID") && has(env, "WATCHA_CLIENT_SECRET");
    const redirect = get(env, "WATCHA_REDIRECT_URI");
    add({
      id: "OAUTH-01",
      label: "观猹 OAuth",
      status: both ? "ok" : "error",
      detail: both ? "已配置" : "客户端 ID 与密钥必须成对",
      fix: both ? undefined : "补齐 WATCHA_CLIENT_SECRET",
    });
    if (both && redirect && !redirect.startsWith("https://")) {
      add({
        id: "OAUTH-02",
        label: "WATCHA_REDIRECT_URI 非 HTTPS",
        status: "warn",
        detail: "回跳地址必须与平台登记的固定地址一致（Preview URL 常常不一致）",
        fix: "改成生产域名下的 /api/auth/oauth/watcha/callback",
      });
    }
  }

  // --- 管理员（可选）---
  const adminEmail = get(env, "ADMIN_EMAIL");
  const publicAdmin = get(env, "NEXT_PUBLIC_ADMIN_EMAIL");
  if (adminEmail || publicAdmin) {
    add({
      id: "ADMIN-01",
      label: "管理员邮箱",
      status: adminEmail && publicAdmin && adminEmail === publicAdmin ? "ok" : "warn",
      detail:
        adminEmail && publicAdmin && adminEmail === publicAdmin
          ? "服务端与前端显示一致"
          : "ADMIN_EMAIL 与 NEXT_PUBLIC_ADMIN_EMAIL 不一致或只填了一个",
      fix: "两个变量填同一个值",
    });
  }

  return {
    items,
    errors: items.filter((i) => i.status === "error").length,
    warnings: items.filter((i) => i.status === "warn").length,
    ready: items.every((i) => i.status !== "error"),
  };
}
