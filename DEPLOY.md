# 拾级 Gradus · 自托管部署 Runbook

> 面向**执行者**（人或 Agent）的一份端到端手册：从零克隆 → 装依赖 → 查环境变量 → 本地预览 → 决定是否上线 → 部署 → 绑域名 → 验收。
>
> 每一节都写成四段式：**做什么 / 命令 / 成功判据 / 出错怎么办**。判据是硬指标：不满足判据不要进入下一节。
>
> 配套：项目约束见 [AGENTS.md](./AGENTS.md)，变量清单见 [.env.example](./.env.example)，代码入口见[开发参考](./docs/development/agent-reference.md)，产品需求见 [docs/PRD.md](./docs/PRD.md)。

---

## 0. 执行者须知

### 0.1 六条铁律

1. **密钥只进环境变量**。`.env*` 文件、平台环境变量面板、Docker `--env-file`。绝不写进 README、代码、提交记录、聊天记录、前端变量（`NEXT_PUBLIC_*` 会被内联进浏览器产物）。
2. **平台知识必须实时查**。Vercel / Neon / Docker / 各云平台的 CLI 参数、套餐、免费额度、控制台路径、域名 DNS 步骤**随时会变**。手册里写的是**查什么、去哪查**，不是**照抄执行**。执行到 §1 的必查清单时，用实时检索工具查官方文档，把结论写进 §附录 B。
3. **每步都要有真实输出**。不要凭「应该没问题」推进；命令的 stdout/stderr 就是证据。判据不满足就停在当前节排错。
4. **迁移只对目标库跑，且先备份**。`bun run db:migrate` 会改生产表结构。
5. **不覆盖用户已有改动**。仓库里若有未提交变更，先 `git status` 看清楚，不要 `git checkout .` / `git reset --hard`。
6. **上线前必过三道门禁**：`bun run lint`、`bun run test`、`bun run build` 全绿，再谈上线。

### 0.2 执行流程

```
        ┌─────────────────────────────────────────────┐
        │ §1 实时信息获取（查官方最新文档，填附录 B）  │
        └─────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────────┐
   关卡 A│ §2 问用户：部署目标？（托管平台 / Docker / 其他）│
        └─────────────────────────────────────────────┘
                              ↓
        §3 克隆 → §4 工具链 → §5 装依赖 → §6 环境变量 → §7 迁移 → §8 本地预览
                              ↓
        ┌─────────────────────────────────────────────┐
   关卡 B│ §9 问用户：是否上线？哪个平台？绑不绑域名？  │
        └─────────────────────────────────────────────┘
                              ↓
     §10 Vercel ／ §11 Docker ／ §12 其他平台（按关卡 B 的选择）
                              ↓
        §13 上线后统一验收 → §14 收款（可选）→ §15 排查回退 → §16 交付报告
```

### 0.3 什么时候必须停下来问用户

| 关卡 | 时机 | 必须问的问题 |
|---|---|---|
| A | §2 开始前 | 部署目标：Vercel / 自有服务器 Docker / 其他云平台 / 只跑本地 |
| B | §8 本地预览通过后 | 是否上线？上哪个平台？绑不绑自定义域名？收款开不开？用生产库还是新库？ |
| C | §13 验收不通过时 | 报告故障现象并给修复方案，等用户决定是否回退 |

Agent 执行时用 `ask_user` 一次问完一个关卡的问题，不要挤牙膏式逐个追问。

---

## 1. 第 0 步：实时信息获取（每次执行都要重做）

### 1.1 为什么这一步不能省

本手册写的是**长期稳定的工程事实**（需要哪些变量、命令怎么跑、判据是什么）。但**平台侧的东西会漂移**：Vercel 的构建镜像默认装不装 Bun 三个月后就可能不一样；Neon 的连接串形态、Railway 的挂载目录、Docker 的 buildx 用法都在变。**照抄旧参数 = 部署失败。**

所以每次执行部署，**先查，后动手**。

### 1.2 必查清单

