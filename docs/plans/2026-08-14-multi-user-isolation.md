# 多用户账号隔离（演示版）

## Problem Statement

**自托管版「拾级」当前没有真实登录态**——所有访客共享一个硬编码的"演示用户"身份（id=`demo-learner`），数据库里的 `tasks.userId` 全部指向同一行。意味着：

- 同一部署上的任何两个访客**能看到、修改、删除对方的所有任务**。
- 演示给朋友看时，朋友能改你的学习计划；你自己换个浏览器/无痕模式测试，数据完全互通。
- 唯一能"隔离"的方式是每人独立部署——成本和门槛都太高。

这对**演示场景**（让不同的人各自体验）是**阻断性问题**：你没办法让两个朋友在同一 URL 上独立试玩而不互相干扰。

## Solution

引入一个**演示级的**多用户账号系统——让每个访客在同一个部署上拥有自己的数据空间：

- **首次访问自动创建一个匿名临时账号**（用户零摩擦，不需要注册就能玩）。
- **可选注册正式账号**（账号名+邮箱+密码），注册时**自动接管**临时账号里的所有任务。
- **登录后所有数据按 userId 严格隔离**——看不到别人的任务，也碰不到。
- **会话通过签名 Cookie 维持**（JWT + HMAC-SHA256，无服务端 session 表）。
- **不做的事**：邮箱验证、密码找回、撤销列表、Turnstile 等所有非"基础隔离"的机制——演示场景不需要。

---

## User Stories

### 临时访客（未注册）

1. As a **首次访客**, I want to **在打开页面那一刻自动拥有一个属于自己的数据空间**, so that I can **立刻开始创建任务而看不到其他访客的任何数据**。
2. As a **临时访客**, I want to **在导航到任何页面或调用任何 API 时保持登录状态**, so that I can **刷新页面、关闭浏览器后再次访问仍能看到自己的任务**。
3. As a **临时访客**, I want to **在 30 天内不定期访问的话继续保持登录**, so that I can **不用每次都"重新登录"**。
4. As a **临时访客**, I want to **看到一个清晰的"注册正式账号"入口**, so that I can **决定什么时候把我的数据固化下来**。

### 主动注册

5. As a **临时访客**, I want to **能用邮箱和密码注册一个正式账号**, so that I can **用同样的凭据在不同设备/浏览器登录**。
6. As a **正在注册的临时访客**, I want to **我创建的任务自动归属于新的正式账号**, so that I can **不用重新创建一份计划**。
8. As a **正在注册的访客**, I want to **被要求填一个唯一的邮箱**, so that **别人不能用同一个邮箱注册成我的账号**。
9. As a **正在注册的访客**, I want to **邮箱被自动转成小写后再查重**, so that I can **无论输入大小写都不会和别人冲突**。

### 主动登录

10. As a **已有正式账号的用户**, I want to **用邮箱和密码登录**, so that I can **从任何设备访问我的任务**。
11. As a **登录用户**, I want to **在我退出后立刻看不到自己的数据**, so that **把设备借给别人时不会被看到**。
12. As a **登录用户**, I want to **页面刷新或关闭浏览器后再打开仍处于登录态**, so that I can **不需要每次重新输入密码**。

### 数据隔离（核心安全保证）

13. As a **用户 A**, I want to **绝对看不到用户 B 的任何任务、子任务、统计、历史**, so that **我们的数据完全隔离**。
14. As a **用户 A**, I want to **绝对不能通过构造 taskId、subtaskId 来访问用户 B 的任务**, so that **直接拼 URL 也不行**。
15. As a **用户 A**, I want to **退出登录后原本属于我的任务仍然保留在我的正式账号下**, so that **重新登录后能看到全部历史**。
16. As a **已注销正式账号的用户**, I want to **系统不保留我的 JWT 撤销表也能容忍复制 cookie 的风险**（演示版权衡），so that **实现简单**。

### 限流（演示级）

