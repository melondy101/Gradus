# 拾级（Gradus）前端架构重构前后质量评估

> 评估日期：2026-09-25  
> 比较基线：`30c9665` → `7c423a4`（`refactor: 前端架构与 UX 审计四阶段治理（Phase 0-3）落地`）  
> 依据：`docs/plans/2026-09-23-frontend-architecture-ux-audit.md`、当前 `AGENTS.md`、代码与自动化实测。  
> 结论等级：**条件通过（不建议宣称 Phase 0–3 已全部验收）**。

## 1. 执行摘要

本次单提交覆盖 205 个文件（新增 8,223 行、删除 8,377 行）。重构在“数据源收敛”和“可回归验证”方面有实质进展：首页容器从 712 行降至 115 行；任务/统计/通知已建立模块级 store；统一 mutation 已有失败回滚和单测；`/history` 已正确以 308 合并至 `/app?view=plans`。

但它没有完成报告所承诺的所有阶段性目标：仍有 8 个功能组件突破 250 行硬上限，AI 重排仍在 React state updater 中发起副作用，计划库“进入详情”仍不导航，标签仍被丢弃，最小化的 AI 流水线仍不可恢复，弹层体系仍有 `zIndex: 9999/10000` 的手写旁路。故应将当前版本定义为“架构主干已建立、关键体验债未清”。

| 维度 | 得分 | 结论 |
|---|---:|---|
| 信息层级 | 65 / 100 | 静态视觉层级稳定；真实任务流中的错误、恢复和导航层级仍断裂。 |
| 设计一致性 | 68 / 100 | 令牌与关键探针对等通过；内部弹层、会员、通知、分享仍有并行视觉体系。 |
| 功能与交互 | 48 / 100 | 打卡主链改善显著，但 6 个核心交互/失败态问题仍可复现或由代码证实。 |
| 数据流 | 63 / 100 | tasks/stats/notifications 单例收敛完成；账户竞态、分析副作用、残余 API 契约未完成。 |
| 抽象与组件边界 | 38 / 100 | 首页拆分成功，但大型弹层和通知组件未按既定边界拆开。 |
| **综合** | **56 / 100** | **可继续迭代，不满足“Phase 0–3 完全落地”的发布叙述。** |

评分含义：90+ 可作为该维度的稳定基线；70–89 基本可用但有可计划债务；50–69 有用户可感知缺口；<50 存在阻断性或系统性缺陷。

## 2. 量化前后对比

| 指标 | 重构前 | 当前 | 变化 | 解读 |
|---|---:|---:|---:|---|
| `home-page.tsx` 行数 | 712 | 115 | -84% | 首页编排层已显著收敛。 |
| `share-card-modal.tsx` 行数 | 1,004 | 1,155 | +15% | 审计点反而扩大。 |
| `membership-modal.tsx` 行数 | 733 | 809 | +10% | 审计点反而扩大。 |
| `code-manager-tab.tsx` 行数 | 634 | 693 | +9% | 审计点反而扩大。 |
| 超过 250 行硬上限的功能组件 | 未清零 | 8 | — | 违反 AGENTS §13；见 §6。 |
| `src/components` 内 `fetch(` | 4 | 1 | -75% | 数据层集中改善；剩余在 `global-update-modal.tsx:37`。 |
| 组件内十六进制色出现行数 | 111 | 81 | -27% | 有下降，但仍有大量绕开 token 的实现。 |
| 组件内 inline style | 476 | 276 | -42% | 有收敛，但通知、会员、分享等仍是主要债务源。 |
| 裸 `<button>` | 98 | 81 | -17% | Button 原子件并未系统性替代。 |
| 复习节点相关组件 UI 命中 | 有宣传 | 0 | 已清除 | 后端仍计算并返回未持久化的 `reviewNodes`。 |
| `ui/dialog` / `ui/sheet` 引用 | 存在 | 0 | 已清除 | 文件已删除；但不等于所有覆盖层均走 Modal。 |

## 3. 验证证据与覆盖边界

已通过：

- `bun test`：126 pass / 0 fail，覆盖任务 store、打卡/改期/删除 mutation、stats/notifications 单例、API Result 与令牌镜像。
- `bun run lint`：通过。
- `bun run build`：通过。存在 Next 16 的 middleware 弃用警告及 `metadataBase` 未配置警告，均非本次编译阻断。
- `audit:tokens --base=http://localhost:3000`：20/20 令牌计算值一致。
- `audit:colors`：通过，基线为 125 处硬编码色；这是“不可新增”的棘轮，不是“债务已清零”。
- `audit:parity --live=http://localhost:3000`：21 项一致、0 项硬偏差、4 项因无数据未渲染。
- `audit:design --base=http://localhost:3000`：`/`、`/app`、`/app?view=plans`、`/task/parity-probe` 的桌面/移动探针通过，无横向溢出。
- HTTP 路由：`/history` 返回 `308 Location: /app?view=plans`；`/`、`/app`、`/task/parity-probe` 均为 200。

