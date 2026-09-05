# 拾级（Gradus）· 产品需求文档（PRD）

> 原名 AutoTask，2026-08-09 起品牌名改为「拾级」。线上地址、App ID 等平台标识保持不变。

**版本：** v1.0.0
**日期：** 2026-08-05
**App ID：** `ir03ZvSfyvtHG2OH`
**线上地址：** https://talk-task.vercel.app/
**沙盒预览：** https://3000-ilwcstwrli10suhr88349.e2b.app
**代码仓库路径：** `/home/user/autotask`

---

## 一、项目定位

### 1.1 产品愿景

拾级是一款面向**自主学习者**的 AI 驱动任务规划与排期系统。用户只需输入一个模糊的学习目标（如"学 Python"、"备考高考数学"），AI 会自动完成：

- 解析学习意图，生成正式任务名称
- 搜索并推荐真实学习资源（课程、文章、博主、搜索词）
- 拆解为 4~8 个可执行子任务，附带工期与优先级
- 自动审核计划可执行性，不通过则迭代优化
- 智能排期：新任务接续已有任务末尾，避免日期堆叠

### 1.2 产品类型

**订单式学习任务管理工具** —— 每个"大任务"类比一张"工单"，交由 AI 自动拆解和排期，用户只需执行和打卡。

### 1.3 区别于普通待办工具

| 普通待办 | 拾级 |
|---|---|
| 用户手动创建每一条任务 | 用户只输入目标，AI 自动拆解 |
| 无排期依据 | 基于四象限 + GTD + 认知负荷的智能排期 |
| 无学习资源 | 每个子任务绑定推荐资源（链接/搜索词/博主/课程） |
| 任务彼此独立 | 多任务全局接续排期，不重叠不堆积 |
| 完成即遗忘 | 完成后庆祝弹窗 + Memory 记录，可跨会话回溯 |

---

## 二、目标用户

### 2.1 主要人群

| 人群 | 特征 | 核心痛点 |
|---|---|---|
| **自主学习者** | 有学习意愿，但不知道如何系统规划 | 不知从哪开始，易半途而废 |
| **斜杠青年 / 副业人群** | 利用碎片时间学习多个领域 | 任务太多，不知道先做哪个 |
| **考证 / 升学备考群体** | 有明确考试目标，需要系统复习计划 | 计划制定耗时，执行率低 |
| **职场进修人群** | 在职学习新技能 | 时间有限，需要高密度但不过载的计划 |

### 2.2 次要人群

- 好奇心驱动的探索者（对某话题有小兴趣，想快速了解）
- 老师 / 教练（为学生批量制定学习路径参考）

### 2.3 用户心理模型

用户的核心需求不是"管理任务"，而是 **"告诉我要学什么、怎么学、从哪里学"**。拾级的价值在于**消除决策摩擦**，让用户专注于执行本身。

---

## 三、核心功能与操作清单

### 3.1 主界面：双列仪表板

```
┌──────────────────────────────┬────────────────────────────┐
│  左侧：子任务列表（时间视图）   │  右侧：AI 分析面板           │
│  ─────────────────────────── │  ─────────────────────────  │
│  筛选栏：今天/明天/7天/全部    │  多任务标签页                │
│                              │  Pipeline 4段进度            │
│  每行：子任务标题              │  子任务列表 + 资源卡片        │
│       所属大任务               │  调整意见输入框               │
│       日期区间                 │  重新生成 / 移除              │
│       属性标签                 │                             │
│       ✓完成  ×删除            │                             │
└──────────────────────────────┴────────────────────────────┘
```

### 3.2 功能详细说明

#### 3.2.1 新建任务
1. 点击右上角「+ 新建任务」（未登录则先触发 SDK 登录流）—— *（已替换为自托管 JWT cookie；详见 §5.2）*
2. 弹出 `NewTaskInput` 对话框，填写目标描述
3. 按 Enter 或点击「开始分析 →」
4. 弹窗立即关闭；右侧面板新增一个标签页，AI 分析实时开始

#### 3.2.2 AI 4段分析 Pipeline（`POST /api/tasks/:id/analyze`，缓冲 JSON）

| 阶段 | 标识 | 描述 | AI 输出字段 |
|---|---|---|---|
| 🧠 意图分析 | `intent` | 解析目标，提取结构化信息 | task_name, topic_category, urgency, importance, search_keywords, subject_domain |
| 🔍 资源搜索 | `search` | 推荐 4-8 个真实资源 | resources[]: type/title/url/searchQuery/author/platform |
| 📋 制定计划 | `plan` | 生成 4-8 个子任务，循序渐进 | subtasks[]: title/description/duration_days/start_day/priority/resource_indices |
| ✅ 核查修订 | `validate` | 审核可执行性，不通过则触发修订 | pass, suggestions → 触发 revise 循环 |

**核查通过标准（5条）：**
1. 每个子任务有明确行动
2. 难度循序渐进，不跳跃
3. 至少一个子任务引用具体资源
4. 工期估算合理
5. 整体在 30 天内可完成

#### 3.2.3 全局智能排期（`src/lib/scheduler.ts`）
- 新任务 `startDate` = 当前所有未完成任务最末结束日 + 1 天
- 无已有任务时从今天开始
- 子任务实际日期 = `startDate + startDay`（链式偏移，移动大任务只需改锚点）
- 四象限优先级排序：`finalScore = urgency × importance + delayBonus`
- 递延惩罚：每超期 7 天 +10 分，提升被拖延任务的排期优先级
- 同主题当天上限：`MAX_SUBTASKS_PER_TOPIC_PER_DAY = 2`

#### 3.2.4 子任务属性标签（左侧列表）
每行显示彩色属性标签：
- 🏷️ **主题**（蓝）：如「编程」「数学」「语言」
- ⚡ **紧急度**（红→绿渐变，1-5级）：极紧急 / 较紧急 / 一般 / 较宽松 / 不紧急
- ★ **重要度**（紫，1-5级）：极重要 / 较重要 / 一般 / 较次要 / 参考
- 🔑 **关键词**（橙，最多显示2个）

#### 3.2.5 子任务详情弹窗（单击行触发）
`SubtaskDetailModal` 展示：
- 所属大任务名称（含状态色点）
- 子任务标题（完成态删除线）
- 属性条：主题 / 紧急度 / 重要度 / 关键词 / 工期天数 / 日期区间 / 完成状态
- 详细描述（AI 生成，具体说明做什么、怎么做）
- 推荐资源列表（可点击跳转链接或 Google 搜索）
- 操作：「✓ 标记已完成」 / 「↩ 取消完成」 / 「大任务 →」