17. As a **访客**, I want to **每 60 秒内最多尝试 5 次注册/登录（同一 IP）**, so that **有人暴力撞库时不会被轻易打穿**。
18. As a **被限流的访客**, I want to **看到清晰的提示"操作过于频繁，请稍后再试"**, so that I can **知道发生了什么**。

### 部署与运维

19. As a **运维人员**, I want to **没有正确配置 AUTH_SECRET 时直接报错**, so that **不会出现"忘记配 secret 导致 JWT 被人伪造"的事故**。
    > 实现注记：校验为**惰性**——仅在首次签发/校验 JWT 时触发（而非模块加载/构建期），因此 `next build` 即使缺变量也能通过；运行时缺失/过短则相关请求 503。设计目标（防伪造）不变。
20. As a **运维人员**, I want to **限流数据存在数据库而不是内存**, so that **Vercel Serverless 冷启动不会让限流形同虚设**。

---

## Implementation Decisions

### 整体架构

- **三层鉴权边界**：
  1. **Edge / Server Middleware**（`src/proxy.ts`）—— 统一在 `/api/*` 入口做 cookie 校验、必要时建临时账号、必要时续期 cookie。**未登录访问任何受保护 API 时自动获得临时账号**，handler 内部无需关心"用户有没有登录"。
  2. **Server-side `requireAuth(request)`**（`src/lib/auth/index.ts`）—— 解析 cookie → JWT 验证 → 查 users 表 → 返回 `{ ok, user, userId }` 或抛 401。是所有受保护路由 handler 的标准入口。
  3. **Client-side `<UserProvider>`**（`src/lib/auth/user-provider.tsx` + `src/app/layout.tsx`）—— 在 RSC 阶段直接调用 `getCurrentUser(request)`，把当前用户作为 props 注入根布局；客户端通过 Context 拿到，**首屏零闪烁**。

### 认证协议

- **JWT + HMAC-SHA256**（HS256），无服务端 session 表，serverless 友好。
- **JWT 负载**：`{ sub: userId, name, email, iat, exp }`。
- **过期时间**：30 天。配合"滑动续期"——任何受保护请求的 cookie Max-Age 都会被刷成 30 天。
- **签名密钥**：环境变量 `AUTH_SECRET`（≥ 32 字符），**惰性校验**——缺失/过短在首次签发/校验时才报错（构建期不报错）。
- **JWT 库**：`jose`（Web 标准、零依赖），**不**用 `jsonwebtoken`。
- **密码 hash**：`bcryptjs`（pure JS，避免 native binding 问题），cost=10。
- **Cookie**：
  - 名称 `__Host-session`（`__Host-` 前缀强制 Secure + Path=/ + 不带 Domain）
  - `httpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age=30d`
  - `Secure`：仅在 `process.env.NODE_ENV === "production"` 启用（dev localhost 不强制）
- **登出**：仅清 cookie（`Set-Cookie: __Host-session=; Max-Age=0`）+ 客户端 state 清空；**不维护撤销表**（演示版可接受"复制 cookie 在 30 天内仍可用"）。

### 数据模型

**新增列（`users` 表）**：

- `passwordHash text NOT NULL DEFAULT ''` —— 临时账号是空字符串；注册时强制覆盖。
- `emailLower varchar(256) UNIQUE` —— 邮箱小写归一化版，DB 级唯一约束。

**新增表（`auth_attempts`）**：

- 列：`id text PK`、`ip text NOT NULL`、`kind text NOT NULL`（`register` | `login`）、`attemptedAt timestamptz NOT NULL DEFAULT NOW()`
- 索引：`(ip, kind, attemptedAt)` 复合索引，支持 `WHERE ip=? AND kind=? AND attemptedAt > NOW() - INTERVAL '60 seconds'` 的滑动窗口查询。

### 临时账号生命周期

