# 拾级 → Vercel 部署清单

从零到拿到公网链接，约 20 分钟。全程免费、不绑卡、不备案。

---

## 0. 本地自检

本仓库已从原平台解耦，可独立部署。动手前先跑一遍下面三条（应全部通过）：

```bash
bun install
bunx tsc --noEmit     # 无输出 = 通过
bun run build         # ✓ Compiled successfully
```

> Windows 本机注意：若 build 报 Turbopack worker 崩溃，是全局 `NODE_OPTIONS=--use-system-ca` 导致，
> 改用 `env -u NODE_OPTIONS bun run build`。

---

## 1. 开数据库（Neon 免费档）

1. 打开 https://neon.tech → GitHub 账号登录（免费档不需要信用卡）
2. Create Project，Region 选 **Singapore (ap-southeast-1)** 或 **US East**
3. 建完后在 Dashboard 复制 **Connection string**

**关键**：一定要选带 `-pooler` 的那条，形如

```
postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

不带 `-pooler` 的直连串在 Serverless 下会把连接数打满。

---

## 2. 建表（在本地做，Vercel 上跑不了迁移）

把上一步的连接串填进本地 `.env`：

```bash
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
```

然后执行：

```bash
bun run db:migrate
```

成功后表结构就建在 Neon 上了，共 **8 张表**：`users` / `tasks` / `subtasks` / `auth_attempts`（限流）/ `email_verifications`（邮箱验证码）/ `redemption_codes` + `redemption_records`（会员兑换）/ `notifications`（站内通知）。这一步只需做一次。

---

## 3. 准备模型 API

任意 OpenAI 兼容端点都行。三条环境变量：

| 变量 | 说明 | 示例 |
|---|---|---|
| `AI_PROVIDER_BASE_URL` | **必须写到 `/v1` 这一层**，代码会自动拼 `/chat/completions` | `https://api.deepseek.com/v1` |
| `AI_PROVIDER_API_KEY` | 你的 key | `sk-xxxx` |
| `AI_PROVIDER_MODEL` | 模型名 | `deepseek-chat` |

常见端点：

- DeepSeek `https://api.deepseek.com/v1` → `deepseek-chat`
- OpenAI `https://api.openai.com/v1` → `gpt-4o-mini`
- Moonshot `https://api.moonshot.cn/v1` → `moonshot-v1-8k`
- 硅基流动 `https://api.siliconflow.cn/v1` → `Qwen/Qwen2.5-72B-Instruct`

**选型建议**：分析流程要连打 4 次 LLM，选快的模型体验差别很大。
`deepseek-chat` 全程约 40-70 秒，推理型模型（如 o1 / r1）可能超过 200 秒。

先在本地验一次：`bun run dev` → 打开 localhost:3000 → 建个任务跑完整流程。

---

## 4. 推到 GitHub

```bash
git add -A
git commit -m "chore: 适配 Vercel 独立部署"
git remote add origin git@github.com:<你的账号>/Gradus.git
git push -u origin main
```

`.env` 已在 `.gitignore` 中，不会泄露 key。

---

## 部署前必做

两条环境变量漏了不会让 `next build` 失败，但线上一定坏，粘贴时务必确认已填：

| 变量 | 漏了的后果 |
|---|---|
| `AUTH_SECRET` | 惰性校验，构建期不报错；运行时首个要签发/校验 JWT 的请求直接 503。用 `openssl rand -hex 32` 生成，**≥ 32 字符** |
| `EAZO_AI_PROVIDER_MODE` | 漏了会走已废弃的平台代理，分析时报 "BYOK AI provider is not configured" |

**演示数据不用手动灌。** 每个新访客在建临时账号时就自动播种了一份「已学习多日」的任务，
打开 `/app` 直接能看到进度、连续学习天数与今日待办。只有给**脚本运行前就已存在**的老账号
补种时才需要跑一次：

```bash
bun run db:seed-demo
```

---

## 5. Vercel 部署

1. https://vercel.com → Continue with GitHub（**不需要绑卡**）
2. Add New → Project → 选中刚推的仓库 → Import
3. Framework 会自动识别为 Next.js，**Build 设置全部保持默认**
4. 展开 **Environment Variables**，逐条粘贴：

