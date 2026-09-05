# 开发者指南（AGENTS）

> 原项目名 **AutoTask**，GitHub 仓库名 **TalkTask**，现产品名 **「拾级（Gradus）」**。
> 本文件供人类开发者与 AI Agent 接手本项目时快速建立上下文。产品定位、运行方式见 [README.md](./README.md)，功能细节见 [PRD.md](./PRD.md)。

---

## 1. 项目概览

一款面向自主学习者的 AI 学习任务规划器：用户输入一个模糊目标 → AI 拆解为带排期、资源、甘特图的可执行子任务，并自动核查修订、全局接续排期。已从 Eazo 平台解耦，可独立部署到任意支持 Next.js 的托管平台。

技术栈与运行命令见 README.md，此处不再重复。

---

## 2. 平台解耦（重要，先读这一节）

代码源自 Eazo 平台模板，但现已自托管。三处兼容层保留了原模板的导入形态，但底层实现是自托管的：

- **`src/lib/eazo-shim.ts`** — 替换 `@eazo/sdk/react`：
  - `EazoProvider`：纯 passthrough（直接返回 children）。
  - `auth`：单例。`login(mode?)` 触发全局 `<AuthModal>`（注册/登录弹窗），不再直接发网络请求；`logout()` 调 `/api/auth/logout` 并清本地 user；`refresh()` 重新拉 `/api/auth/me` 同步 user。
  - `memory`：`reportAction()` 为 no-op（平台长期记忆在站外不可用）。
  - `useEazo(selector)`：从 `<UserProvider>` 注入的模块级 store 读真实 user。`adaptUser` 按 `id/email/name` **缓存同一对象引用**，所以 `useEazo(s => s.auth.user)` 在同用户下返回稳定引用。⚠️ 把 `user` 对象直接放进 `useEffect` 依赖数组仍是大忌——务必依赖 `user?.id`（稳定字符串），否则任一上下文 hook 返回新引用都会触发无限重拉循环（history/home/task-detail 均已踩过）。
  - **真实登录态**：每个访客都是 JWT cookie 解析出的独立 user；没有 cookie 时由 middleware 兜底建临时账号。
- **`src/lib/auth/index.ts`** — 替换 `@eazo/sdk/server` 的 `requireAuth`：解析 `__Host-session` cookie → JWT 校验 → 查 users → 返回 `{ ok, user, userId }`。所有受保护路由第一行调用 `await requireAuth(request)`。
- **`src/lib/eazo-ai-billing.ts`** — `appAi.chat()` 客户端，两种模式：
  - `byok`（`EAZO_AI_PROVIDER_MODE=byok`，自托管默认）：直连 `AI_PROVIDER_BASE_URL` 的 OpenAI 兼容 `/v1/chat/completions`。
  - `eazo`（平台）：走 Eazo Creator Proxy（`EAZO_APP_AI_API_BASE`）。自托管不需要。

> 关键事实：`package.json` 中**已无 `@eazo/sdk` 依赖**。UI / 路由里 import 的 `EazoProvider`、`useEazo`、`requireAuth`、`appAi` 全部来自上述自托管 shim，不依赖任何平台 SDK。其余平台能力（notifications.push、object storage）在自托管模式下未实现，相关代码多为 no-op 或占位。

---

## 3. 目录结构