运行时反例：同一轮浏览器探针在 `/task/parity-probe?ritual=plan` 和 `?overlay=subtask` 记录到 React hydration mismatch。错误栈落在 `src/components/ui/modal.tsx:87` 的 portal 首次渲染（服务端为 Suspense、客户端直接出现 portal 容器）。因此上述视觉闸门只能说明最终计算样式匹配，**不能**证明弹层 SSR/hydration 无回归。

未覆盖或不能据此宣称通过：真实数据库下的创建→分析→重排→打卡→改期→切账号全过程、断网行为、通知服务端失败反馈，以及真实任务数据状态下的信息层级。当前视觉探针有 4 个数据依赖元素未渲染；它们不能替代真实数据验收。

## 4. 五维评估

### 4.1 信息层级：65 / 100

**改善**：首页从“取数、派生、写入、弹层、快捷键”混装，拆为 `HomePage`、`HomeWorkspace`、`HomeMainArea`、`HomeOverlaysStack`；视觉闸门在四条关键路由的桌面/移动视口均未发现横向溢出。`/history` 合并为计划库，并保留旧链接 308，信息架构方向正确。

**仍不合格**：

1. `PlanCard` 显示“进入详情 →”，但 `src/components/home/plan-card.tsx:47,141` 只调用 `onOpen`；`home-main-area.tsx:91-96` 只更新右栏焦点，没有 `router.push`。主操作承诺与结果不一致。
2. AI 流水线最小化后，`home-overlays.tsx:127-135` 直接不渲染弹层，仓内没有恢复入口；进行中的关键状态被隐藏。
3. `/task/[id]` 无用户时，`task-detail-page-v2.tsx:54-61` 直接返回而未关闭 `fetching`，使 `:145-156` 的“需要登录”分支不可达，用户只会看到永久加载。
4. 本次删除原有 `/terms` 页面；当前请求是 404，页脚改为“筹备中”。这不是审计报告要求的改动，应作为未说明的产品能力降级记录。

### 4.2 设计一致性：68 / 100

**改善**：设计令牌从“仅约定”变成了可测契约；`ui/dialog.tsx`、`ui/sheet.tsx` 已移除，`Modal` 提供 center/bottom 两种形态，`ConfirmDialog` 与 Sonner 主题化也已建立。令牌和主要弹层探针均通过。

**仍不合格**：

1. `command-palette.tsx:230-262` 仍手写遮罩、面板、动画，且 `zIndex:9999`；`onboarding-tour.tsx:278-280` 仍为 `zIndex:10000`；`notification-center.tsx:239-253` 有独立 portal 和 `zIndex:250`。这与“全站统一由 `ui/modal` 管理层级”的决策相冲突。
2. `ui/modal.tsx:87` 的 portal 在弹层探针中触发 hydration mismatch；`ui/modal.tsx:71-81` 也只 focus 面板，不 trap focus，也不恢复到触发元素；`aria-labelledby={props.id}` 在无 `id` 时无有效标题关联。弹层的视觉对等不代表运行时或可访问性对等。
3. 会员、通知、分享仍保留大量 inline style 与 shadcn 通用色，正是余下 81 行 hex 色与 276 处 inline style 的主要来源。色值棘轮只防止新增，不代表已收敛。

### 4.3 功能与交互：48 / 100

**改善**：⌘K 的双 toggle 已修（`use-home-hotkeys.ts:47-50`）；首页及详情页打卡统一走 `features/tasks/mutations.ts`，测试已验证乐观更新、失败回滚、任务状态级联、改期撤销和统计本地增量；`/history` 的迁移路径正确。

**未解决的高优先级问题**：

1. `use-analysis-panel.ts:26-28` 在 `setEntries` updater 内调用 `run()`；StrictMode 可重放 updater，仍可能重复请求 AI 重排，直接违背原 P0-5。
2. `home-overlays.tsx:60-63` 的 `runNewGoal(goal)` 丢弃 `NewTaskInput` 的 tags；`home-main-area.tsx:71-74` 打开对话框时也丢弃 GoalCard 的输入文字。原 P1-5 未解决。
3. `notification-center.tsx:120-148` 忽略 store 返回的 `false`，并 catch 后静默；服务端失败时没有用户反馈。原 P1-6 仅解决重复轮询，未解决失败态。
4. `ai-entry-detail.tsx:108-115` 的重排按钮没有 pending 禁用；`use-analysis-runner.ts:29-32` 仍吞 `getTask` 错误，失败后的恢复路径不完整。

### 4.4 数据流：63 / 100