```
DATABASE_URL              postgresql://...-pooler.../neondb?sslmode=require
AUTH_SECRET               <openssl rand -hex 32 生成的随机串，≥ 32 字符>
EAZO_AI_PROVIDER_MODE     byok
AI_PROVIDER_BASE_URL      https://api.deepseek.com/v1
AI_PROVIDER_API_KEY       sk-xxxx
AI_PROVIDER_MODEL         deepseek-chat
CRON_SECRET               <openssl rand -hex 32 生成的随机串>
NEXT_PUBLIC_APP_TITLE     拾级 · Gradus
```

可选项（不配也能跑，配上功能更全）：

```
TAVILY_API_KEY            实时资源检索密钥；留空则资源降级为搜索引擎跳转
QQ_EMAIL_USER / PASS      邮箱验证码（SMTP 授权码），不配则注册走无验证码模式
WATCHA_CLIENT_ID / SECRET Watcha OAuth 登录
```

> 其中 `AUTH_SECRET` 与 `EAZO_AI_PROVIDER_MODE` 两条漏了不会让构建失败、但线上一定坏，
> 原因见下一节。

5. Deploy → 等 2-3 分钟

拿到的 `https://<项目名>.vercel.app` 就是可提交的公网体验链接。

---

## 6. 上线后自检

| 检查项 | 怎么看 |
|---|---|
| 首页能打开、右上角显示「登录 / 注册」按钮（访客无需注册即可建任务） | 直接访问（DevTools Network 应看到 `__Host-session` cookie 被设上） |
| 临时账号下能正常建任务并跑完 4 阶段 | 输入「两周内学会 React 基础」 |
| 临时账号 → 注册正式账号，任务自动归属到新账号 | 点「注册」→ 注册后原任务仍在；刷新后右上角徽章显示正式账号 |
| 数据真的落库 | Neon Dashboard → Tables → tasks 有行 |
| 函数没超时 | Vercel → Deployments → Functions 日志无 `FUNCTION_INVOCATION_TIMEOUT` |

出问题优先看 **Vercel → 项目 → Logs**，运行时报错都在那。

---

## 常见坑

**部署成功但一分析就报错**
→ 99% 是环境变量。检查 `EAZO_AI_PROVIDER_MODE=byok` 是否填了，
`AI_PROVIDER_BASE_URL` 是否**漏了 `/v1`** 或**多写了 `/chat/completions`**。

**报数据库连接失败 / too many connections**
→ 用了不带 `-pooler` 的直连串，换成 pooler 那条并 Redeploy。

**改了环境变量没生效**
→ Vercel 的环境变量不会热更新，必须 Deployments → 右上角 ⋯ → Redeploy。

**分析卡在「写入数据库并排期」很久**
→ 正常。界面右侧有秒数在跳就说明还活着，模型慢而已。
上限 300 秒，超了才会失败。

---

## 演示版的边界

当前实现**没有**密码找回、JWT 撤销、验证码防护：

- **登出只是清 cookie**，不维护撤销表。复制一份 cookie 在 30 天有效期内仍然可用。
- **邮箱验证码取决于 SMTP 配置**：配了 `QQ_EMAIL_USER` / `QQ_EMAIL_PASS`，注册要走验证码；
  没配则降级为无验证码直接注册。
- 注册 / 登录接口只有限流，没有 CAPTCHA。

另外，middleware 会给每个无 cookie 的访客自动建临时账号，所以公开部署的库里会持续累积
匿名账号及其演示任务。`/api/cron/cleanup` 本来该收掉它们，但两条都拦着：
**一是**它的删除条件是「名下零任务」，而建号即播种的演示任务让这个条件永远不成立；
**二是**`vercel.json` 的 `crons` 只排了 `daily-digest`，从没排过 `cleanup`。
所以临时账号目前**只增不减**，需要时手动请求一次（带 `Bearer ${CRON_SECRET}`）或直接删库。

结论：够单人自托管和演示用，**别当多租户生产产品**部署——尤其别把 `DATABASE_URL`
指向存放真实用户数据的库。