- **创建时机**：middleware 检测到 `/api/*` 请求没有 `__Host-session` cookie 时自动调用 `createTempAccount()`，创建后**立即签 JWT + Set-Cookie**，放行请求。
- **账号结构**：随机 UUID（与正式账号同形），`name = "访客 {4 位hex}"`、`emailLower = "temp-{uuid}@anon.local"`、`passwordHash = ""`。
- **续期**：任何受保护请求通过 middleware 时，cookie 都会被刷成 Max-Age=30d（实现"滑动续期"）。
- **合并**：用户在临时状态下注册时，**同事务**内把 `tasks.userId` 从临时账号改成正式账号，**然后删除临时账号 users 行**（CASCADE 自动清掉残留任务，但合并后已无任务）。**不**改 `users.id`（避免 `tasks.user_id` 的 `ON UPDATE NO ACTION` 默认行为引发的 FK 错误——必须走 `UPDATE tasks SET user_id = ... WHERE user_id = ...`）。
- **过期清理**：30 天未访问的临时账号清理**不在 v1 范围**，记为 TODO。

### API 路由改造

**新增（4 个）**：

- `POST /api/auth/register` —— 收 `{ name, email, password }`；**受 60s/5 次/IP 限流**；邮箱小写归一 → bcrypt hash → 插 users 行 → 检临时 cookie → 合并 → 签 JWT → Set-Cookie → 200。
- `POST /api/auth/login` —— 收 `{ email, password }`；**同样 60s/5 次/IP 限流**；小写归一 → bcrypt compare → 签 JWT → Set-Cookie → 200。
- `POST /api/auth/logout` —— 仅清 cookie + 客户端 state。
- `GET /api/auth/me` —— 返回当前用户 `{ id, name, email }` 或 401。

**改写（9 个）**——鉴权字段统一改为"已登录用户"，handler 内部继续用 `auth.user.id` 过滤（已经全部是 `userId` 查询，无需改 SQL）：

- `/api/tasks`、`/api/tasks/[id]`、`/api/tasks/[id]/analyze`、`/api/tasks/[id]/subtasks/[subtaskId]`、`/api/subtasks`、`/api/user/profile`、`/api/user/stats`、`/api/mcp`、`/api/notifications/test`。

**不动**（保留原鉴权）：

- `/api/notifications/cron/daily-digest` —— 仍走 `Authorization: Bearer ${CRON_SECRET}`；被 middleware matcher 排除（不自动建临时账号、不消耗限流）。

**临时账号**：因为所有受保护路由都由 middleware 兜底创建临时账号，**所有现有路由都不需要单独适配"未登录访问"分支**——`requireAuth` 总是能解析出一个 userId。

### 客户端 store 改造

- **`src/lib/eazo-shim.ts`**：删除 `DEMO_USER` 常量；`STATE.auth.user = null`；`useEazo` 改成从 `<UserProvider>` 注入的真实值读取（移除模块级 STATE）。
- **`src/app/layout.tsx`**：根布局改为 `async`，调用 `getCurrentUser(request)`，把 `user` 作为 props 传给 `<UserProvider>`；删除 `<UserSyncEffect>`（其原有"客户端补打 `/api/user/profile`"逻辑在 H3 双源策略下不再需要）。
- **新增 `src/lib/auth/user-provider.tsx`**：RSC-safe 的 Context Provider，把 server-side 注入的 `user` 透传到客户端 `useEazo(selector)`。

### 限流实现

- **`checkRateLimit(ip, kind)`** —— 在 `auth_attempts` 表上：
  1. `DELETE FROM auth_attempts WHERE attemptedAt < NOW() - INTERVAL '60 seconds'`（滑动窗口前置清理）
  2. `SELECT COUNT(*) FROM auth_attempts WHERE ip=? AND kind=? AND attemptedAt > NOW() - INTERVAL '60 seconds'`
  3. 若 count ≥ 5：返回 `{ allowed: false }`
  4. 若 allowed：执行 `INSERT INTO auth_attempts (id, ip, kind) VALUES (uuid, ?, ?)`，返回 `{ allowed: true }`