```
src/
  app/
    layout.tsx                      根布局：I18nProvider > UserProvider > EazoProvider(shim) > LocaleSyncEffect > Toaster
    page.tsx                        首页入口 → <HomePage />
    task/[id]/page.tsx              任务详情页（甘特图）
    history/page.tsx                历史任务页
    api/
      auth/{register,login,logout,me}/route.ts  公开鉴权（限流）
      tasks/route.ts                GET 列表 / POST 创建
      tasks/[id]/route.ts           GET / PATCH(status) / DELETE(级联)
      tasks/[id]/analyze/route.ts   POST 4+ 段 AI 流水线（缓冲 JSON，非 SSE）
      tasks/[id]/subtasks/[subtaskId]/route.ts  PATCH 切换完成状态
      subtasks/route.ts             GET 全量子任务 JOIN 大任务
      user/profile/route.ts         GET 当前用户
      user/stats/route.ts           GET 统计
      mcp/route.ts                  GET/POST/DELETE MCP Streamable HTTP
      notifications/cron/daily-digest/route.ts   Vercel Cron 每日提醒
      notifications/test/route.ts    测试推送
  components/
    auth/        auth-modal / global-auth-modal（全局唯一登录注册弹窗，挂载于 layout）
    home/        home-page / new-task-input / subtask-row / subtask-detail-modal / congrats-modal / right-panel
    task/        task-input-form / task-phase / analysis-panel / gantt-chart / task-detail-page-v2
    history/     history-page
    user-profile/ user-badge / user-sync-effect
    i18n/        i18n-provider / language-switcher / locale-sync-effect
    ui/          shadcn/ui 基础组件
  lib/
    ai/prompts.ts        INTENT / RESOURCE_INTENT / PLAN / VALIDATE 提示词
    api/                 request / tasks / user-profile / app-ai-request / index
    auth/                index.ts(jwt cookie) / env / jwt / password / cookie / temp-account / ratelimit / current-user / user-provider / auth-attempts
    db/                  schema(tasks,subtasks,users,auth-attempts) / queries / client / migrate / migrations/
    eazo-ai-billing.ts   appAi 客户端（byok / creator proxy）
    eazo-shim.ts         EazoProvider / auth / memory / useEazo 兼容层（读 UserProvider）
    fetchers/            article / arxiv / bilibili / course / pdf / workspace / fallback
    i18n/                locale / preference / server-locale / server-preference
    mcp/server.ts        MCP 工具定义
    resource-validator.ts  三维可信度校验
    scheduler.ts         全局排期算法（Bloom 渐进 + 每日槽位）
    tavily.ts            resolveResources（两阶段资源检索）
    url-fetcher.ts       URL 内容抓取与格式化
  middleware.ts                          兜底建临时账号 + 滑动续期
  utils/utils.ts         cn() Tailwind 类名合并
```

---

## 4. 常用命令

```bash
bun install
bun dev
bun run build
bun start
bun run lint
bun run db:generate      # 生成迁移
bun run db:migrate       # 执行迁移
bun run db:push          # 直接同步 schema
bun run db:studio        # Drizzle Studio
```

> ⚠️ 旧的 `bun run cleanup:demo` 已在 2026-08-14 删除（指向不存在的脚本），当前 `package.json` 已不再声明该命令。

---

## 5. 环境变量

见 [.env.example](./.env.example)。**必填**：`DATABASE_URL`、`AUTH_SECRET`（≥ 32 字符；**惰性校验**——构建期不报错，仅运行时首次签发/校验 JWT 时强制，缺失则相关请求 503）、`EAZO_AI_PROVIDER_MODE=byok`、`AI_PROVIDER_BASE_URL`、`AI_PROVIDER_API_KEY`、`AI_PROVIDER_MODEL`。**可选**：`TAVILY_API_KEY`、`NEXT_PUBLIC_APP_TITLE/DESCRIPTION`、`CRON_SECRET`。生成命令：`openssl rand -hex 32`。

---

## 6. 关键文件地图（按功能索引）

| 功能 | 主要文件 |
|---|---|
| 认证 / 用户 | `src/lib/auth/*`（index/jwt/password/cookie/temp-account/ratelimit/current-user/user-provider/env）、`src/middleware.ts`、`src/lib/eazo-shim.ts`、`src/components/user-profile/user-badge.tsx`、`src/components/auth/auth-modal.tsx`、`src/app/api/auth/*`、`src/app/api/user/profile/route.ts`、`src/app/api/user/stats/route.ts` |
| AI 流水线 | `src/app/api/tasks/[id]/analyze/route.ts`、`src/lib/ai/prompts.ts`、`src/lib/eazo-ai-billing.ts` |
| 资源检索 | `src/lib/tavily.ts`（resolveResources）、`src/lib/resource-validator.ts`、`src/lib/url-fetcher.ts`、`src/lib/fetchers/*` |
| 排期 | `src/lib/scheduler.ts`（`computeNewTaskStartDate` / `findNextAvailableDay` / `validateBloomSequence` / `suggestReviewNodes` / `registerDailySlot`） |
| 数据库 | `src/lib/db/schema/*`、`src/lib/db/queries/*`、`src/lib/db/client.ts`、`src/lib/db/migrate.ts`、`src/lib/db/migrations/` |
| MCP | `src/lib/mcp/server.ts`、`src/app/api/mcp/route.ts` |
| 国际化 | `src/components/i18n/*`、`src/lib/i18n/*` |
| 前端仪表板 | `src/components/home/*`、`src/components/task/*`、`src/components/history/*` |