| # | 要查的事实 | 推荐检索词 | 权威来源（域名以实时查到的为准） | 过期会导致 |
|---|---|---|---|---|
| 1 | Vercel 是否支持 Bun 作为包管理器 / 构建命令怎么填 | `site:vercel.com/docs bun install build command` | vercel.com/docs | 构建直接失败 |
| 2 | Vercel CLI 当前安装与登录方式 | `site:vercel.com/docs vercel cli login` | vercel.com/docs + 本地 `vercel --help` | 命令行部署失败 |
| 3 | Vercel 自定义域名的添加与 DNS 指向步骤 | `site:vercel.com/docs custom domain dns` | vercel.com/docs | 域名解析不到 |
| 4 | Vercel 环境变量的 Production / Preview / Development 作用域差异与生效规则 | `site:vercel.com/docs environment variables scope redeploy` | vercel.com/docs | 变量不生效 |
| 5 | Vercel 是否需要 Prebuilt / 是否要指定 Output Directory | `site:vercel.com/docs nextjs output directory build settings` | vercel.com/docs | 部署后 404 |
| 6 | Postgres 连接串形态与 pooler / 直连差异 | `site:neon.tech/docs pooled connection string` / `site:supabase.com/docs connection pooler` | neon.tech/docs / supabase.com/docs | 连接数打满 |
| 7 | Docker 多架构构建与镜像瘦身官方建议 | `site:docs.docker.com buildx multi-platform slim` | docs.docker.com | 镜像拉不动 / 体积爆炸 |
| 8 | Bun 与 Next.js 16 的兼容状态 | `site:bun.sh/docs next.js` + `site:nextjs.org/docs` | bun.sh/docs + nextjs.org/docs | 构建报错 |
| 9 | 你选的平台当前的免费额度 / 计费口径 | `<平台名> pricing free tier site:<平台域名>` | 平台官网 pricing 页 | 意外扣费 |
| 10 | 目标平台是否需要「迁移在部署前单独执行」 | `site:<平台域名>/docs run migrations on deploy` | 平台 docs | 上线后表不存在 |

> **检索时务必加 `site:` 限定**：中文检索会把大量第三方博客与教程排在官方文档前面，博客里的参数经常是过期版本。官方文档没读到之前，不要执行平台参数。
>
> **第 10 条特别重要**：多数 Serverless 平台的构建阶段**不能**连生产库，迁移必须在构建之前单独执行，或通过平台的 pre-deploy hook / 一次性任务执行。

### 1.3 怎么查

- Agent：用 web 搜索工具检索上面的关键词，优先打开**官方文档域名**的页面；至少打开 2 个来源交叉验证关键结论（套餐、额度、命令）。
- 人工：直接访问对应官方文档站，按 §1.2 的检索词搜索。
- 把查到的**结论 + 查询日期 + 来源链接**写进 §附录 B。后续步骤引用它，而不是引用本手册。

### 1.4 判据

- [ ] §1.2 表里与你本次路径相关的行都已查过（Vercel 路线查 1–5、10；Docker 路线查 6、7；数据库必查 6）
- [ ] 附录 B 至少有：平台版本结论、构建命令结论、域名结论、迁移结论

---

## 2. 关卡 A：确定部署目标

### 2.1 三条路的取舍

| 路线 | 适合谁 | 优点 | 代价 |
|---|---|---|---|
| **Vercel**（托管） | 想最快拿到公网链接、给人体验 | 免运维、自动 HTTPS、预览部署、域名一条命令 | 需要有 Vercel 账号；Serverless 需用 pooler 连接串 |
| **Docker 自托管** | 已有服务器 / NAS / 想完全掌控 | 数据在自己手里、可内网访问、可离线 | 要自己管进程、证书、日志、备份 |
| **其他云平台** | 想用 Render / Railway / Fly.io / 自有 K8s | 灵活、可按量付费 | 每家迁移与挂载规则不同，必须实时查 |

### 2.2 询问模板

> 部署目标选哪个？
> ① Vercel（最快拿到公网 HTTPS 链接，推荐）
> ② 自有服务器 / NAS + Docker（数据自持）
> ③ 其他云平台（Render / Railway / Fly.io / 自有 K8s）
> ④ 只在本机跑，先不上线

同时问清楚：**有没有已备案/已解析的域名**、**数据库是新建还是复用现有**。

### 2.3 判据

- [ ] 目标路线已选定并记录到附录 B
- [ ] 若是 Docker 路线：确认目标机器能跑 Linux 容器、有域名或至少可开端口

---

## 3. 第 1 步：获取代码

### 3.1 命令

```bash
git clone https://github.com/melondy101/Gradus.git
cd Gradus
git log --oneline -1        # 确认拿到的是最新提交
```

没有仓库写权限时：先在 GitHub 上 Fork，再用你的 fork 地址 clone。

### 3.2 判据

- [ ] `git log -1` 有输出，不是空仓库
- [ ] 仓库根目录能看到 `package.json`、`src/`、`DEPLOY.md`、`Dockerfile`

### 3.3 出错怎么办

| 现象 | 处理 |
|---|---|
| 克隆很慢 / 失败 | 配置代理；或用 `git clone --depth 1` 浅克隆 |
| 提示无权限 | 仓库是私有的 → 改用 SSH 地址或让管理员加你为 collaborator |

---

## 4. 第 2 步：准备工具链

### 4.1 需要什么

| 工具 | 要求 | 检查命令 |
|---|---|---|
| Bun | 与 `bun.lock` 兼容的版本（仓库 CI/开发用的是什么就用什么） | `bun --version` |
| Git | 任意近期版本 | `git --version` |
| Node.js | 仅部分工具链需要（Next 的部分插件） | `node --version` |
| Docker | 仅 Docker 路线需要 | `docker version`（客户端+守护进程都要通） |

### 4.2 实时确认