- **窗口**：60 秒；**阈值**：5 次/IP；**kind**：register 与 login 共用同一张表、同一阈值（避免独立调参）。
- **取 IP**：`x-forwarded-for` 第一段（Vercel 兼容），fallback `request.headers.get("x-real-ip")`，再 fallback `"unknown"`。
- **结构化日志**：每次 `allowed=false` 与 `allowed=true` 都按 AGENTS.md §13 的 `console.log` 约定打 `[auth] register attempt ip=... email=... ua=...` 一行。

### 文档改写

- **AGENTS.md §11** 整段改写：从"无登录态 / 演示用户" 改为完整描述新模型（JWT cookie、临时账号、注册合并、限流、scheduler 用户隔离）。
- **AGENTS.md §7** 路由表鉴权列从"demo 用户"改成"已登录用户 / 公开(限流) / Bearer Cron"。
- **AGENTS.md §15** 增加 TODO：临时账号 30 天清理、撤销列表、Turnstile。
- **README.md** 增加「认证与环境变量」小节：`AUTH_SECRET` 必须 ≥ 32 字符（惰性校验，缺失时运行时 503 而非构建报错）；给出生成命令 `openssl rand -hex 32`。
- **.env.example** 删除 `NEXT_PUBLIC_DEMO_USER_ID/NAME/EMAIL` 三件套；新增 `AUTH_SECRET`（带生成说明）。

### 一次性切换策略

- 不保留 demo 灰度：注册/登录 API 写完后，**直接**把 `requireAuth` 切到 JWT 路径，删除 `ensureDemoUser`。一次性切换避免双路径维护负担。

### 实现顺序（Phase 1–8）

按"渐进式迁移"原则，每一步都有可验证产物：

1. **Phase 1 · Schema** —— 加 `passwordHash` / `emailLower` / `auth_attempts` 表，生成并执行迁移。**不动任何其他代码**。
2. **Phase 2 · 服务端 auth lib** —— 新建 `jwt.ts` / `password.ts` / `cookie.ts` / `temp-account.ts` / `ratelimit.ts` / `current-user.ts`，纯函数层不挂 HTTP。
3. **Phase 3 · requireAuth + middleware** —— `requireAuth` 切到 JWT；新建 `src/proxy.ts`，自动建临时账号；scheduler 同步修。
4. **Phase 4 · 公开 auth API** —— 4 个新路由（register/login/logout/me）。
5. **Phase 5 · 客户端 auth store + `<UserProvider>`** —— `eazo-shim.ts` 重写；根布局 RSC 注入；删除 `UserSyncEffect`。
6. **Phase 6 · UI 登录/注册 modal** —— 在用户徽章区加按钮，触发 modal，吐司提示。
7. **Phase 7 · 数据迁移 + env 清理** —— 跑一次迁移脚本（demo 行 → 保留账号，或全清）；改 `.env.example`。
8. **Phase 8 · AGENTS.md / README.md 改写** —— 文档同步。

### 风险与权衡（明确记录）

| 风险 | 缓解 |
|---|---|
| FK `ON UPDATE` 默认 NO ACTION，rename `users.id` 会失败 | 合并走 `UPDATE tasks SET user_id = new WHERE user_id = temp` 显式语句 |
| JWT 30 天内无法撤销 | 演示版可接受；TODO 留口子 |
| 临时账号长期堆积 | v1 不做清理，记 TODO |
| `bcryptjs` 性能弱于 native `bcrypt` | 演示场景 cost=10 在 Serverless 上仍 < 200ms |
| 限流窗口前置 DELETE 每次都跑 | 演示版 QPS 低，开销可忽略 |

---

## Testing Decisions