---

## 7. API 路由

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| `POST` | `/api/auth/register` | 注册账号（含临时账号合并） | 公开（限流） |
| `POST` | `/api/auth/login` | 登录 | 公开（限流） |
| `POST` | `/api/auth/logout` | 清 cookie | 已登录 |
| `GET` | `/api/auth/me` | 当前用户 | 已登录 |
| `POST` | `/api/tasks` | 创建大任务 | 已登录 |
| `GET` | `/api/tasks` | 任务列表（含进度计数） | 已登录 |
| `GET` | `/api/tasks?withSubtasks=1` | 列表 + 子任务（面板水化） | 已登录 |
| `GET` | `/api/tasks/:id` | 单任务 + 子任务 | 已登录 |
| `PATCH` | `/api/tasks/:id` | 更新 status | 已登录 |
| `DELETE` | `/api/tasks/:id` | 删除（级联子任务） | 已登录 |
| `POST` | `/api/tasks/:id/analyze` | 4+ 段 AI 流水线（缓冲 JSON） | 已登录 |
| `PATCH` | `/api/tasks/:id/subtasks/:sid` | 切换子任务完成状态 | 已登录 |
| `GET` | `/api/subtasks` | 全量子任务 JOIN 大任务 | 已登录 |
| `GET` | `/api/user/profile` | 当前用户（已登录） | 已登录 |
| `GET` | `/api/user/stats` | 统计 | 已登录 |
| `GET/POST/DELETE` | `/api/mcp` | MCP Streamable HTTP | 已登录 |
| `GET` | `/api/notifications/cron/daily-digest` | 每日推送（Cron） | `Bearer ${CRON_SECRET}` |
| `GET` | `/api/notifications/test` | 测试推送 | 已登录 |

> 鉴权列三态：
>   - **已登录** —— `__Host-session` cookie 解析合法 JWT；middleware 已在请求入口兜底建临时账号。
>   - **公开（限流）** —— 不需要 cookie，但受 60s/5 次/IP 限流（详见 §11）。
>   - **`Bearer ${CRON_SECRET}`** —— Vercel Cron；被 middleware matcher 排除，不消耗临时账号 / 限流。

---

## 8. AI 规划流水线详解

入口：`src/app/api/tasks/[id]/analyze/route.ts`。**缓冲 JSON**：一次请求串行跑完 4+ 段 AI 流水线后统一返回结果；前端/RSC 不依赖 SSE，避免流式超时导致半截响应。

| 阶段 | 提示词 | 主要输出 |
|---|---|---|
| Stage 0 · URL 抓取 | — | 若用户输入含 URL，先 `fetchUrlContent` 抓取真实页面内容注入 Prompt（失败降级为空，不阻断） |
| Stage 1 · 意图 | `INTENT_PROMPT` | task_name / topic_category / urgency / importance / prior_knowledge_level / bloom_target_level / estimated_total_hours / search_keywords / subject_domain |
| Stage 2 · 资源（两阶段） | `RESOURCE_INTENT_PROMPT` | ① AI 只产 `search_intents`（不产 URL）；② `resolveResources()` 调 Tavily 取真实 URL，再做三维校验 |
| Stage 3 · 计划 | `PLAN_PROMPT` | 4~8 子任务：title / description / duration_days / start_day / priority / bloom_level / deep_work_hours / learning_method / resource_indices |
| Stage 4 · 核查 | `VALIDATE_PROMPT` | pass / score / suggestions；外加本地 `validateBloomSequence` 检查 |
| Stage 5 · 修订（条件） | `PLAN_PROMPT` + 修订意见 | 当 `pass=false` 或 Bloom 层级跳跃时重排 |