- 查 §1.2 第 8 条：**Bun 与 Next.js 16 的兼容性**。若 Bun 版本过旧，`bun run build` 可能报奇怪的错。
- 若构建报错且堆栈指向 Node 生态的原生模块，改用 Node 跑构建（`npx next build`）而不是降级 Bun。

### 4.3 判据

- [ ] `bun --version` 有输出
- [ ] Docker 路线：`docker version` 能同时看到 Client 和 Server（只看到 Client 说明守护进程没启动）

---

## 5. 第 3 步：安装依赖

### 5.1 命令

```bash
bun install --frozen-lockfile
```

首次拉取慢属正常。装完确认锁文件没被改动：

```bash
git status --porcelain bun.lock    # 应无输出
```

### 5.2 判据

- [ ] `bun install` 退出码 0，无 `error: lockfile had changes`
- [ ] `bun.lock` 未被修改

### 5.3 出错怎么办

| 现象 | 处理 |
|---|---|
| 依赖下载失败 | 检查网络/代理；`bun install --verbose` 看具体 URL |
| 报 lockfile 校验失败 | lockfile 与 `package.json` 不同步 → 用 `bun install`（不带 frozen）重新生成，**并把 lockfile 一起提交** |
| 报原生模块编译失败 | 装编译工具链（Linux 需 `build-essential` + `python3`） |

---

## 6. 第 4 步：环境变量

这一步是部署失败的最大来源。**先配齐，再自检，再继续。**

### 6.1 必填清单

| 变量 | 作用 | 缺失后果 |
|---|---|---|
| `DATABASE_URL` | Postgres 连接串 | 所有读写接口 500 |
| `AUTH_SECRET` | JWT 签名密钥，≥ 32 字符 | 生产环境鉴权请求直接 503 |
| AI 三选一 | `GEMINI_API_KEY` 或 `AI_PROVIDER_BASE_URL` + `AI_PROVIDER_API_KEY` + `AI_PROVIDER_MODEL` | AI 分析必然失败 |

选填（按需）：搜索服务、邮件验证码、收款、观猹 OAuth、管理员邮箱、GitHub 更新检查。

### 6.2 这几个值从哪来

**`AUTH_SECRET`** —— 本地生成，不要抄别人的：

```bash
# macOS / Linux
openssl rand -hex 32

# Windows PowerShell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

**`DATABASE_URL`** —— 从托管 Postgres 控制台复制，形态：

```
postgresql://<用户名>:<密码>@<主机>/<数据库名>?sslmode=require
```

Serverless（Vercel）**必须用带 pooler / 池化地址的那条**，否则并发起来连接数会被打满，报 `too many connections`。直连与池化地址的区别**实时查 §1.2 第 6 条**确认，不要凭印象。

**AI 提供方** —— 两条路，二选一：

- **Gemini**：只填 `GEMINI_API_KEY`，模型默认 `gemini-2.5-flash`。
- **BYOK 自建端点**：`AI_PROVIDER_BASE_URL` 必须写到 **`/v1` 这一层**（代码会自动拼 `/chat/completions`），例：`https://api.deepseek.com/v1`。写成 `https://api.deepseek.com` 会 404，写成 `https://api.deepseek.com/v1/chat/completions` 会变成 `/v1/chat/completions/chat/completions`。

**路由优先级**（与 `src/lib/ai-client.ts` 的 `resolveProvider()` 一致，`bun run check:env` 会按同一套逻辑判定）：

1. `AI_PROVIDER_MODE=gemini|byok` 显式指定时优先（但显式指定后，对应的那套变量必须齐）；
2. 否则 BYOK 三件套齐 **且** 没有 `GEMINI_API_KEY` → 走 BYOK；
3. 否则有 `GEMINI_API_KEY` → 走 Gemini；
4. 都不满足 → 抛错（用户端只显示通用的「分析未能完成」，原因只在服务端日志）。

> ⚠️ 历史坑：BYOK 三件套齐但没设 `AI_PROVIDER_MODE` 时，`AI_PROVIDER_API_KEY` 会被当成 Gemini key 发给 Google，导致 10 秒后 `fetch failed`。**若 Gemini 与 BYOK 同时配好，实际走的是 Gemini 分支，BYOK 会被闲置**——想让自建端点生效，就把 `GEMINI_API_KEY` 删掉。

### 6.3 变量放在哪

| 场景 | 放哪 | 生效方式 |
|---|---|---|
| 本机开发 | 仓库根目录 `.env.local` | 重启 `bun dev` |
| Vercel | Project → Settings → Environment Variables（选 Production / Preview / Development 作用域） | **必须重新部署**才生效 |
| Docker | `--env-file .env.local` 注入容器 | `docker restart gradus` |
| 其他平台 | 平台的环境变量面板 | 按平台规则（多数要重新部署） |

`.env.local` / `.env*.local` 已在 `.gitignore` 中，**永远不要提交**。

### 6.4 自动自检（别靠肉眼）