#### 3.2.6 调整意见 & 重新生成
1. 在右侧面板任务完成后，输入调整意见（如"难度太高"）
2. 点击「↺ 重新生成」
3. 原始 rawInput 不变，调整意见透传至所有 AI 阶段，重新走完整 Pipeline

#### 3.2.7 跨任务跳转（右侧→左侧高亮定位）
右侧面板点击子任务标题：
1. 计算子任务所在日期，自动选择最窄 timeFilter（today/tomorrow/week）
2. 切换左侧筛选条
3. 高亮目标行：橙色左边框 + `#FFF9E6` 背景，**3 秒后自动消失**

#### 3.2.8 全部完成庆祝弹窗（`CongratulationsModal`）
某大任务下**所有子任务全部勾选完成**时自动弹出：
- 🎉 大标题 + 任务名
- 恭喜卡片：列出所有已完成子任务（含说明 + 工期）
- 主题标签
- 操作：「📖 进一步学习」→ 聚焦右侧面板该任务；「关闭」

#### 3.2.9 历史任务持久化
登录后调用 `GET /api/tasks?withSubtasks=1`，将 DB 中所有含子任务的历史任务加载到右侧面板（去重合并），刷新后不丢失。

#### 3.2.10 多任务标签页
右侧面板支持多任务并存：
- 超过 1 个任务时显示顶部横向标签栏
- 分析中的标签闪烁 `●` 动效
- 每个标签页独立保存 phase 状态、子任务列表、资源

#### 3.2.11 删除任务
点击右侧「移除」按钮或左侧 × 按钮：
- `DELETE /api/tasks/:id` 级联删除大任务及所有子任务
- 右侧面板移除对应标签页
- 左侧列表同步过滤

#### 3.2.12 每日推送通知（Cron）
Vercel Cron 每日调用 `GET /api/notifications/cron/daily-digest`：
- 有进行中任务：推送"你有 N 个进行中任务"
- 无任务：鼓励新建目标
- 通过 `CRON_SECRET` Bearer Token 鉴权

#### 3.2.13 MCP 接口（AI Agent 调用）
`/api/mcp` 暴露标准 MCP Streamable HTTP 协议：
- 任何 AI Agent（如 Claude Desktop）可通过 MCP 工具直接 CRUD 用户的任务数据
- 无状态模式，每次请求独立（serverless 友好）
- 同样通过 `requireAuth` 鉴权，严格用户隔离

#### 3.2.14 甘特图时间线（`GanttChart`）
`/task/:id` 详情页展示可折叠甘特图：
- 每个子任务渲染一条比例条（`startDay / totalDays`）
- 进入动画：`ganttGrow` keyframe，0.12s 逐条延迟
- 可选 `collapsible` 模式，用 `<details>` 折叠

---

## 四、业务流程

### 4.1 主流程：新建任务到执行完成

```
用户输入目标（如"学 Python"）
       │
       ▼
POST /api/tasks  →  DB: INSERT tasks (status="active", totalDays=0)
       │
       ▼  弹窗关闭，右侧面板新增标签页
       ▼
POST /api/tasks/:id/analyze  →  SSE 流开始
       │
   ┌───┴──────────────────────────────────────────┐
   │  AI 调用 #1 · 意图分析                        │
   │    输入：rawGoal [+ adjustment]               │
   │    输出：task_name / topic / urgency /        │
   │           importance / keywords / domain     │
   │  → SSE: phase=intent, intent_done            │
   │                                              │
   │  AI 调用 #2 · 资源搜索                        │
   │    输入：goal + domain + keywords            │
   │    输出：resources[] (4-8 items)             │
   │  → SSE: phase=search, search_done            │
   │                                              │
   │  AI 调用 #3 · 计划生成                        │
   │    输入：goal + task_name + resources        │
   │    输出：subtasks[] (4-8 items)              │
   │  → SSE: phase=plan                           │
   │                                              │
   │  AI 调用 #4 · 核查                            │
   │    pass=false → AI 调用 #5 修订              │
   │  → SSE: phase=validate [→ revise]            │
   └──────────────────────────────────────────────┘
       │
       ▼
全局排期计算（scheduler.ts）
  - 查询用户所有未完成任务的最末结束日
  - newStartDate = latestEnd + 1（若小于今天则取今天）
       │
       ▼
DB 写入
  - UPDATE tasks: title=AI名 / rawInput / startDate / totalDays / status="done"
  - INSERT subtasks × N (含 topic/urgency/importance/keywords/resources JSON)
       │
       ▼
SSE 推送 "result" 事件 → 前端 getTask() 加载完整数据
左侧列表刷新（GET /api/subtasks）
       │
       ▼
用户在左侧按时间筛选查看子任务
点击行 → SubtaskDetailModal → 查看资源 → 标记完成
       │
       ▼
最后一个子任务完成 → updateTaskStatus("done") → CongratulationsModal
```

### 4.2 重新生成流程

```
用户输入调整意见 → 点击「↺ 重新生成」
       │
       ▼
regenAnalysis(taskId, adjustment)
  - 中止当前分析请求（AbortController.abort()）
  - 重置 entry.stream → INIT_STREAM
  - 重置 entry.task → null
       │
       ▼
POST /api/tasks/:id/analyze { adjustment }
  - rawInput 保持不变（task.rawInput || task.title）
  - 4 段 Pipeline 重新执行
  - 旧子任务被新 createSubtasks() 覆盖
```

### 4.3 Task 状态机

```
Task.status:
  "active"  ──[AI分析完成写入]──▶  "done"
  "done"    ──[用户取消某子任务完成]──▶  "active"   （通过前端判断，非DB自动）

Subtask.completed:
  false  ──[用户勾选]──▶  true
  true   ──[用户取消]──▶  false
```

### 4.4 认证流程（*已替换为自托管 JWT cookie 模型*）

自托管版不再使用 `@eazo/sdk` 的登录 UI / Bridge handshake。当前流程：

```
Web 浏览器（首次访问，无 cookie）：
  任意 /api/* 请求 → middleware 拦截 → createTempAccount() → 签 JWT
  → Set-Cookie __Host-session → 后续请求均带临时账号

Web 浏览器（注册）：
  /api/auth/register (限流) → 写 users 行 + bcrypt hash
  → 若是临时 cookie：同事务 UPDATE tasks user_id → 签新 JWT
  → Set-Cookie __Host-session → 徽章变真名

Web 浏览器（登录）：
  /api/auth/login (限流) → 按 emailLower 查 users → bcrypt verify
  → 签 JWT → Set-Cookie __Host-session

登出：
  /api/auth/logout → Set-Cookie Max-Age=0 → middleware 下一次兜底建新临时账号
```

RSC 根布局在 `getCurrentUser()` 阶段直接读 cookie 解出 user，首屏零闪烁。

---

---

## 五、系统架构

### 5.1 整体架构图

