# 拾级自托管部署

拾级的认证、学习任务、AI 规划和数据库由部署者自行配置。公开体验站是 [talk-task.vercel.app](https://talk-task.vercel.app/)；它的爱猹收收款是**该站独有的可选配置**，新部署默认不收款。项目约束见 [AGENTS.md](./AGENTS.md)，完整变量清单见 [.env.example](./.env.example)，代码入口见[开发参考](./docs/development/agent-reference.md)。

## 1. 准备环境

- Bun 与项目 `package.json` 所用版本兼容。
- PostgreSQL 数据库。Vercel Serverless 建议使用连接池地址（带 `-pooler` 的那一条），否则并发会把连接数打满。
- `AUTH_SECRET` 至少 32 字符。
- 一个 AI 提供方：Gemini 的 `GEMINI_API_KEY`，或 OpenAI 兼容端点的 `AI_PROVIDER_BASE_URL`、`AI_PROVIDER_API_KEY`、`AI_PROVIDER_MODEL`。

将 `.env.example` 复制为本机 `.env.local`，填入上述变量。连接串形如 `postgresql://<用户名>:<密码>@<主机>/<数据库名>?sslmode=require`。`.env.local` 及其他 `.env*.local` 已被 Git 忽略；不要将真实密钥写入 README、提交记录或客户端变量。

## 2. 本地验证

```bash
bun install
bun run db:migrate
bun run lint
bun run test
bun run build
bun dev
```

`db:migrate` 只应在已确认目标数据库和备份策略后运行。既有生产数据库可能有历史迁移漂移，不能把首次部署命令原样用于生产库。Windows 本机若 `.env.production.local` 留有无效 URL 占位值，`bun run build` 会在收集路由配置时失败；先核对本机私密文件，不能把该错误归因于生产部署。

## 3. Vercel 部署

1. 在 Vercel 导入本仓库，核对团队、项目和生产分支。
2. 给 Production 配置 `DATABASE_URL`、`AUTH_SECRET` 与 AI 提供方变量；按需配置搜索、邮件、Cron 等可选变量。
3. 部署后确认目标提交的部署状态为 `READY`，公开域名确实指向它。
4. 访问公开首页和 `/api/auth/config`，再以测试账号验证登录、建任务、生成计划、保存与查看。对支付部署还须另测购买到交付的完整链路。

Vercel 环境变量变更不会更新已运行的部署，需要基于目标提交重新部署。不要用预览环境的数据库、Key 或回跳域名替代 Production 配置。

## 4. Docker 自托管

仓库自带 `Dockerfile`（Bun 构建 + `next start` 运行，非 root 用户）与 `.dockerignore`，可跑在任何能跑容器的机器上：自己的服务器、NAS、内网、Cloudflare Tunnel 后面。

```bash
# 构建（构建期需要访问外网拉依赖与字体）
docker build -t gradus .

# 运行：把 .env.local 里的真实变量注入容器
docker run -d --name gradus -p 3000:3000 --env-file .env.local --restart unless-stopped gradus

# 数据库迁移（在容器内执行，镜像已带 drizzle-kit 与迁移脚本）
docker exec gradus bun run db:migrate
```

要点：

- **不依赖 standalone 输出**：本仓库 `next.config.ts` 的 `output: "standalone"` 分支实测不会产出 `.next/standalone`（webpack 与 turbopack 都试过），依赖它必然构建失败。镜像改为携带 `.next` + `node_modules` 运行 `next start`，行为可预期。
- **迁移在容器里跑**：`bun run db:migrate` 依赖 `tsx` 与 `src/lib/db/migrate.ts`，两者都已打进镜像，用 `docker exec` 执行即可，不必在宿主机上再装一套依赖。
- **构建期需要一个语法合法的连接串占位**：镜像内已用 `DATABASE_URL=postgresql://build:build@localhost:5432/gradus` 兜底用于收集路由配置；真实连接串只在运行期注入，不会被内联进产物。
- **变量改动只需重启**：`.env.local` 是运行时注入的，改它只需 `docker restart gradus`；改了依赖或代码才需要重新 `docker build`。
- **端口**：容器内固定监听 `0.0.0.0:3000`，对外端口改 `-p` 映射；若启用收款，同步设置 `GRADUS_PUBLIC_ORIGIN`。
- **迁移脚本需要真实连接串**：容器内的 `bun run db:migrate` 用的是注入的环境变量，构建期占位值不会生效。

## 5. 其他平台

任何支持 Next.js 16 + PostgreSQL 的平台都适用，配置思路与 Vercel 相同：构建命令 `bun install && bun run build`，启动命令 `bun start`，环境变量按 [.env.example](./.env.example) 配齐，迁移在部署前单独执行。

## 6. 可选：爱猹收次数包

新部署保持 `GRADUS_COMMERCE_ENABLED=false`。若自行开通爱猹收，先完成商品与权益配置、数据库迁移、沙箱闭环，再在该部署的**服务端**配置：

```ini
GRADUS_PAYMENT_PROVIDER=watcha
GRADUS_PUBLIC_ORIGIN=https://<你的正式域名>
WATCHA_PAY_API_KEY=<该环境专用服务端 Key>
WATCHA_PAY_PACK10_ENTITLEMENT_ID=<10 次权益 ID>
WATCHA_PAY_PACK30_ENTITLEMENT_ID=<30 次权益 ID>
GRADUS_COMMERCE_ENABLED=true
```

10/30 次包通过爱猹收托管购买、查询和扣次；Pro 尚未开放。回跳本身不代表付款成功，服务端会重新查权益。公开体验站在 2026-10-25 开放了购买入口，但真实付款、回跳、到账与扣次仍待买家验收；当前状态见 [PAYATHON 投稿状态](./docs/submissions/payathon-2026.md)。旧支付宝直连实现留在代码中，不是当前公开站的收款路径。

## 7. 排查与回退

- 认证失败：核对 `AUTH_SECRET`、数据库连接和用户表迁移。
- AI 规划失败：核对 AI 提供方配置与服务端日志；搜索服务未配置时资源会降级为搜索链接。
- 购买入口不可用：先核对 `GRADUS_COMMERCE_ENABLED`、`GRADUS_PAYMENT_PROVIDER`、`WATCHA_PAY_*` 和 `GRADUS_PUBLIC_ORIGIN` 的作用环境，再查爱猹收商品状态及运行日志。
- 紧急关闭购买：在目标 Production 环境将 `GRADUS_COMMERCE_ENABLED=false` 并重新部署。已付款订单与权益需在爱猹收后台独立核对，关闭入口不会自动退款。