```bash
bun run check:env                 # 读 .env → .env.local，逐项给结论
bun run check:env -- --connect    # 额外实测数据库连通性、表数量、迁移记录
bun run check:env -- --file .env.production.local   # 检查指定文件
bun run check:env -- --json       # 机器可读输出（给 Agent 用）
bun run check:env -- --mode local # 本地口径（AUTH_SECRET 缺失只警告不阻断）
```

脚本**只输出「是否存在 / 长度 / 来自哪个文件」，绝不打印密钥原文**。

### 6.5 自检输出解读

| 编号 | 含义 | 修法 |
|---|---|---|
| `DB-01` | `DATABASE_URL` 没配 | 从控制台复制连接串 |
| `DB-02` | 连接串不是合法 postgres URL | 检查是不是把占位值当成了连接串（典型：本机 `.env.production.local` 里的 13 字符占位值会让 `next build` 报 `ERR_INVALID_URL`） |
| `DB-03` | 连接串含占位关键词 | 换真实连接串 |
| `AUTH-01` | `AUTH_SECRET` 没配 | 生成 32+ 字符随机串 |
| `AUTH-02` | 长度 < 32 | 重新生成 |
| `AUTH-03` | `AUTH_SECRET_ALLOW_INSECURE=1` | 生产环境删掉它，否则等于关掉防伪造 |
| `AI-01` | AI 没配 | 二选一（见 §6.2） |
| `AI-03` | `BASE_URL` 没写到 `/v1` | 改成 `https://xxx/v1` |
| `AI-05` / `AI-06` | 显式模式与实际变量不匹配 | 补齐变量或删掉 `AI_PROVIDER_MODE` |
| `PAY-02` | 收款开了但服务端 Key / 权益 ID 缺失 | 补齐或关掉 `GRADUS_COMMERCE_ENABLED` |
| `OAUTH-01` | OAuth 客户端 ID 与密钥不成对 | 补齐 |

### 6.6 常见症状速查

| 症状 | 大概率原因 | 处理 |
|---|---|---|
| `next build` 报 `ERR_INVALID_URL` | 某处 `DATABASE_URL` 是占位值 | 按 `DB-02` 修 |
| 页面能开但一进登录就 503 | `AUTH_SECRET` 缺失或过短 | 按 `AUTH-01/02` 修 |
| 分析一直转圈后报「分析未能完成」 | AI 没配 / BASE_URL 少 `/v1` / 走了错误的 provider 分支 | 看服务端日志 `[AutoTask] analyze pipeline error`；用 `check:env` 确认走哪个分支 |
| `too many connections` | Serverless 用了直连地址 | 换 pooler 地址 |
| 环境变量改了没生效 | 平台环境变量不会热更新 | 重新部署 / 重启容器 |

### 6.7 判据

- [ ] `bun run check:env` 退出码 0（无阻断项）
- [ ] `--connect` 模式下数据库连通、表已存在
- [ ] 所有密钥只存在于环境变量文件 / 平台面板，**没有进入 git**

---

## 7. 第 5 步：数据库迁移

### 7.1 什么时候跑

- 目标库**第一次**使用 → 必须跑。
- 生产库**已有历史数据** → 先做 §7.2 的漂移核查，再决定是补跑还是直接沿用。

### 7.2 生产库迁移漂移核查（生产库必做）

历史部署可能存在「代码里的迁移文件」与「库里实际执行的迁移」不一致（漂移）。直接跑 `db:migrate` 可能报错或重复建表。

核查方法：

1. 看 `drizzle/`（或 `src/lib/db/migrations`）目录里的迁移文件列表与序号；
2. 看生产库里 `drizzle.__drizzle_migrations` 表里已执行的迁移记录；
3. 对不上时**先备份**，再决定：用 `bun run db:push` 对齐结构，或补一个基线迁移。

> 拿不准就备份后问用户，不要在生产库上试错。

### 7.3 命令与判据

```bash
bun run db:migrate
```

- [ ] 退出码 0，日志出现迁移完成提示，无 DDL 报错
- [ ] `bun run check:env -- --connect` 显示「迁移记录表存在」

Docker 路线在容器里跑：

```bash
docker exec gradus bun run db:migrate
```

### 7.4 出错怎么办

| 现象 | 处理 |
|---|---|
| `relation "xxx" does not exist` | 迁移没跑或漂移 → 回 §7.2 |
| `password authentication failed` | 连接串用户名密码错 |
| `could not connect to server` | 网络/白名单（托管 PG 常有 IP 白名单，Serverless 需放行） |

---

## 8. 第 6 步：本地预览与自检

### 8.1 三道门禁

```bash
bun run lint     # 0 error
bun run test     # 全部通过
bun run build    # 构建成功
```

> 本机若 `.env.production.local` 留有无效 URL 占位值，`bun run build` 会在收集路由配置时失败（`ERR_INVALID_URL`）。这是本机私密文件问题，**临时用环境变量覆盖**即可，别把锅甩给生产部署，也别把它提交上去。