```
┌───────────────────────────────────────────────────────────┐
│                 Browser (any device)                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Next.js 16 App (Client Components, React 19)       │  │
│  │                                                     │  │
│  │  HomePage                                           │  │
│  │  ├── NewTaskInput        (目标输入弹窗)              │  │
│  │  ├── TimeFilterTabs      (今天/明天/7天/全部)        │  │
│  │  ├── SubtaskRow × N      (左侧列表行)               │  │
│  │  ├── SubtaskDetailModal  (单击详情弹窗)             │  │
│  │  ├── AuthModal           (登录/注册弹窗)            │  │
│  │  ├── UserBadge           (右上角临时/正式徽章)       │  │
│  │  ├── CongratulationsModal (全部完成庆祝)            │  │
│  │  └── RightPanel                                     │  │
│  │      ├── useAnalysisPanel() Hook (SSE状态机)      │  │
│  │      ├── PipelineSteps   (4段进度展示)              │  │
│  │      ├── EntryDetail × N (每任务详情+资源)          │  │
│  │      └── ResourceCard    (资源卡片，可点击跳转)      │  │
│  └──────────────────┬──────────────────────────────────┘  │
└─────────────────────┼─────────────────────────────────────┘
                       │ HTTP (Cookie: __Host-session)
┌─────────────────────┼─────────────────────────────────────┐
│  src/middleware.ts   — 兜底建临时账号 + 滑动续期           │
│  ┌──────────────────┴──────────────────────────────────┐  │
│  │  Next.js 16 API Routes (Node.js Server / Vercel)    │  │
│  │                                                      │  │
│  │  POST   /api/auth/register   公开(限流, 合并临时账号) │  │
│  │  POST   /api/auth/login      公开(限流)              │  │
│  │  POST   /api/auth/logout     清 cookie               │  │
│  │  GET    /api/auth/me         当前 user                │  │
│  │  POST   /api/tasks                  创建大任务        │  │
│  │  GET    /api/tasks                  列表 (含进度计数)  │  │
│  │  GET    /api/tasks?withSubtasks=1   列表+子任务(面板) │  │
│  │  GET    /api/tasks/:id              单任务+子任务      │  │
│  │  PATCH  /api/tasks/:id              更新 status       │  │
│  │  DELETE /api/tasks/:id              删除(级联)        │  │
│  │  POST   /api/tasks/:id/analyze ◄── 4段SSE Pipeline │  │
│  │  PATCH  /api/tasks/:id/subtasks/:sid 切换完成状态     │  │
│  │  GET    /api/subtasks               全量子任务JOIN    │  │
│  │  GET    /api/user/profile           当前 user          │  │
│  │  GET/POST/DELETE /api/mcp           MCP Streamable HTTP│  │
│  │  GET    /api/notifications/cron/daily-digest  Vercel Cron │
│  └──────────────────┬──────────────┬─────────────────────┘
└─────────────────────┼──────────────┼──────────────────────┘
                      │              │
            ┌─────────┘              └──────────────┐
            ▼                                        ▼
┌────────────────────────┐              ┌─────────────────────────┐
│   PostgreSQL           │              │   OpenAI-compatible AI  │
│   (Neon / external)    │              │   (DeepSeek / OpenAI /  │
│                        │              │    Moonshot / 自建 vLLM) │
│   Tables:              │              │                         │
│   ├── users            │              │   AI_PROVIDER_BASE_URL  │
│   │     + passwordHash │              │   AI_PROVIDER_API_KEY   │
│   │     + emailLower   │              │   AI_PROVIDER_MODEL     │
│   ├── tasks            │              │   最多 5 × chat() / 请求 │
│   ├── subtasks         │              │                         │
│   └── auth_attempts    │              │  (Tavily 资源检索可选)  │
└────────────────────────┘              └─────────────────────────┘
```
### 5.2 前端目录结构

```
src/
├── app/
│   ├── layout.tsx                    根布局：EazoProvider + I18nProvider + Toaster
│   ├── page.tsx                      薄路由入口 → <HomePage />
│   ├── task/[id]/page.tsx            任务详情页 → <TaskDetailPage />
│   ├── history/page.tsx              历史任务页
│   └── api/                          ← 见第六章 API 层
│
├── components/
│   ├── home/
│   │   ├── home-page.tsx             主仪表板（全局状态枢纽）
│   │   ├── new-task-input.tsx        目标输入弹窗
│   │   ├── subtask-row.tsx           左侧子任务行 + 属性标签
│   │   ├── subtask-detail-modal.tsx  子任务详情弹窗
│   │   ├── congrats-modal.tsx        全部完成庆祝弹窗
│   │   ├── right-panel.tsx           右侧AI面板 + useAnalysisPanel Hook
│   │   └── index.tsx                 导出
│   ├── task/
│   │   ├── gantt-chart.tsx           甘特图组件
│   │   └── task-detail-page-v2.tsx   任务详情页（完整子任务列表 + 甘特图）
│   ├── history/
│   │   └── history-page.tsx          历史任务列表
│   ├── user-profile/
│   │   ├── user-badge.tsx            用户头像 + 登录按钮
│   │   └── user-sync-effect.tsx      Mobile 登录后 DB upsert 触发器
│   └── i18n/
│       ├── i18n-provider.tsx         i18next 初始化
│       ├── language-switcher.tsx     语言切换参考实现
│       └── locale-sync-effect.tsx    locale 持久化同步
│
└── lib/
    ├── api/
    │   ├── request.ts                fetch 封装（注入 locale header；session 由浏览器自动附带 cookie）
    │   ├── tasks.ts                  任务相关客户端 API 函数（全类型化）
    │   └── app-ai-request.ts         App AI 402 错误处理
    ├── auth/
    │   └── index.ts                  re-export requireAuth from @eazo/sdk/server
    ├── db/
    │   ├── schema/
    │   │   ├── tasks.ts              Drizzle 表定义（tasks + subtasks）
    │   │   └── users.ts              Drizzle 用户表
    │   ├── queries/
    │   │   ├── tasks.ts              任务 CRUD + JOIN 查询
    │   │   └── users.ts              upsertUser
    │   ├── client.ts                 postgres.js + Drizzle 实例
    │   └── migrate.ts                迁移执行脚本
    ├── mcp/
    │   └── server.ts                 MCP Server 工具定义
    ├── eazo-ai-billing.ts            appAi 客户端（Creator Proxy 模式）
    └── scheduler.ts                  全局排期算法
```

### 5.3 关键数据流