**改善**：`features/tasks/store.ts` 用 Map 维护任务和子任务的单一来源，并派生 `taskList` / `subtaskRows`；`features/stats/store.ts` 与 `features/notifications/store.ts` 对同账号首拉去重；`features/tasks/mutations.ts` 集中写侧逻辑。相对审计时“首页四份可变副本 + 9–11 请求”的模型，这是正确的结构性改进。

**仍不合格**：

1. `use-home-data.ts:31-44` 没有 AbortController 或请求序号；切账号或重试时旧响应仍可调用 `loadTasks()` 覆盖模块 store，未满足“切账号无陈旧闪现”的验收项。
2. `reviewNodes` 仍在 `api/tasks/[id]/analyze/route.ts:409,457` 计算并返回，却不落库、没有客户端消费者。虽然 UI 宣传已删除，但 API 领域契约仍保留幽灵字段，应删除计算和返回，或明确定义为内部非产品字段。
3. `lib/api/tasks.ts` 仍将三组 PATCH 和错误解析聚在同一 145 行 helper 中，统一 `ApiResult` 的覆盖尚不完整。

### 4.5 抽象与组件边界：38 / 100

**改善**：首页主容器及取数边界大幅改善，`HomePage` 已为 115 行、没有直接 fetch；数据读取迁至 `use-home-data.ts` 和 `lib/api`，符合本项目的分层方向。

**硬违规（AGENTS §13）**：

| 当前文件 | 行数 | 问题 |
|---|---:|---|
| `share-card-modal.tsx` | 1,155 | 比重构前增加 151 行，仍混合弹层壳、四卡面与导出。 |
| `membership-modal.tsx` | 809 | 比重构前增加 76 行，混合会员展示、兑换、管理。 |
| `code-manager-tab.tsx` | 693 | 比重构前增加 59 行。 |
| `onboarding-tour.tsx` | 597 | 同时定义多个 UI 单元。 |
| `notification-center.tsx` | 503 | 按钮、定位、弹层、筛选、服务端动作共存。 |
| `auth-modal.tsx` | 451 | 单文件多个组件。 |
| `command-palette.tsx` | 410 | 状态、命令模型、覆盖层、样式同文件。 |
| `subtask-detail-modal.tsx` | 407 | 单文件多个组件。 |

此外，`features/tasks/mutations.ts` 为 182 行，超过 helper 150 行硬上限；`home-overlays.tsx`（169）与 `task-detail-page-v2.tsx`（185）超过功能组件 150 行软上限。应先按职责拆分，而非继续在这些文件上叠加功能。

## 5. 与四项已拍板决策的符合度

| 决策 | 状态 | 证据 / 缺口 |
|---|---|---|
| 删除复习节点宣传，不落库 | 部分完成 | 组件 UI 已清；分析 API 仍计算并返回 `reviewNodes`。 |
| `/history` 合入 plans，旧 URL 308 | 通过 | `next.config.ts:9-17` 与 HTTP 308 实测。 |
| Dialog/Sheet 收敛至 `ui/modal` | 部分完成 | `dialog.tsx`/`sheet.tsx` 已删；指令面板、引导、通知仍绕过 Modal/z 阶梯。 |
| 严格 Phase 0→3 | 不可验收 | 单一 squash 提交没有每阶段独立闸门证据，且 Phase 0/P1 项仍残留。 |

## 6. 发布建议

不建议以“Phase 0–3 已全部落地”发布。若要进入稳定发布，先完成以下 P0/P1 收尾并重新跑全部闸门：

1. 将 AI 重排的 `run()` 移出 state updater；为重排加 pending 与失败可重试。
2. 让 GoalCard 文本与 NewTaskInput tags 贯穿到 `startAnalysis(goal, tags)`；使 plans 卡片真实路由到 `/task/[id]`。
3. 为最小化仪式弹层增加可恢复 dock；修复无用户详情页的永久 loading。
4. 对通知的 `markRead`、`markAllRead`、`clearAll` 的 `false` 结果显示错误 toast。
5. 收敛 CommandPalette、Onboarding、NotificationPopover 到唯一 overlay/z-index 机制，并补 focus trap 与焦点恢复。
6. 修复 `Modal` 的 SSR/hydration 路径，再重跑所有带 overlay 的 parity-probe 参数；优先拆分分享、会员、兑换码、通知四个超大组件；同时删除或明确 `reviewNodes` 的 API 契约。
7. 删除 Dockerfile，或改为 Bun 锁文件和与 `output: "standalone"` 一致的构建方式；它目前引用不存在的 `pnpm-lock.yaml`，并复制未必生成的 `.next/standalone`。

完成后，需要在可用数据库环境补做：创建目标、提交 tags、分析失败重试、最小化恢复、断网打卡回滚、改期撤销、plans→详情导航、切账号竞态、通知失败反馈的端到端验证。
