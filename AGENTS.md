# Gradus Agent Guide

拾级（Gradus，仓库名 TalkTask）是一个自托管的 AI 学习任务规划器。产品说明见 [README.md](./README.md)，需求见 [docs/PRD.md](./docs/PRD.md)。

## 开始前

1. 先看当前工作树；不要覆盖用户已有的未提交改动。
2. 只在任务相关时阅读 [开发参考](./docs/development/agent-reference.md)：认证、AI、排期、API、环境变量与数据模型都在这里。
3. 改 UI 前先读 [设计系统](./docs/design-system/design-system.md)、[令牌](./docs/design-system/tokens.md) 和 [规则](./docs/design-system/rules.md)。`output/拾级Gradus-设计预览.html` 是设计真源。
4. 改 Watcha OAuth 时读 [接入资料](./docs/integrations/watcha/oauth2.md)；改 Android 时读 [Android 打包说明](./docs/ANDROID_PACKAGING.md)。
5. 写 Next.js 代码前，先读 `node_modules/next/dist/docs/` 中与当前改动相关的指南。

## 不可破坏的边界

- 用 Bun 执行安装、脚本与测试。常用命令：`bun dev`、`bun run lint`、`bun run test`、`bun run build`。
- 项目是自托管实现；不要引入第三方平台 SDK 或在浏览器侧伪造 session header。
- AI 调用只能位于 `src/app/api/` 路由 handler；客户端不得导入 `appAi`。
- 受保护路由必须先执行 `await requireAuth(request)`；数据查询与写入按 `userId` 隔离。
- 客户端会话使用 `useSessionUser`。副作用依赖 `user?.id`，不要依赖整个 `user` 对象。
- 页面组件不直接取数；请求逻辑放在 `src/lib/api/`，使用 `@/` 别名。
- UI 原语只能从 `@/components/ui/<file>` 深路径具名导入；使用语义 Token，不新增裸色值或临时 UI 原语。
- 一文件一组件：页面软/硬上限 30/50 行，功能组件 150/250 行，工具函数 80/150 行。第二个组件应拆文件。

## 验证

- 常规改动至少跑与影响范围相符的测试；发布前必须通过 `bun run lint` 与 `bun run build`。
- 改设计令牌或界面时，按需运行 `audit:tokens`、`audit:design`、`audit:parity`、`audit:modals`、`audit:colors` 以及 `ds:tokens`、`ds:imports`、`ds:vars`。这些检查和探针入口见开发参考。
- 文档、资产与本地私密文件应放在对应目录，不要堆放根目录；密钥只放在 `.env*` 或 `.local/`，绝不提交。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