```
登录 / 刷新页面
  → useEffect: user 变化
  → GET /api/subtasks            → setSubtaskRows（左侧列表）
  → GET /api/tasks?withSubtasks=1 → hydrateFromDB（右侧面板历史恢复）

新建任务
  → POST /api/tasks              → createTask()
  → setEntries([新Entry, ...])   → 右侧面板新标签页
  → POST /api/tasks/:id/analyze  → SSE 流
      每个 SSE event → patchStream() / setEntries()
      "result" event → getTask() → entry.task 更新
  → entries.phase 变 "done"     → loadSubtasks()（左侧刷新）

子任务勾选
  → handleToggleSubtask()
  → setSubtaskRows (乐观更新)    → 左侧立即响应
  → setDetailSubtask (同步弹窗)
  → PATCH /api/tasks/:id/subtasks/:sid
  → 检测全部完成 → updateTaskStatusApi("done") + setCongrats()
```

---

## 六、API 设计

### 6.1 API 全览

| 方法 | 路径 | 描述 | 认证 | 文件 |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | 注册（限流 + 合并临时账号） | 公开 | `api/auth/register/route.ts` |
| `POST` | `/api/auth/login` | 登录（限流） | 公开 | `api/auth/login/route.ts` |
| `POST` | `/api/auth/logout` | 清 cookie | 已登录 | `api/auth/logout/route.ts` |
| `GET`  | `/api/auth/me` | 当前用户 | 已登录 | `api/auth/me/route.ts` |
| `POST` | `/api/tasks` | 创建大任务 | 已登录 | `api/tasks/route.ts` |
| `GET` | `/api/tasks` | 任务列表（含进度计数） | ✅ | 同上 |
| `GET` | `/api/tasks?withSubtasks=1` | 任务列表+子任务（面板水化） | ✅ | 同上 |
| `GET` | `/api/tasks/:id` | 单任务+子任务 | ✅ | `api/tasks/[id]/route.ts` |
| `PATCH` | `/api/tasks/:id` | 更新 status | ✅ | 同上 |
| `DELETE` | `/api/tasks/:id` | 删除任务（级联子任务） | ✅ | 同上 |
| `POST` | `/api/tasks/:id/analyze` | 4段AI Pipeline（缓冲 JSON） | ✅ | `api/tasks/[id]/analyze/route.ts` |
| `PATCH` | `/api/tasks/:id/subtasks/:sid` | 切换子任务完成状态 | ✅ | `api/tasks/[id]/subtasks/[subtaskId]/route.ts` |
| `GET` | `/api/subtasks` | 全量子任务+大任务JOIN | ✅ | `api/subtasks/route.ts` |
| `GET` | `/api/user/profile` | 获取/创建用户 | ✅ | `api/user/profile/route.ts` |
| `GET/POST/DELETE` | `/api/mcp` | MCP Streamable HTTP | ✅ | `api/mcp/route.ts` |
| `GET` | `/api/notifications/cron/daily-digest` | 每日推送（Cron） | Bearer | `api/notifications/cron/daily-digest/route.ts` |
| `GET` | `/api/notifications/test` | 测试推送 | ✅ | `api/notifications/test/route.ts` |

### 6.2 关键接口详解

#### `POST /api/tasks`
```
请求体: { "title": "学 Python" }
响应 201: Task { id, userId, title, rawInput, startDate, status, totalDays, createdAt, updatedAt }
```

#### `GET /api/tasks`
```
无参数: TaskWithProgress[] （含 subtaskCount / completedCount）
?withSubtasks=1: TaskWithSubtasksFull[] （含 subtasks: Subtask[]）
```

#### `POST /api/tasks/:id/analyze` — 缓冲 JSON 响应

```
Content-Type: text/event-stream

{"phase":"intent","label":"// 阶段 1/4 · 解析学习意图…"}
{"delta":"{"}
...（流式 token）
{"intent_done":{"taskName":"Python基础入门","domain":"Python编程","topicCategory":"编程"}}

{"phase":"search","label":"// 阶段 2/4 · 搜索学习资源…"}
{"delta":"..."}
{"search_done":{"resourceCount":6}}

{"phase":"plan","label":"// 阶段 3/4 · 制定学习计划…"}
data: {"event":"delta","data":{"stage":"plan","content":"..."}}

{"phase":"validate","label":"// 阶段 4/4 · 核查计划可执行性…"}
# 若 pass=false:
{"phase":"revise","label":"// 核查未通过，优化计划…"}

{"phase":"saving","label":"// 写入数据库 · 全局排期计算…"}
{"phase":"done","label":"// 全部完成 ✓"}
{"result":{
  "subtasks": [...],
  "totalDays": 14,
  "taskName": "Python基础入门",
  "rawInput": "学 Python",
  "startDate": "2026-08-10T00:00:00.000Z",
  "topicCategory": "编程"
}}
# 出错时:
{"error":{"message":"AI 分析失败: ..."}}
```

#### `GET /api/subtasks` 响应结构（`SubtaskWithTask[]`）
```typescript
{
  // 子任务字段
  id: string
  taskId: string
  title: string
  description: string | null
  durationDays: number          // 预计工期（天）
  startDay: number              // 相对大任务 startDate 的偏移天数
  completed: boolean
  sortOrder: number             // 优先级排序
  resources: string | null      // JSON: Resource[]
  topic: string | null          // 主题类别
  urgency: number | null        // 1-5
  importance: number | null     // 1-5
  keywords: string | null       // JSON: string[]
  createdAt: Date
  // 大任务字段（JOIN）
  taskTitle: string
  taskRawInput: string | null
  taskStartDate: string | null  // ISO 字符串
  taskStatus: string
  taskCreatedAt: string
}
```

### 6.3 认证机制（*已替换为自托管 JWT cookie*）

```typescript
// 服务端：所有受保护路由第一行（middleware 已自动建临时账号）
const auth = await requireAuth(request);
if (!auth.ok) return auth.response; // 401 Unauthorized
const userId = auth.user.id; // string，来自 JWT (jose) → users.id 查库

// 客户端：request() 自动注入 locale header；session 由浏览器 cookie 自动携带
import { request } from "@/lib/api/request";
const res = await request("/api/tasks");
// → 自动添加 "x-app-locale": getResolvedLocale()
// → 自动处理 402 app_ai_unavailable → Sonner toast
// （不再注入 x-eazo-session —— cookie 由浏览器自动附带）
```

### 6.4 MCP 工具（`/api/mcp`）

基于 `@modelcontextprotocol/sdk` Web Standard Streamable HTTP Transport，无状态（每请求独立）。AI Agent 可调用的工具由 `src/lib/mcp/server.ts` 定义，包含任务的 CRUD 操作，严格按 userId 隔离。

---

## 七、数据库设计

### 7.1 Schema 概览（Drizzle ORM，PostgreSQL）

