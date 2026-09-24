<div align="center">

<img src="./src/app/icon.svg" width="108" height="108" alt="拾级 Gradus Logo" style="border-radius: 24px; box-shadow: 0 8px 30px rgba(79, 70, 229, 0.25);" />

# 拾级 · Gradus (TalkTask)

**面向自主学习者的认知级 AI 任务规划与全局排期系统**

*“千里之行，始于足下；博学审问，拾级而上。”*

> 独立开发、已部署的学习规划原型：把模糊目标变成有真实资源支撑、可排进日程的下一步。<br>
> *An independently built prototype that turns a vague learning goal into a resource-backed, scheduled learning plan.*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3_(App_Router)-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Bun Runtime](https://img.shields.io/badge/Bun-1.3+-F472B6?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_+_Drizzle-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://orm.drizzle.team/)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP_Streamable_HTTP-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](./LICENSE)

[🌐 在线体验](https://talk-task.vercel.app/) · [📖 产品设计 (PRD)](./docs/PRD.md) · [🛠️ 开发者指南 (AGENTS)](./AGENTS.md) · [🚀 20分钟快速部署 (DEPLOY)](./DEPLOY.md)

</div>

---

## 🌟 为什么需要「拾级」？

传统待办清单（Todo List）与项目管理工具对自主学习者有三个致命痛点：
1. **目标模糊，无从下手**：只有一个大概念（如“掌握 Rust 异步编程”、“备考微积分”），不知如何合理拆解阶段。
2. **AI 规划多为“空气计划”**：常规大模型直接生成的学习清单往往胡乱推荐已失效的 404 虚假链接，缺乏真实教程支撑。
3. **任务扎堆，认知过载**：多个学习目标同时进行时，任务在同一天爆发冲突，违背认知规律导致放弃。

**拾级（Gradus）** 采用「订单式」规划理念：你只需输入一个**模糊的目标或学习需求**，AI 引擎将自动完成 **意图解析 → 真实资源检索 → 布鲁姆认知阶梯拆解 → 可行性核查自愈 → 全局动态接续排期**，交付一组带工期、优先级、权威可信资源与甘特图的高质量可执行方案。

---

## 🚀 核心架构与技术亮点

```
 模糊学习目标 (Text / URL)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   拾级 AI 认知规划流水线                     │
├─────────────────────────────────────────────────────────────┤
│ 1. 意图解析 (Intent)      ➔ 领域、先验水平、工时估算、认知靶向    │
│ 2. 两阶段资源检索 (Search) ➔ AI 产出意图 + Tavily 检索权威真链接  │
│ 3. 认知阶梯计划 (Plan)    ➔ 基于 Bloom 分类法拆解 4~8 个子任务    │
│ 4. 可行性核查 (Validate)  ➔ 规则自检，异常自动触发修订自愈       │
│ 5. 全局排期引擎 (Schedule) ➔ 每日认知负荷槽位分配 + 间隔复习节点  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   交互式甘特图 & 任务仪表盘 (支持 MCP 供外部 Agent 同步)
```

### 1. 🧠 布鲁姆认知阶梯（Bloom's Taxonomy Staircase）
- **认知循序渐进**：子任务严格遵循认知进阶模型（**识记 → 理解 → 应用 → 分析 → 评价 → 创造**），杜绝“第一天就要求写复杂系统”的逆向规划。
- **深度工作时长预测**：为每个子阶段科学分配预估专注时长（Deep Work Hours）与推荐学习方法。

### 2. 🔍 两阶段真实资源检索（Anti-Hallucination Engine）
- **彻底杜绝 LLM 编造 404 假链接**：
  - **Stage 1（意图定义）**：LLM 仅产出标准化的搜索意图与筛选关键词，硬性约束禁止 LLM 直接生成 URL。
  - **Stage 2（实网检索）**：服务层调用 **Tavily Search API** 对白名单权威域名（官方文档、Bilibili 精品课、arXiv 论文、GitHub 高星仓库等）进行实网抓取。
  - **三维可信度校验**：异步对链接进行 HTTP 存活校验、域名权重评分与发布时效检测，直观展示可信度标识（Verified / Search Only）。

### 3. 📅 认知负荷与全局接续排期（Smart Cognitive Scheduler）
- **全局接续算法**：新任务根据历史未完成规划自动计算起跑日期，多任务之间智能衔接、杜绝堆叠。
- **每日槽位交错学习**：同主题每日容量上限控制，跨领域平滑穿插，保持每日认知负荷均衡。
- **艾宾浩斯间隔复习节点（Spaced Repetition）**：关键里程碑自动生成阶段复习触发点，实现知识闭环巩固。

### 4. 🔌 原生支持 MCP（Model Context Protocol）
- 提供标准 `/api/mcp` Streamable HTTP 端点，支持无状态认证。
- 可作为工具直接接入 **Cursor / Windsurf / Claude Desktop / OpenDevin** 等任意支持 MCP 的 AI Agent，让外部智能体直接理解你的学习计划并协同打卡。

### 5. 👥 免登录即用 + 注册无缝接管（Guest-First Auth）
- 访客进入首屏自动通过轻量 JWT Cookie 签发独立临时沙箱，无需注册即可秒级试用。
- 用户决定注册正式账号时，数据库在**单一事务**内原子化转移所有关联任务数据，平滑无感。

---

## 🛠️ 技术选型矩阵

| 分层 | 技术选型 | 说明 |
|---|---|---|
| **核心框架** | Next.js 16 (App Router) + React 19 | 强类型全栈架构，RSC 服务端首屏零闪烁 |
| **编程语言** | TypeScript 5.x | 全链路端到端类型安全 |
| **运行时** | Bun 1.3+ / Node.js 18+ | 高性能构建与依赖管理 |
| **样式与设计系统** | Tailwind CSS v4 + shadcn/ui + Lucide | 支持多套主题动态切换与深浅模式 |
| **动画引擎** | Motion (`motion/react`) | 丝滑的阶梯与甘特图交互过渡动效 |
| **数据库 & ORM** | PostgreSQL + Drizzle ORM | 强类型数据建模，Serverless 连接池优化 |
| **AI 客户端** | 自托管 `appAi`（OpenAI 兼容 / BYOK） | 零平台锁定，支持 DeepSeek、Moonshot、GPT-4o 等 |
| **资源检索引擎** | Tavily Search API + 自研抓取器 | 权威技术域名白名单过滤与实时可信度验证 |
| **开放协议** | `@modelcontextprotocol/sdk` (MCP) | 标准化 Agent 工具协议集成 |
| **定时任务** | Vercel Cron | 每日学习进度与复习节点自动推送 |

---

## ⚡ 快速开始

### 1. 环境准备
- [Bun](https://bun.sh/) 1.3+（强烈推荐）或 Node.js 18+
- [PostgreSQL](https://www.postgresql.org/) 数据库（可免费使用 [Neon](https://neon.tech/) 或 [Supabase](https://supabase.com/)）
- OpenAI 兼容的 LLM API 密钥（如 [DeepSeek](https://platform.deepseek.com/)、Moonshot、OpenAI、本地 Ollama/vLLM）
- *(可选)* [Tavily API Key](https://tavily.com/)（提供实时精准资源检索）

### 2. 克隆与安装

```bash
git clone https://github.com/melondy101/Gradus.git
cd Gradus
bun install
```

> 💡 *若在特定环境下安装 `sharp` 遇到问题，可使用命令：*
> `SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install`

### 3. 配置环境变量

复制配置文件模板：
```bash
cp .env.example .env
```

核心环境变量说明：

```ini
# ==========================================
# 必填项 (Core Required)
# ==========================================
# PostgreSQL 数据库连接串（Neon 建议使用 -pooler 后缀连接串）
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT 鉴权密钥（必须 ≥ 32 字符，使用 `openssl rand -hex 32` 生成）
AUTH_SECRET="your-super-secret-jwt-key-at-least-32-chars-long"

# AI 服务模式（BYOK: Bring Your Own Key）
EAZO_AI_PROVIDER_MODE="byok"
AI_PROVIDER_BASE_URL="https://api.deepseek.com/v1"
AI_PROVIDER_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
AI_PROVIDER_MODEL="deepseek-chat"

# ==========================================
# 可选项 (Optional Enhancements)
# ==========================================
# Tavily 实时资源搜索密钥（留空则降级为搜索引擎跳转模式）
TAVILY_API_KEY="tvly-xxxxxxxxxxxxxxxxxxxx"

# 站点标题与自定义描述
NEXT_PUBLIC_APP_TITLE="拾级 · Gradus"
NEXT_PUBLIC_APP_DESCRIPTION="AI 学习任务规划与排期系统"

# Vercel Cron 每日提醒鉴权密钥
CRON_SECRET="your-cron-secret-token"

# 邮箱验证码（QQ 邮箱 SMTP，推荐国内使用）
QQ_EMAIL_USER="your-qq-number@qq.com"
QQ_EMAIL_PASS="your-16-char-smtp-auth-code" # QQ邮箱网页端-设置-账户-开启POP3/SMTP生成的16位授权码
# 可选通用配置：
# SMTP_HOST="smtp.qq.com" # 默认 smtp.qq.com，也支持 163 等
# SMTP_PORT=465           # 默认 465 (SSL)
# EMAIL_FROM="拾级 Gradus"  # 发件人显示名称
```

### 4. 初始化数据库与启动

```bash
# 推送数据表 Schema 到数据库
bun run db:push

# 启动本地开发服务
bun dev
```

浏览器访问 `http://localhost:3000` 即可开始使用！🎉

---

## 💻 常用开发指令

```bash
bun dev               # 启动热重载开发服务器
bun run build         # 构建生产环境包
bun start             # 运行生产构建产物
bun run lint          # 运行 ESLint 静态代码检查
bun run db:generate   # 根据 Schema 生成 Drizzle SQL 迁移文件
bun run db:migrate    # 执行待处理的数据库迁移
bun run db:push       # 将 TypeScript Schema 直接同步至数据库
bun run db:studio     # 启动可视化 Drizzle Studio 数据库管理界面

# 设计保真闸门（对着 output/拾级Gradus-设计预览.html 量浏览器 computed 值，非肉眼比对）
bun run audit:tokens  # 设计稿 :root 21 条令牌 vs 实现同名属性
bun run audit:design  # 4 路由 × 桌面/移动 × 四视图：溢出 / WCAG 对比度 / 字体 / 落地页结构
bun run audit:parity  # 设计稿元素与实现元素逐件对表
bun run audit:modals  # 10 组需交互才出现的浮层（需 dev server 起着）
```

---

## 📡 API 与 MCP 接口速览

### 核心 REST API

| 方法 | 端点 | 说明 | 鉴权要求 |
|---|---|---|---|
| `POST` | `/api/auth/register` | 用户注册（支持临时账号数据原子合并） | 公开（限流） |
| `POST` | `/api/auth/login` | 用户登录 | 公开（限流） |
| `POST` | `/api/tasks` | 创建新的学习大任务 | 自动 Session |
| `GET` | `/api/tasks` | 获取当前用户的任务列表与完成度 | 自动 Session |
| `POST` | `/api/tasks/:id/analyze` | 触发 5 阶段 AI 规划流水线 | 自动 Session |
| `PATCH` | `/api/tasks/:id/subtasks/:sid` | 切换指定子任务的完成打卡状态 | 自动 Session |
| `GET` | `/api/user/stats` | 获取用户专注时长、打卡连击与认知分布统计 | 自动 Session |

### MCP 协议集成

任何支持 Model Context Protocol 的客户端均可直接对接拾级服务：

```json
{
  "mcpServers": {
    "gradus-tasks": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Cookie": "__Host-session=YOUR_JWT_TOKEN"
      }
    }
  }
}
```

---

## 🗺️ 演进路线（Roadmap）

- [x] 完整的 5 阶段 AI 任务规划与自愈修复流水线
- [x] 基于 Bloom 认知分类学的任务阶梯排序
- [x] Tavily 两阶段防编造真实资源检索与可信度评级
- [x] 全局认知负荷排期与动态甘特图
- [x] 访客即时体验与注册事务级合并
- [x] 原生 MCP (Model Context Protocol) 接口
- [x] 暗色模式深度适配与多套主题切换
- [ ] 导出到系统日历（iCal / Google Calendar / 飞书日历）
- [ ] 基于艾宾浩斯复习曲线的主动桌面通知与微信机器人推送
- [ ] 社区精选优质学习规划模板一键复用（Plan Hub）

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！
1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交变更：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议开源。