### 8.2 起服务

```bash
bun dev          # http://localhost:3000
```

### 8.3 浏览器自检清单（逐项打勾，全过才算本地通过）

| # | 检查项 | 判据 |
|---|---|---|
| 1 | 落地页 | 首屏渲染正常，版本徽章与页脚版本号一致，hero 标题是衬线字 |
| 2 | 落地页样例带 | 点 L3 台阶后清单只剩该阶任务；勾选后进度百分比实时变化 |
| 3 | 访客建任务 | 不登录也能建任务，访客被自动分配临时账号 |
| 4 | AI 分析 | 四阶段动画走完，生成带层级（L1–L6）的子任务 |
| 5 | 今日面板 | 层级标签与任务详情页一致（同一子任务显示同一个 L） |
| 6 | 任务详情页 | 甘特色条颜色 = 认知层级，完成打勾，「今天」列有淡朱砂底 |
| 7 | 工时口径 | 今日面板的每日工时 = 详情页总工时 ÷ 天数，不是写死的 1.5h |
| 8 | 额度提示 | 新账号提示「试用 3 次」，用完后提示每日刷新 |
| 9 | 注册 / 登录 | 能注册、能登录，登录后任务归属正确 |
| 10 | 静态资源 | `/icon.svg`、`/manifest.webmanifest` 返回 200 且是新标识 |
| 11 | 移动端窄屏 | 导航折叠正常，无横向滚动条 |
| 12 | 收款入口 | 默认关闭（`GRADUS_COMMERCE_ENABLED=false`）时不出现购买按钮 |

### 8.4 出错怎么办

| 现象 | 处理 |
|---|---|
| 端口被占用 | `bun dev --port 3001`（或改 `package.json` 的 dev 脚本） |
| 改了代码不生效 | 清 `.next` 重启；确认不是缓存的构建产物 |
| AI 面板报「分析未能完成」 | 回 §6.6，服务端日志里有真实原因 |

---

## 9. 关卡 B：是否上线（**必须问用户**）

本地跑通不等于可以上线。上线前一次性问清四件事：

> 1. **是否现在上线？**（也可以先只留在本机）
> 2. **上哪个平台？** Vercel / 自有服务器 Docker / 其他云平台
> 3. **绑自定义域名吗？** 有域名请给域名；没有就用平台默认域名（`*.vercel.app` / 自有服务器可用 IP + 端口，或 Cloudflare Tunnel）
> 4. **收款开不开？**（默认关。开启需要商品 + 权益 + 回跳域名都就位，见 §14）

同时确认：**目标数据库是新建的还是现有的生产库**（现存的先备份 + 走 §7.2 漂移核查）。

### 9.1 判据

- [ ] 用户的四个决策已记录到附录 B
- [ ] 若上线且绑域名：域名已解析到目标平台（§10.6 / §11.3 会引导）

---

## 10. 部署执行 A：Vercel

### 10.1 两条路线

**A1 · 网页导入（首次推荐）**

1. 打开 Vercel 控制台 → Add New → Project → 导入本仓库；
2. Framework 预设应为 **Next.js**（实时确认 §1.2 第 1、5 条）；
3. Build 设置按 §10.3 填；
4. Environment Variables 按 §10.2 逐条粘贴，**作用域选 Production**；
5. Deploy，等待构建完成（**先确认 §1.2 第 10 条：迁移要不要另外跑**）。

**A2 · CLI（重复部署 / 自动化）**

```bash
bunx vercel --version        # 先看当前 CLI 版本与可用参数（§1.2 第 2 条）
bunx vercel login
bunx vercel link             # 绑定到项目
bunx vercel env pull .env.production.local   # 把 Production 变量拉到本地（**该文件别提交**）
bunx vercel deploy --prod
```

> CLI 参数随版本变化，**以 `vercel --help` 与官方文档为准**，不要照抄本节。

### 10.2 环境变量映射

| 本地变量 | Vercel 变量名 | 作用域 | 必填 |
|---|---|---|---|
| `DATABASE_URL` | 同名 | Production | ✅ |
| `AUTH_SECRET` | 同名 | Production | ✅ |
| `GEMINI_API_KEY` / `AI_PROVIDER_*` | 同名 | Production | ✅（二选一） |
| `TAVILY_API_KEY` 等搜索 | 同名 | Production | ⭕ |
| `QQ_EMAIL_*` / `SMTP_*` | 同名 | Production | ⭕ |
| `GRADUS_PUBLIC_ORIGIN` | 同名 | Production | 收款/绑域名后 ✅ |
| `WATCHA_REDIRECT_URI` | 同名 | Production | 用观猹登录时 ✅，值须是**生产域名**下的 `/api/auth/oauth/watcha/callback` |
| `WATCHA_PAY_*`、`GRADUS_COMMERCE_ENABLED` | 同名 | Production | 收款时 ✅ |
| `NEXT_PUBLIC_*` | 同名 | Production + Preview | ⭕ |