#### `users` 表
```sql
CREATE TABLE users (
  id          VARCHAR(128) PRIMARY KEY,   -- Eazo 平台 userId
  email       TEXT,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `tasks` 表
```sql
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,         -- AI 生成的正式任务名称
  raw_input   TEXT,                  -- 用户原始输入（永不覆盖）
  start_date  TIMESTAMPTZ,           -- 排期锚点（AI分析后计算写入）
  status      TEXT NOT NULL DEFAULT 'active',  -- active | done
  total_days  INTEGER NOT NULL DEFAULT 0,       -- max(startDay+durationDays)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX tasks_user_id_idx   ON tasks(user_id);
CREATE INDEX tasks_created_at_idx ON tasks(created_at);
```

#### `subtasks` 表
```sql
CREATE TABLE subtasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  duration_days INTEGER NOT NULL DEFAULT 1,   -- 预计工期（天）
  start_day     INTEGER NOT NULL DEFAULT 0,   -- 相对 start_date 偏移天数
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,   -- AI priority 字段排序后的位置
  -- 以下 5 列通过在线 ALTER TABLE 追加（非迁移文件）
  resources     TEXT,    -- JSON: Array<{type,title,url?,searchQuery?,author?,platform?}>
  topic         TEXT,    -- 主题类别，如：编程/数学/语言
  urgency       INTEGER, -- 1-5 紧急度（来自意图分析阶段）
  importance    INTEGER, -- 1-5 重要度（来自意图分析阶段）
  keywords      TEXT,    -- JSON: string[]（来自意图分析阶段）
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX subtasks_task_id_idx ON subtasks(task_id);
```

### 7.2 关键设计决策

| 设计 | 原因 |
|---|---|
| `raw_input` 与 `title` 分离 | 保留用户原始意图；AI 重新生成时不丢失上下文 |
| `start_day`（相对偏移）而非 `start_date`（绝对日期） | 移动大任务排期只需改 `tasks.start_date`，子任务无需逐条 UPDATE |
| `resources` / `keywords` 存 JSON TEXT | 资源结构灵活（4种类型），避免过度范式化 |
| `CASCADE DELETE` | 删大任务自动清理全部子任务，无孤儿数据 |
| `sortOrder` 字段 | AI 按 `priority` 字段排序后写入 `sort_order`，前端按此字段排列 |

### 7.3 常用查询

```typescript
// 左侧列表：全量子任务 + 大任务 JOIN
getSubtasksWithTaskByUser(userId)
// → SELECT subtasks.*, tasks.title, tasks.raw_input, tasks.start_date, tasks.status
//   FROM subtasks INNER JOIN tasks ON subtasks.task_id = tasks.id
//   WHERE tasks.user_id = $1
//   ORDER BY tasks.created_at DESC, subtasks.sort_order

// 右侧面板水化：一次查询所有任务+子任务
getTasksWithSubtasksByUser(userId)
// → SELECT tasks WHERE user_id = $1
//   + SELECT subtasks WHERE task_id IN (...)
//   → 内存分组 Map<taskId, Subtask[]>

// 全局排期：只取排期摘要
getScheduledTasksByUser(userId)
// → SELECT id, start_date, total_days, created_at, status FROM tasks WHERE user_id = $1

// 大任务进度计数
getTasksByUser(userId)
// → SELECT tasks.*, COUNT(subtasks.id), COUNT(subtasks.id) FILTER (WHERE completed=true)
//   FROM tasks LEFT JOIN subtasks GROUP BY tasks.id
```

---

## 八、AI Pipeline 详细设计

### 8.1 Prompt 工程（`src/app/api/tasks/[id]/analyze/route.ts`）

| Prompt 常量 | 输入变量 | 核心输出 |
|---|---|---|
| `INTENT_PROMPT` | `rawGoal [+ adjustment]` | task_name / topic_category / urgency / importance / search_keywords / subject_domain |
| `RESOURCE_PROMPT` | `{GOAL}` `{DOMAIN}` `{KEYWORDS}` | resources[]: 4-8 条，含 link/search/person/course 4 种类型 |
| `PLAN_PROMPT` | `{GOAL}` `{TASK_NAME}` `{DOMAIN}` `{RESOURCES}` `{ADJUSTMENT}` | subtasks[]: 4-8 条，含 resource_indices 交叉引用 |
| `VALIDATE_PROMPT` | `{GOAL}` `{PLAN}` (前5条) | pass(bool) / issues[] / suggestions |

**Prompt 设计原则：**
- 所有 Prompt 要求 AI 输出**裸 JSON**（`不要加 markdown`），用 `parseJson()` 提取 `{...}` 段落
- RESOURCE_PROMPT 明确区分"有链接给链接，不确定用 searchQuery，不编造 URL"
- PLAN_PROMPT 要求 `resource_indices` 指向 resources 数组，确保资源与子任务绑定
- VALIDATE_PROMPT 设 5 条硬标准，`pass=false` 则触发第 5 次 AI 调用修订

### 8.2 全局排期算法（`src/lib/scheduler.ts`）

```typescript
// 核心：接续排期（computeNewTaskStartDate）
function computeNewTaskStartDate(existingTasks, today) {
  let latestEnd = today;
  for (const t of existingTasks) {
    const end = addDays(t.startDate, t.totalDays);
    if (end > latestEnd) latestEnd = end;
  }
  const next = addDays(latestEnd, 1);
  return next < today ? today : next;
}

// 优先级排序（rankTasksByPriority）
// finalScore = urgency × importance + delayBonus
// delayBonus = Math.floor(daysOverdue / 7) * 10   // 每超期7天 +10分
// 分越高越优先，降序排列

// 同主题限流（checkTopicConflict）
// MAX_SUBTASKS_PER_TOPIC_PER_DAY = 2
// dailyTopicMap: Map<dateStr, Map<topicCategory, count>>
```

### 8.3 分析进度展示（`right-panel.tsx: useAnalysisPanel`）

```typescript
// SSE 解析循环
let buf = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const lines = buf.split("\n");
  buf = lines.pop() ?? "";        // 保留不完整行
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const msg = JSON.parse(line.slice(6));
    // 处理 phase / delta / intent_done / result / error 事件
  }
}
```

**状态机转换：**
```
phase: idle → intent → search → plan → validate [→ revise] → saving → done
                                                                    ↘ error
```

### 8.4 子任务实际日期计算（`subtask-row.tsx`）

```typescript
// 实际日期 = 大任务锚点 + 相对偏移
function getSubtaskActualDates(row: SubtaskWithTask) {
  const base = new Date(row.taskStartDate);
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const start = addDays(baseDay, row.startDay);
  const end   = addDays(baseDay, row.startDay + row.durationDays - 1);
  return { start, end };
}