落库与排期：更新任务标题/原始输入 → `computeNewTaskStartDate`（全局接续、窗口式）→ 按 Bloom 层级渐进排序 → 逐子任务 `findNextAvailableDay`（每日槽位 + 主题限流 + 领域亲和度）→ 写入 `subtasks`（含 bloomLevel、deepWorkHours）→ `suggestReviewNodes`（间隔复习节点）→ 更新 `total_days` 与 status=`done`。

返回（一次性 JSON）：`{ ok, result: { subtasks, totalDays, taskName, rawInput, startDate, topicCategory, priorLevel, bloomTarget, reviewNodes, verifiedCount, reachableCount } }`。

---

## 9. 全局排期算法

见 `src/lib/scheduler.ts`：

- **接续排期**：`computeNewTaskStartDate(otherTasks, today)` = 所有未完成任务最末结束日 + 1；若间隙 > 7 天则回退到今天。
- **Bloom 渐进排序**：子任务按 `bloom_level` 升序（同层按 `priority`）。
- **每日交错槽位**：`registerDailySlot` / `findNextAvailableDay` 按每日容量 + 主题 + Bloom + 领域亲和度约束分配日期，避免同主题扎堆、保证认知负荷均衡。
- **复习节点**：`suggestReviewNodes` 基于间隔重复（Spaced Repetition）生成复习提醒点。

---

## 10. 资源检索（两阶段，防编造）

- AI（`RESOURCE_INTENT_PROMPT`）**只生成搜索意图**，被硬性约束不得产出 URL。
- 代码 `resolveResources(intentList, topicCategory)` 调 **Tavily** 从**白名单域名**检索真实链接；有 `TAVILY_API_KEY` → 标记 `verified`，无 → `search_only`（用户点击时跳转搜索引擎自选）。
- `validateResources()` 做三维可信度校验（URL 存活 / 域名权威分 / 新鲜度），并行 ≤ 3s，不阻断主流程。

---

## 11. 认证模型（自托管）

拾级在自托管模式下采用**演示版多用户账号隔离**：每个访客都是独立的 JWT cookie 身份，访客无需登录即可创建任务，注册时无缝接管临时账号下的全部数据。

### 11.1 三层鉴权边界

1. **Edge / Server Middleware（`src/middleware.ts`）** — match `/api/((?!auth/register|auth/login|notifications/cron).*)`：未带合法 cookie 的请求自动 `createTempAccount()` + 签 JWT + Set-Cookie；合法 cookie 的请求每次刷新 Max-Age（**滑动续期 30 天**）。
2. **`requireAuth(request)`（`src/lib/auth/index.ts`）** — 解析 cookie → `verifySession` → 查 users → 返回 `{ ok, user, userId }` 或抛 401。**所有受保护路由 handler 第一行 await。**
3. **RSC `<UserProvider>`（`src/lib/auth/user-provider.tsx` + `src/app/layout.tsx`）** — 根布局在 RSC 阶段直接调 `getCurrentUser()` 解出 user，作为 props 注入 `<UserProvider user={user}>`，客户端 `useEazo()` 读 Context，**首屏零闪烁**。

### 11.2 协议与存储

- **JWT + HMAC-SHA256**（`jose` 库），过期 30 天；密钥 `AUTH_SECRET`，**≥ 32 字符，惰性校验（仅首次签名/校验时强制，缺失则 503，不影响构建）**。
- **Cookie** 名称 `__Host-session`，`httpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age=30d`；`Secure` 仅在生产环境启用。
- **密码 hash** 用 `bcryptjs` cost=10；临时账号 `passwordHash = ""`。
- **数据模型**（`users` 表新增两列 + 一张限流表）：
  - `passwordHash text NOT NULL DEFAULT ''`
  - `emailLower varchar(256) UNIQUE` —— 注册 / 登录唯一性依据
  - `auth_attempts(id, ip, kind, attemptedAt)` —— 滑动窗口限流

### 11.3 临时账号生命周期