⚠️ **`NEXT_PUBLIC_*` 会被编译进浏览器产物**，只放前端真正需要的（如 `NEXT_PUBLIC_APP_TITLE`、`NEXT_PUBLIC_GITHUB_REPO`、`NEXT_PUBLIC_ADMIN_EMAIL`）。**任何 `NEXT_PUBLIC_*` 里都不能放密钥。**

### 10.3 构建设置

| 项 | 值 |
|---|---|
| Framework Preset | Next.js |
| Install Command | `bun install` |
| Build Command | `bun run build` |
| Output Directory | `.next`（Next.js 预设通常自动处理，实时确认 §1.2 第 5 条） |
| Node.js Version | 按平台支持范围，实时查（§1.2 第 1 条） |

### 10.4 部署后验证

```bash
curl -I https://<你的域名>/                      # 期望 200
curl -s https://<你的域名>/api/auth/config        # 期望返回 JSON（鉴权配置自检）
```

再按 §8.3 的清单走一遍（重点：访客建任务 + AI 分析 + 任务详情页层级与工时）。

### 10.5 迁移在 Vercel 上怎么跑

Vercel 构建阶段通常**不该**连生产库。两种做法（实时确认 §1.2 第 10 条后选）：

```bash
# 做法一：本地指向生产库跑迁移（最常见）
bunx vercel env pull .env.production.local
bun run db:migrate

# 做法二：平台的一次性/预部署任务（若平台支持）
# 按平台文档配置 pre-deploy hook
```

### 10.6 绑定自定义域名（详细）

1. Vercel 控制台 → 你的项目 → **Settings → Domains**；
2. 输入域名（如 `example.com`）→ Add；
3. Vercel 会给出需要配置的目标地址（CNAME 指向 `cname.vercel-dns.com`，或 A 记录指向 Vercel 的 IP）——**以控制台当时显示的为准**；
4. 到域名 DNS 服务商添加对应的 CNAME / A 记录；
5. 回到 Vercel 点 **Verify**（DNS 生效通常几分钟，最长 24–48 小时）；
6. 验证通过后 Vercel 自动签发 HTTPS 证书；
7. **把域名写回环境变量**并重新部署：
   - `GRADUS_PUBLIC_ORIGIN=https://example.com`
   - `WATCHA_REDIRECT_URI=https://example.com/api/auth/oauth/watcha/callback`
   - 观猹后台登记的回调地址也要同步改成新域名
8. 重新部署后按 §13 验收一遍，尤其是**支付回跳**（如果开了收款）。

> `www` 与根域：建议在 DNS 侧把 `www` CNAME 到根域或直接交给平台重定向，二者选一，别同时解析到两处。

### 10.7 Vercel 常见坑

| 坑 | 说明 |
|---|---|
| 环境变量改了不生效 | 必须重新部署（Redeploy），不会热更新 |
| Preview 部署变量缺 `WATCHA_REDIRECT_URI` | 观猹登记的是固定回调，Preview URL 不匹配会失败 |
| 用 Preview 的数据库/Key 去测 Production | 会污染数据；不要混用 |
| 函数超时 | AI 分析阶段长，看日志里的超时标记；不要盲目加长超时掩盖慢模型 |

---

## 11. 部署执行 B：Docker 自托管

### 11.1 构建与运行

```bash
docker build -t gradus .

docker run -d --name gradus \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  gradus

docker exec gradus bun run db:migrate

# 容器内也能做环境变量自检（用的是注入容器的真实变量）
docker exec gradus bun run check:env -- --connect
```

镜像说明：`oven/bun:1.3-alpine` 构建 → 同镜像运行 `next start`（`USER bun` 非 root）。

> **为什么不依赖 `output: "standalone"`**：本仓库 `next.config.ts` 里的 standalone 分支实测**不会产出 `.next/standalone`**（webpack 与 turbopack 两种构建都验证过），依赖它必然构建失败。镜像改为携带 `.next` + `node_modules` 运行，行为可预期。
>
> 想更瘦的镜像：把迁移拆成独立阶段或换用精简的迁移命令，运行镜像只留生产依赖（`bun install --production`）。瘦身时务必重新验证 `docker exec ... bun run db:migrate` 仍可用。

### 11.2 升级与回滚

```bash
docker build -t gradus:new .          # 构建新镜像
docker stop gradus && docker rm gradus
docker run -d --name gradus -p 3000:3000 --env-file .env.local --restart unless-stopped gradus:new
```

回滚：把 tag 换回旧镜像重启即可。**升级前先备份数据库**（`pg_dump`）。

### 11.3 绑域名与 HTTPS

最省事的是 **Caddy**（自动签发证书）：

```caddy
example.com {
    reverse_proxy 127.0.0.1:3000
}
```

或 Nginx（需 certbot 证书）：