// 时间筛选
if (filter === "today")    return start <= today    && today    <= end;
if (filter === "tomorrow") return start <= tomorrow && tomorrow <= end;
if (filter === "week")     return start <= weekEnd  && end      >= today;
```

---

## 九、前端组件说明

### 9.1 `home-page.tsx` — 状态枢纽

**核心 state：**
```typescript
subtaskRows:       SubtaskWithTask[]     // 左侧列表数据
timeFilter:        TimeFilter             // 时间筛选（today/tomorrow/week/all）
detailSubtask:     SubtaskWithTask|null  // 详情弹窗目标
congrats:          CongratsData|null     // 庆祝弹窗数据
highlightedSubtaskId: string|null        // 高亮目标（3秒自动清除）
showInput:         boolean               // 新建任务弹窗
```

**跨组件通信方式（全通过 props 传递，无 Context/Zustand）：**
- `handleToggleSubtask` → SubtaskRow / SubtaskDetailModal / CongratulationsModal
- `handleJumpToSubtask` → RightPanel → EntryDetail（点击子任务跳转左侧）
- `handleDeleteTask` → SubtaskRow

**乐观更新模式（勾选子任务）：**
```
setSubtaskRows (即时响应) → PATCH /api/... (后台同步) → 检测全部完成 → setCongrats
```

### 9.2 `useAnalysisPanel` Hook（`right-panel.tsx`）

```typescript
interface AnalysisEntry {
  taskId:        string
  taskTitle:     string            // intent_done 后更新为 AI 名称
  rawInput:      string            // 永不覆盖的原始输入
  topicCategory: string | undefined
  stream:        StreamState       // 客户端本地分析状态
  task:          TaskWithSubtasks|null  // result 后加载
}

interface StreamState {
  phase:    Phase        // 当前阶段
  label:    string       // 阶段标签文字
  deltaLen: number       // 已收到 token 数（进度感）
  errorMsg: string       // 错误信息
}
```

**持久化 hydration（登录后恢复）：**
```typescript
hydrateFromDB(dbTasks) {
  const existingIds = new Set(prev.map(e => e.taskId));
  const newEntries = dbTasks
    .filter(t => !existingIds.has(t.id) && t.subtasks.length > 0)
    .map(t => ({ ...t, stream: { phase: "done" }, task: t }));
  return [...prev, ...newEntries];
}
```

### 9.3 `SubtaskRow` — 属性标签系统

```typescript
// 紧急度颜色映射（1=红, 5=绿）
const URGENCY_COLORS = ["", "#ef4444","#f97316","#eab308","#84cc16","#22c55e"];
const URGENCY_LABELS = ["", "极紧急","较紧急","一般","较宽松","不紧急"];
const IMPORTANCE_LABELS = ["","极重要","较重要","一般","较次要","参考"];

// 完成态样式
opacity: row.completed ? 0.65 : 1
textDecoration: row.completed ? "line-through" : "none"
background: row.completed ? "#FAFAF9" : ...

// 高亮态
background: isHighlighted ? "#FFF9E6" : ...
borderLeft: isHighlighted ? "3px solid #F59E0B" : ...
```

### 9.4 `GanttChart` — 时间线可视化

```typescript
// 条宽比例计算
leftPct  = (s.startDay   / totalDays) * 100
widthPct = (s.durationDays / totalDays) * 100  // 最小 4%

// 进入动画（逐条延迟）
animation: `ganttGrow 0.9s cubic-bezier(.2,.8,.2,1) ${i * 0.12}s both`
// ganttGrow: scaleX 0 → 1，transformOrigin: left
```

---

## 十、设计系统

### 10.1 颜色令牌

| 令牌名 | 色值 | 用途 |
|---|---|---|
| `T.bg` | `#F9F9F8` | 页面背景（暖近白） |
| `T.surface` | `#FFFFFF` | 卡片/面板/弹窗背景 |
| `T.soft` | `#F1F2EE` | 输入框/次要区域背景 |
| `T.line` | `#E7E7E2` | 分割线 / 边框 |
| `T.paper` | `#F4F1EA` | 特殊卡片背景（原始输入标签） |
| `T.ink` | `#111111` | 主文字 |
| `T.muted` | `#777B75` | 次要文字 / 占位符 / 标签 |
| `T.accent` | `#3B7AFF` | 主强调色（按钮/选中/主题标签） |
| `T.green` | `#2F5D50` | 完成状态 / 课程资源 |
| `T.orange` | `#E07B2A` | 搜索资源 / 关键词标签 |
| `T.purple` | `#7C4DFF` | 博主资源 / 重要度标签 |
| `T.error` | `#C0392B` | 错误状态 |
| 高亮黄 | `#FFF9E6` | 跳转高亮背景 |
| 高亮边框 | `#F59E0B` | 跳转高亮左边框 |

### 10.2 字体

```css
正文:   var(--font-geist), Geist, system-ui, sans-serif
等宽:   var(--font-geist-mono), monospace
        用于：日期区间 / token 计数 / 原始输入标签 / 错误信息
```

### 10.3 交互设计原则

| 原则 | 实现 |
|---|---|
| **弹窗优于跳转** | 子任务所有操作在当前页完成，减少上下文切换 |
| **实时反馈** | PipelineSteps + 本地 ticker，用户清楚 AI 在做什么 |
| **乐观更新** | 勾选子任务即时响应，后台异步同步 |
| **高亮即导航** | 右侧点击 → 左侧自动筛选并高亮，3秒后还原 |
| **完成即庆祝** | 恭喜弹窗提供正向反馈，增强学习动力 |
| **原始意图保留** | rawInput 永不被 AI 名称覆盖，重新生成时保持上下文 |

### 10.4 动效清单

| 动效 | 元素 | 实现 |
|---|---|---|
| 标签页分析指示 | `●` 闪烁点 | CSS `animation: blink 1s steps(2) infinite` |
| 流进度圆点 | BlinkDot | 同上 |
| 进度条 | 完成比例条 | `transition: width 0.5s` |
| 甘特图 | 每条柱子 | `ganttGrow keyframe + 0.12s 逐条延迟` |
| 行高亮 | SubtaskRow | `transition: background 0.2s, border-left 0.2s` |

---

## 十一、非功能性需求

| 类别 | 要求 |
|---|---|
| **安全** | 所有 API 通过 `requireAuth` 鉴权；资源按 `userId` 严格隔离；Cron 通过 `CRON_SECRET` 鉴权 |
| **AI 成本** | 自托管默认 `byok` 模式：直连你的 OpenAI 兼容服务商，费用按 API Key 者所选服务商计费 |
| **可用性** | 分析失败时展示重试按钮；`AbortController` 防止重复请求 |
| **移动端** | 使用 `100dvh` / `env(safe-area-inset-*)` 适配移动浏览器安全区域 |
| **国际化** | 基础架构支持 `en-US` / `zh-CN`；当前界面文案为中文硬编码（非 i18n key） |
| **数据持久化** | 每次登录自动从 DB 恢复历史任务到右侧面板 |