- **创建时机**：middleware 检测到 `/api/*` 请求缺 cookie 自动建。`name="访客 {4 位 hex}"`，`email="temp-{uuid}@anon.local"`。
- **合并**：用户从临时状态注册时，**同事务**执行 `UPDATE tasks SET user_id = new WHERE user_id = temp` → `DELETE FROM users WHERE id = temp`，临时账号下的任务无缝转移。
- **过期清理**：30 天未访问的临时账号**不在 v1 范围**（见 §15 TODO）。

### 11.4 限流机制

- **存储**：`auth_attempts` 表，serverless 友好。
- **窗口**：60 秒，阈值 5 次/IP；`register` 与 `login` 共用同一阈值。
- **取 IP**：`x-forwarded-for[0]` → `x-real-ip` → `"unknown"`。
- **清理**：每次查询前 DELETE 早于 60s 的记录。
- **响应**：超限返回 `429 { error: "操作过于频繁，请稍后再试" }`。
- **日志**：每次 `console.log("[auth] <kind> attempt ip=… email=… ua=…")`。

### 11.5 scheduler 用户隔离

`computeNewTaskStartDate(otherTasks, today)` 接续排期只看**当前用户**的活跃任务。`getScheduledTasksByUser(auth.user.id)` 已在 `/api/tasks/[id]/analyze` 调用处显式过滤，不再跨用户聚合。

---

## 12. MCP 服务

`src/lib/mcp/server.ts` 用 `@modelcontextprotocol/sdk` 的 Web Standard Streamable HTTP Transport 定义任务 CRUD 工具；`src/app/api/mcp/route.ts` 处理 GET/POST/DELETE。**无状态模式**（每请求独立），便于 serverless。经 `requireAuth` 鉴权，按调用方 userId 严格过滤数据。

---

## 13. 编码规范

- **单文件单组件**：每个文件只导出一个组件，出现第二个组件立即拆分。
- **文件行数上限**：页面组件软 30 / 硬 50；功能组件软 150 / 硬 250；工具/helper 软 80 / 硬 150；API 路由 handler 软 60 / 硬 100。
- **命名**：文件 `kebab-case.tsx`；导出 `PascalCase` 具名导出；功能目录用 barrel `index.tsx`；API helper 放 `src/lib/api/<resource>.ts` 用 `camelCase`。
- **状态与数据**：不在 `page.tsx` 里取数，交给组件；所有 fetch 逻辑集中在 `src/lib/api/`；用 `@/` 路径别名；UI 原语来自 `@/components/ui/`。
- **AI 调用位置**：AI 只能在 `src/app/api/` 路由 handler 内调用，绝不在客户端组件 import `appAi`。

---

## 14. 项目规则 / 发布前检查

- 优先用 Bun 跑安装与脚本。
- 不要深入 `@eazo/sdk` 内部（自托管下根本不存在该依赖）。
- AI 只在服务端 `src/app/api/` 调用。
- 发布前：`bun run lint` && `bun run build` 必须通过。

---

## 15. 已知遗留 / 待清理

- `src/app/layout.tsx` 的 metadata 仍引用 `eazo.ai` 的 favicon 与 `openGraph.siteName: "Eazo"`，品牌未完全切换为「拾级」。
- 界面文案目前为中文硬编码，i18n 仅保留脚手架（`en-US` / `zh-CN`），未全面接入 `t()`。

### 15.1 认证 / 账号系统 TODO（不在 v1 范围）

- 临时账号 30 天过期清理脚本（定期 cron 扫描 `passwordHash = ''` 且 `updatedAt < NOW() - INTERVAL '30 days'` 的行）
- JWT 撤销列表（用户主动注销已签发 token，演示版可接受"复制 cookie 在 30 天内仍可用"）
- Turnstile / hCaptcha 等 CAPTCHA（防自动化撞库 + 自动化注册）
- 邮箱验证邮件发送（注册时验证邮箱有效性）
- 密码找回 / 重置流程
- 第三方 OAuth（Google / GitHub）
- 服务端 IP 黑白名单
- 账号删除 / 数据导出（GDPR 合规）
- 多设备会话管理（"踢出其他设备"）
- 密码强度策略（最少长度、字符种类要求）
- 登录失败次数到达阈值后锁定账号
- 双因素认证

---

## 16. 目标

先跑起来、保持灵活，只在有具体产品需求时才引入复杂度。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