```nginx
server {
    server_name example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

要点：
- 反代必须透传 `Host` 与 `X-Forwarded-Proto`，否则回跳域名与协议判断会错；
- 证书签发前 DNS 要已指向本机；
- 拿到 HTTPS 域名后，把 `GRADUS_PUBLIC_ORIGIN` / `WATCHA_REDIRECT_URI` 改成该域名并重启容器。

### 11.4 Docker 常见坑

| 坑 | 说明 |
|---|---|
| 容器内 `next start` 只听 localhost | 镜像已设 `HOSTNAME=0.0.0.0`；自改镜像时别漏 |
| 端口冲突 | 改 `-p 8080:3000` |
| 改了环境变量没生效 | `--env-file` 是启动时注入的 → `docker restart` |
| 改了代码没生效 | 必须重新 `docker build` + 换容器 |
| 磁盘被镜像撑爆 | `docker system df` / `docker image prune` |

---

## 12. 部署执行 C：其他云平台

### 12.1 通用要求

| 项 | 要求 |
|---|---|
| 安装命令 | `bun install` |
| 构建命令 | `bun run build` |
| 启动命令 | `bun run start`（即 `next start`） |
| 环境变量 | 同 §10.2 的映射表 |
| 迁移 | **部署前单独执行** `bun run db:migrate`（§1.2 第 10 条） |
| 端口 | 平台注入 `PORT`；本项目镜像已用 `HOSTNAME=0.0.0.0` 监听 |
| 数据卷 | 只有用本地 Postgres 容器时才需要持久卷 |

### 12.2 各平台要点（**必须实时查当前文档**）

| 平台 | 实时查什么 |
|---|---|
| Render | Web Service 的 build/start 命令、Postgres 托管与内部连接串、磁盘挂载 |
| Railway | 服务与 Postgres 的关系、变量组（Variables）、域名绑定 |
| Fly.io | `fly launch` 生成的 `fly.toml`、卷、Secrets、`fly deploy` |
| Cloudflare | Workers/Pages **不能**直接跑 Next.js Node 服务 → 需要容器平台或适配层；查当前支持情况 |
| 自有 K8s | Ingress + Service + Secret，镜像拉取凭据 |

### 12.3 判据

- [ ] 平台部署状态为 Ready/Running
- [ ] `/api/auth/config` 可访问
- [ ] 按 §13 验收清单全部通过

---

## 13. 上线后统一验收清单

对最终访问地址逐项执行，任何一项不过就不要宣告完成：

| # | 检查 | 方式 | 判据 |
|---|---|---|---|
| 1 | 首页可达 | `curl -I <url>` | 200 |
| 2 | 鉴权配置接口 | `curl -s <url>/api/auth/config` | 返回 JSON |
| 3 | 静态资源 | `curl -I <url>/icon.svg` | 200 且是新标识 |
| 4 | 落地页关键区块 | 浏览器 | 样例带、额度带、隐私带、页脚版本号 |
| 5 | 访客建任务 | 浏览器 | 无需登录即可创建 |
| 6 | AI 分析全流程 | 浏览器 | 四阶段动画 + 生成带层级的子任务 |
| 7 | 层级一致性 | 浏览器 | 今日面板 == 详情页 |
| 8 | 工时口径 | 浏览器 | 每日工时与详情页总工时吻合 |
| 9 | 额度 | 浏览器 | 试用 3 次提示正确 |
| 10 | 注册登录 | 浏览器 | 登录后数据归属正确 |
| 11 | 域名与证书 | 浏览器 | 自定义域名可达，HTTPS 无警告，证书有效 |
| 12 | 收款（若开启） | 浏览器 + 后台 | 购买 → 回跳 → 权益到账 → 扣次全链路 |

---

## 14. 收款（可选）

**默认关闭**：`GRADUS_COMMERCE_ENABLED=false`。自托管部署建议保持关闭，除非确实需要收款。

开启前必须全部就位：

1. 收款平台的**商品**与**权益**（次数包）已创建；
2. 数据库迁移已完成；
3. 服务端变量已配：
   ```ini
   GRADUS_PAYMENT_PROVIDER=watcha
   GRADUS_PUBLIC_ORIGIN=https://<正式域名>
   WATCHA_PAY_API_KEY=<该环境专用服务端 Key>
   WATCHA_PAY_PACK10_ENTITLEMENT_ID=<10 次权益 ID>
   WATCHA_PAY_PACK30_ENTITLEMENT_ID=<30 次权益 ID>
   GRADUS_COMMERCE_ENABLED=true
   ```
4. **回跳域名**与平台登记地址一致（观猹登记的是固定回调地址，Preview URL 常常不匹配）。

注意：
- 回跳**不代表**付款成功，服务端会重新查询权益；
- 沙箱与生产用**不同的** API Key 与权益 ID；
- 紧急关闭：在目标环境把 `GRADUS_COMMERCE_ENABLED=false` 并重新部署。已付款订单需在收款后台单独核对，关闭入口不会自动退款。

---

## 15. 排查与回退

| 症状 | 排查顺序 | 处理 |
|---|---|---|
| 首页 500 | 容器/函数日志 → 数据库连通 → 环境变量 | 按 §6.6 对症 |
| 首页 404 | 构建输出目录、路由 | 核对 §10.3 |
| 登录 503 | `AUTH_SECRET` | §6.5 |
| 分析失败 | 服务端日志 `[AutoTask] analyze pipeline error` | AI 分支判定（§6.2）+ BASE_URL 层级 |
| 数据写不进去 | DB 权限 / 迁移是否跑 / 白名单 | §7 |
| 域名解析不了 | DNS 记录类型与目标值 | 以平台控制台当时显示的为准 |
| HTTPS 证书失败 | DNS 是否已生效、是否占用旧 CDN 证书 | 等 DNS 生效后重签 |
| 上线后要回退 | Vercel：Deployments → 上一版本 → Promote；Docker：换回旧镜像 tag | 回退前确认数据库是否已迁移（DDL 通常不自动回滚） |

---

## 16. 交付报告模板（执行完必填）

```
部署目标：<平台 / 域名>
提交版本：<git short sha>（<时间>）
执行路径：§1 实时查询结论（附来源链接）
           §3–§8 本地验证结果（lint/test/build + 12 项自检）
           §10/§11/§12 部署步骤与实际输出