---

## 十二、环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串（自托管时自配） |
| `AUTH_SECRET` | ✅ | JWT (HS256) 签名密钥，**≥ 32 字符**；**惰性校验**——构建期不报错，仅运行时首次签发/校验 JWT 时强制，缺失则相关请求 503。`openssl rand -hex 32` 生成 |
| `EAZO_AI_PROVIDER_MODE` | ✅ | 自托管默认 `byok` |
| `AI_PROVIDER_BASE_URL` / `AI_PROVIDER_API_KEY` / `AI_PROVIDER_MODEL` | ✅ | byok 模式下必填 |
| `NEXT_PUBLIC_APP_TITLE` | ❌ | App 标题（默认 拾级） |
| `NEXT_PUBLIC_APP_DESCRIPTION` | ❌ | App 描述 |
| `CRON_SECRET` | ❌ | Vercel Cron 鉴权密钥（仅在 `vercel.json` 的 cron 配置启用时必填） |

---

## 附录：历史 SDK 模板文档（已过期）

> **警告**：本附录是从 Eazo SDK 模板复制过来的英文使用说明，不代表当前仓库。
> 当前项目已完全脱离 Eazo SDK （`@eazo/sdk` 以与 Eazo AI Gateway / Eazo Gum / Eazo Mobile WebView 都不再依赖），
> 现状参考 [AGENTS.md](../AGENTS.md) §1、6 、 §11，本附录仅作为历史考验保留。

---

# Agent Guide

This repository is a Bun-first, minimal Next.js starter for building apps that run on the Eazo platform — seamlessly in a browser and inside the Eazo Mobile WebView.

## 1. Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + local script runner)
- `@eazo/sdk` — capability-first SDK: `auth`, `device`, `ai`, `storage`, `memory`, `notifications`, React integration, server-side `requireAuth` + `notifications.publish`; bundles GenAuth login + ECC/AES session decryption internally; `ai` routes through AWS Bedrock via the Eazo AI gateway; `memory` records user actions as persistent, semantically searchable memory for AI context retrieval; `notifications` opts users into per-app system push and lets the server fan out notifications to subscribers
- shadcn/ui, lucide-react, framer-motion
- Drizzle ORM (PostgreSQL via `drizzle-orm` + `postgres.js`)
- `i18next` + `react-i18next` — optional bilingual UI stack (`en-US` / `zh-CN`, same as Eazo Creator frontend). The template ships `I18nProvider`, locale JSON, and a reference `LanguageSwitcher`. Use the full stack for non-English or explicitly multilingual apps; for English-only products, remove the switcher and hardcode English copy.

## 2. Use This Template

1. Copy this project to start a new app.
2. Rename the package in `package.json`.
3. Read the following files to understand how the template implements each platform capability before writing any product code:
   - **Auth** — `src/app/layout.tsx`, `src/lib/auth/index.ts`, `src/components/user-profile/user-badge.tsx`, `src/lib/api/request.ts`
   - **Database** — `src/lib/db/schema/`, `src/lib/db/queries/`, `src/lib/db/client.ts`
   - **Object Storage** — `src/app/api/todos/[id]/attachment/route.ts`
   - **AI** — `src/app/api/todos/analyze/route.ts`, `src/components/todo-list/ai-analysis-panel.tsx`
   - **Memory** — `src/components/todo-list/index.tsx` (fire-and-forget `memory.reportAction()` pattern after each mutation)
   - **Notifications** — `src/components/notifications/notifications-toggle.tsx`, `src/app/api/notifications/test/route.ts`, `src/app/api/notifications/cron/daily-digest/route.ts`, `vercel.json#crons`
4. Run `bun run cleanup:demo` before any feature development to remove all template demo artifacts.
5. The app title/description come from `NEXT_PUBLIC_APP_TITLE` / `NEXT_PUBLIC_APP_DESCRIPTION` in `.env` (stamped by the platform at scaffold time) and are consumed by `src/app/layout.tsx`. Do NOT hardcode the title in `layout.tsx`. To change the user-facing app name, update those `.env` values.
6. Replace the default content in `src/app/page.tsx`.
7. Add product-specific routes, components, and data logic from there.

## 3. Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun start
bun run cleanup:demo   # one-click remove demo artifacts and auto-fix stale todos exports in index files
```

If you are developing `@eazo/sdk` locally, build it first and sync into `node_modules`:

```bash
(cd ../eazo-sdk/sdk && npm install && npm run build)
bun run sdk:sync
```

### 3.1 Database (Drizzle)

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

## 4. Project Structure

```
src/
  app/
    api/
      user/profile/route.ts   — GET: returns the authenticated user; upserts user to DB (both Web and Mobile paths)
      todos/route.ts          — GET (list) + POST (create)
      todos/[id]/route.ts     — GET / PATCH / DELETE
      todos/analyze/route.ts  — POST: streams AI analysis of the user's todo list (SSE)
      mcp/route.ts            — GET / POST / DELETE: MCP Streamable HTTP server (exposes todo CRUD as MCP tools)
    layout.tsx                — root layout; mounts <EazoProvider> (SDK auto-renders login UI inside)
    page.tsx                  — demo page
  components/
    user-profile/
      user-badge.tsx          — reads user via useEazo(s => s.auth.user); Sign-in button calls auth.login()
      user-sync-effect.tsx    — fires GET /api/user/profile after Mobile bridge login to upsert the user to DB
    todo-list/                — Todo List demo
      ai-analysis-panel.tsx   — streams and renders the AI analysis response
    ui/                       — shadcn/ui primitives
  lib/
    api/
      request.ts              — fetch wrapper; injects x-eazo-session via auth.getSessionHeader()
      user-profile.ts         — fetchUserProfile() → GET /api/user/profile
      todos.ts                — getTodos / createTodo / updateTodo / deleteTodo
    auth/
      index.ts                — re-exports requireAuth from @eazo/sdk/server
    db/
      schema/                 — Drizzle table definitions (todos, users)
      queries/                — db client + CRUD helpers (todos, users)
      migrations/             — auto-generated SQL files (commit to git)
  utils/
    utils.ts                  — cn() Tailwind class helper