- **不在 v1 写自动化测试**。
- **理由**：演示版 + 单人开发 + 改动集中在 6 个新文件 + 4 个改动文件；测试的维护成本远大于手动验证收益。
- **手测脚本**（每个 Phase 完成时跑一遍）：
  1. **Phase 1**：跑迁移后 `bun run db:studio` 看到新列与新表；demo 用户行仍在；首页仍能打开。
  2. **Phase 3**：清浏览器 cookie → 访问 `/api/tasks` → 200 且返回新建临时账号的数据；同会话连续请求 → cookie Max-Age 持续刷新。
  3. **Phase 4**：`curl -X POST /api/auth/register` → 拿到 Set-Cookie；同 cookie 调 `/api/auth/me` → 200；故意输错密码 6 次 → 第 6 次被拒。
  4. **Phase 5**：开 DevTools Network → 首屏 `/api/auth/me` **不进 waterfall**（RSC 直接读 cookie）；登录后刷新 → 仍登录。
  5. **Phase 6**：未登录访客 → 看到"注册 / 登录"按钮 → 注册 → 徽章变真名 → 临时账号创建的任务归属到新账号。
  6. **Phase 7**：跑完迁移脚本 → `db:studio` 看 users 表只剩保留账号或 demo 行已清。
- **未来触发条件**（什么时候再回头写测试）：多人正式部署 + 改动超过 3 个非自身功能模块。

---

## Out of Scope

下列项目**不在 v1 范围**，明确列为 TODO（写入 AGENTS.md §15）：

- 邮箱验证邮件发送
- 密码找回 / 重置流程
- JWT 撤销列表（用户主动撤销已签发 token）
- 第三方 OAuth（Google / GitHub）
- Turnstile / hCaptcha 等 CAPTCHA
- 临时账号 30 天过期清理脚本
- 服务端 IP 黑白名单
- 账号删除 / 数据导出
- 多设备会话管理（"踢出其他设备"）
- 密码强度策略（最少长度、字符种类要求）
- 登录失败次数到达阈值后锁定账号
- 双因素认证

---

## Further Notes

### 选型决策摘要（与既有库对齐）

| 项 | 选 | 备注 |
|---|---|---|
| JWT 库 | `jose` | Web 标准、零依赖、Edge runtime 友好 |
| 密码 hash | `bcryptjs` | pure JS、Bun 友好、无 native binding |
| 限流存储 | `auth_attempts` 表 | 替代 Upstash Redis / 内存 Map |
| Cookie 名称 | `__Host-session` | 强制 Secure + 不带 Domain |
| 临时账号标识 | UUID + `@anon.local` 邮箱 | 与正式账号同形，简化 SQL |

### 与 PRD/AGENTS.md 的差异

- **PRD.md §4.4 / §5 / §6.3** 当前描述的是 Eazo 平台 SDK 鉴权（`x-eazo-session` header）。本次改造**完全替换**这段机制，从 SDK 模型切到自托管 JWT cookie。PRD 改动在 Phase 8 文档改写时一并覆盖。
- **AGENTS.md §11** 整段重写。
- **README.md** 增加「认证」小节。

### 已知遗留依赖清理（顺手做）

- `package.json` 的 `"cleanup:demo": "bun scripts/cleanup-demo.ts"` —— 目标脚本已删除，**移除这条**。
- `.env.example` 里的 `NEXT_PUBLIC_DEMO_USER_*` 三件套 —— 移除。

### 不在此次改动但需要登记的事项

- **scheduler.ts 的 `computeNewTaskStartDate`** 当前聚合**所有用户的未完成任务**。改造后必须改成 `WHERE userId = currentUserId` —— 在 Phase 3 时一起修，避免排期"跨用户串串"。
- **`/api/mcp` Streamable HTTP** 在 serverless 无状态模型下每次 SSE 连接独立，无"会话"概念。第一版保持 cookie 鉴权，不做"MCP 客户端如何登录"文档（演示场景不需要）。

### 演示场景的预期体验

- 访客无需注册即可创建任务、看到自己的任务列表、关闭浏览器后再访问仍然在。
- 用户徽章区显示"访客 abcd"或"已登录 alice@example.com"。
- 注册 modal 在 60s 内输错 5 次密码后给出清晰提示，第 6 次被拒。
- 注册完成后所有临时账号的数据无缝转移到正式账号下，无感知。