环境变量：仅列变量名与「已配置/未配置」，不列值
数据库：连接串主机与库名（不含密码）、迁移是否执行、是否做过漂移核查
验收：§13 清单逐项 ✅/❌ + 实测链接
未完成/遗留：<明确列出，含「需要用户做什么」>
```

---

## 附录 A · 环境变量速查

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres 连接串，Serverless 用池化地址 |
| `AUTH_SECRET` | ✅ | ≥ 32 字符，`openssl rand -hex 32` |
| `GEMINI_API_KEY` | 三选一 | Gemini 路线 |
| `AI_PROVIDER_BASE_URL` | 三选一 | 必须含 `/v1` |
| `AI_PROVIDER_API_KEY` | 三选一 | 自建端点 key |
| `AI_PROVIDER_MODEL` | 三选一 | 模型名 |
| `AI_PROVIDER_MODE` | ⭕ | `gemini` / `byok`，不设则自动判断 |
| `GRADUS_COMMERCE_ENABLED` | ⭕ | 默认 `false` |
| `GRADUS_PUBLIC_ORIGIN` | 收款时 | 公网地址，https |
| `GRADUS_PAYMENT_PROVIDER` | 收款时 | `watcha` / `alipay` |
| `WATCHA_PAY_API_KEY` / `WATCHA_PAY_PACK10_ENTITLEMENT_ID` / `WATCHA_PAY_PACK30_ENTITLEMENT_ID` | 收款时 | 服务端专用，绝不进浏览器 |
| `WATCHA_CLIENT_ID` / `WATCHA_CLIENT_SECRET` / `WATCHA_REDIRECT_URI` | ⭕ | 观猹 OAuth，`REDIRECT_URI` 必须是登记过的生产地址 |
| `TAVILY_API_KEY` / `SERPAPI_API_KEY` / `BRAVE_SEARCH_API_KEY` / `DOUBAO_API_KEY` | ⭕ | 资源搜索，至少一个 |
| `QQ_EMAIL_USER` / `QQ_EMAIL_PASS` 或 `SMTP_*` | ⭕ | 验证码邮件，不配则走 mock |
| `ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_EMAIL` | ⭕ | 管理入口，两者同值 |
| `CRON_SECRET` | ⭕ | 定时任务鉴权 |
| `GITHUB_REPOSITORY` / `NEXT_PUBLIC_GITHUB_REPO` | ⭕ | 客户端更新检查 |

---

## 附录 B · 本次执行记录（执行者填写）

```
执行日期：
执行者：
部署目标：<平台 / 域名>
数据库：<主机 / 库名 / 是否生产库 / 是否已备份>

§1 实时查询结论
  1. <事实> —— 来源：<URL>（查询于 <日期>）
  2. ...
  3. ...

关卡 A 决策：<用户选择>
关卡 B 决策：<是否上线 / 平台 / 域名 / 收款 / 数据库>

关键命令与结果：
  <命令> → <结果摘要>

§13 验收：<逐项 ✅/❌>

遗留与需用户处理：
  -
```

---

## 附录 C · 术语

| 词 | 含义 |
|---|---|
| BYOK | Bring Your Own Key，自带模型 API Key，直连自己的 OpenAI 兼容端点 |
| 访客账号 | 未登录时自动分配的临时账号，数据隔离但可丢弃 |
| 认知层级 | L1–L6 的布鲁姆式学习层级，决定色轨与排期强度 |
| 池化地址 | Postgres 的连接池入口，Serverless 必用 |
| 回跳域名 | 支付完成后浏览器返回的地址，必须与登记地址一致 |