```

## 5. Capabilities

The platform exposes capabilities through `@eazo/sdk`. Most capabilities (`auth`, `device`) work the same in browsers and inside Eazo Mobile. The `ai` capability is **server-side only** — see its section for details.

### 5.1 React Provider

Mount `EazoProvider` once at the root layout. Also mount `UserSyncEffect` inside the provider — it upserts the authenticated user to the local DB after every login (Web and Mobile both converge through `GET /api/user/profile`).

### 5.2 `auth`（*已替换为自托管 JWT cookie 模型，原 SDK auth 流不再可用*）

拾级在自托管模式下使用 **JWT cookie** 鉴权（`jose` + HS256，密钥 `AUTH_SECRET`）。完整架构见 [AGENTS.md §11](../AGENTS.md)。

客户端兼容层（`useEazo(s => s.auth.user)` / `auth.login()` / `auth.logout()`）保持原有 API 形态，底层改为代理到 `/api/auth/login` / `/api/auth/logout` / `/api/auth/me`。

```ts
// 客户端
useEazo((s) => s.auth.user)        // → User（来自 RSC 注入的 <UserProvider>）
auth.login(mode?)                    // → 打开全局 <AuthModal>（mode: "login" | "register"）
auth.logout()                        // → POST /api/auth/logout + 清本地 user
auth.refresh()                       // → 重新拉 /api/auth/me，更新 store
```

Server-side guard：
```ts
import { requireAuth } from "@/lib/auth";
const r = await requireAuth(request);
if (!r.ok) return r.response;       // 401
// r.user: { id, email, name, avatarUrl, emailLower, passwordHash, ... }
```

**用户首次访问**无需登录：middleware（`src/middleware.ts`）兜底建临时账号，签 JWT，写 `__Host-session` cookie。**注册时**自动把临时账号下的任务转移到正式账号（同事务 `UPDATE tasks SET user_id = new` + `DELETE FROM users WHERE id = temp`）。**限流**：`/api/auth/register` 与 `/api/auth/login` 共享 60s / 5 次 / IP（`auth_attempts` 表）。

> 未做的事（v1 范围外）：邮箱验证、密码找回、JWT 撤销列表、Turnstile、第三方 OAuth、密码强度策略、双因素认证。详见 [AGENTS.md §15.1](../AGENTS.md)。

### 5.3 `device`

```ts
device.platform  // 'web' | 'mobile'
```

Safe-area: use `env(safe-area-inset-top/bottom)` and `100dvh`.

### 5.4 App AI — Server-side only

```ts
import { appAi } from "@/lib/eazo-ai-billing";

// Non-streaming
const result = await appAi.chat({
  model: process.env.EAZO_AI_MODEL_KEY || "deepseek.v3.1",
  messages: [{ role: "user", content: "Hello!" }],
});

// Streaming
const stream = await appAi.chat({ ..., stream: true });
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

**Hard rule: AI is server-side only. Never import `appAi` in client components.**

Pattern: `Client component → fetch → API route → appAi.chat()`

Default model: `deepseek.v3.1`. Supported models include deepseek, openai-oss, qwen, mistral, google, nvidia, minimax, moonshotai, zai, writer variants.

### 5.5 Memory

```ts
import { memory } from "@eazo/sdk";
memory.reportAction({
  content: 'User created task: "Learn Python"',
  event_type: "create",
}).catch(() => {});  // always fire-and-forget
```

### 5.6 Notifications

```ts
// Server-side publish
import { notifications } from "@eazo/sdk/server";
await notifications.publish({ title, body, data });

// Client-side subscription toggle (see notifications-toggle.tsx)
```

### 5.7 Object Storage

```ts
import { storage } from "@eazo/sdk";
const { uploadUrl, fileUrl } = await storage.getUploadUrl(filename, contentType);
await fetch(uploadUrl, { method: "PUT", body: file });
// fileUrl is permanent CDN URL
```

### 5.8 MCP Server

Expose app data as MCP tools via `/api/mcp` using `@modelcontextprotocol/sdk` Web Standard Streamable HTTP transport. Stateless mode for serverless compatibility.

## 6. Memory — User Memory Persistence

`memory.reportAction()` writes a user action to Gum memory service — persistent, semantically searchable. Client-side only, fire-and-forget, always `.catch(() => {})`.

## 7. Notifications

Server publishes via `notifications.publish()`. Client toggles subscription via `notifications.subscribe()/unsubscribe()`. Cron jobs (Vercel) trigger daily digests via `GET /api/notifications/cron/daily-digest` with Bearer auth.

## 8. Object Storage

Browser → presigned PUT → S3 → permanent CDN URL. Server gets presigned URL via `storage.getUploadUrl()`.

## 9. MCP Server

`src/lib/mcp/server.ts` defines tools. `/api/mcp/route.ts` handles GET/POST/DELETE. Stateless, per-user isolation enforced.

## 10. Eazo AI Billing

`src/lib/eazo-ai-billing.ts` wraps `appAi`. In `eazo` mode: routes through Creator proxy, charges creator credits. In `byok` mode: uses creator-provided API key.

## 11. i18n

Locales: `en-US`, `zh-CN`. Preference in `localStorage` key `eazo-app.locale.v1`. `request()` sends `x-app-locale`. Server: `getRequestLocale(request)`.

**Multilingual apps**: keep `I18nProvider`, `LocaleSyncEffect`, `t()` for all strings, both locale files, visible language control.

**English-only apps**: hardcode English, remove `LanguageSwitcher`, no locale files needed.

## 12. Code Standards

### 12.1 One Component Per File

**Strictly enforced.** Each file exports exactly one component. Split immediately when a second component appears.

### 12.2 File Size Limits

| File type | Soft | Hard |
|---|---|---|
| Page component (`page.tsx`) | 30 lines | 50 lines |
| Feature component | 150 lines | 250 lines |
| Utility / helper | 80 lines | 150 lines |
| API route handler | 60 lines | 100 lines |

### 12.3 Naming Conventions

- Files: `kebab-case.tsx`
- Exports: `PascalCase` named export
- Feature folders: barrel `index.tsx`
- API helpers: `camelCase` in `src/lib/api/<resource>.ts`

### 12.4 State and Data

- No data fetching in `page.tsx` — delegate to components
- Auth state via `useAuthStore((s) => s.user)` only
- Zustand stores in `src/stores/`

### 12.5 API Requests

- All fetch logic in `src/lib/api/`
- Group by resource: `tasks.ts`, `projects.ts`, etc.
- Re-export through `src/lib/api/index.ts`
- Fully typed parameters and return types

### 12.6 Imports

- Use `@/` path aliases everywhere
- UI primitives from `@/components/ui/`

## 13. Project Rules

- Prefer Bun for all install/script commands
- Do not reach into `@eazo/sdk` internals
- AI must only be called inside `src/app/api/` route handlers
- Call `memory.reportAction()` after every meaningful user mutation (fire-and-forget)
- Always maintain a local `users` table
- Run `bun run cleanup:demo` before feature development
- Before shipping: `bun run lint` && `bun run build`

## 14. Goal

Start fast, stay flexible, and only add complexity when there is a concrete product requirement.
