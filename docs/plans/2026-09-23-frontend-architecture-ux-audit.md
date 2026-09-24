# 拾级（Gradus）前端架构与体验审查报告

> 日期：2026-09-23 · 分支：`feat/gradus-brand-redesign`
> 性质：**审查与建议**，未做任何重构。所有行号在当前工作区逐条复核过。
> 范围：`src/app/`（5 个路由页）、`src/components/`（155 个 tsx）、`src/lib/api/`、`src/app/globals.css`、`output/拾级Gradus-设计预览.html` 四道闸门。

---

## 1. 项目现状摘要

### 1.1 基本盘

- 约 23k 行前端相关 TS/TSX。页面壳薄（`page.tsx` 均 <10 行），但**壳下的容器组件极重**：`home-page.tsx` 766 行、`task-detail-content.tsx` 635 行（死代码）、`share-card-modal.tsx` 1043 行、`membership-modal.tsx` 776 行——全部超出 AGENTS §13 的硬上限（页面 50 / 功能组件 250）。
- **无任何数据层库**（无 SWR/react-query/zustand），服务端状态靠 `useState + useEffect + 手写乐观更新`维持；同一批子任务在 `/app` 首屏同时存在 **4 份可变副本**（§4.2）。
- 存在**多套并行的重复实现**：任务详情页有 v1/v2 两套（线上是 v2，v1 全套约 900+ 行是死代码且内含违反品牌的蓝色配色）；`use-task-snapshot` / `use-home-filters` / `use-home-hotkeys` 三个"抽了 hook 但没接线"的孪生体；`/history` 与 `?view=plans` 是同一份数据的两套 UI。
- 值得肯定的资产：`ui/` 原子件质量高（button 13 variants、modal 带 z 阶梯与 ESC 管理、eyebrow/heading/chip/badge 语义清晰）；`use-subtask-actions.ts` 的"乐观更新+回滚+撤销+toast"和 `task-detail-page-v2.tsx:48-55` 的"userId 稳定依赖+cancelled 守卫"是全仓范本；视图模型（`subtask-view-model.ts`、`timeline-sections.ts`）是纯函数；四道设计闸门思路正确但存在结构性盲区（§3.4）。

### 1.2 主要问题清单（按 P0/P1/P2 排级）

统计：**P0 × 7 · P1 × 30+ · P2 × 40+**（完整明细见 §2–§5）。

#### P0 —— 核心路径损坏 / 对用户撒谎

| # | 问题 | 证据 |
|---|------|------|
| P0-1 | ⌘K 快捷键失效：palette 内两个分支都执行 `onClose()`，与父级 toggle 互相覆盖，键盘基本打不开指令面板，而 UI 两处宣传 ⌘K 键帽 | `home/command-palette.tsx:53-57`、`home/home-page.tsx:416-418`、`home/kbd-footer.tsx:13` |
| P0-2 | 详情页打卡/状态更新全部吞错、乐观更新不回滚、无提示 → 网络失败后 UI 与服务端静默分叉 | `task/task-detail-page-v2.tsx:80,88,92,101,124`（均 `.catch(() => {})`） |
| P0-3 | 历史页加载失败被渲染成"还没有任务记录"空态，网络异常时用户以为数据丢失 | `history/history-page.tsx:46-48 → :108` |
| P0-4 | 会员配额读取失败时展示**伪造的默认额度**（`?? 2`）且无错误 UI；付费决策信息失真 | `membership/membership-modal.tsx:92,329,339,347` |
| P0-5 | 在 `setSubtaskRows` 的 state updater 内执行副作用（发 PATCH、弹庆祝窗）；StrictMode/重渲染下重复写库、重复弹窗 | `home/home-page.tsx:295-310` |
| P0-6 | 分享卡数据为编造值（`deepWorkHours = count×1.5`、`streakDays: 7`、Bloom 硬编码），与真实统计同屏出现 | `home/home-page.tsx:109-116,133-138` |
| P0-7 | "复习节点"是幽灵领域概念：`suggestReviewNodes` 结果从不落库，但甘特图例、AI 面板、落地页都在宣传/表演它（虚线实为 `plan` 未开始态） | `api/tasks/[id]/analyze/route.ts:409`、`home/timeline-view.tsx:48,68`、`task/gantt-bar.tsx:52-53` |

#### P1 —— 明显体验缺陷 / 系统性不一致

**交互断点与反馈缺失：**
1. AI 流水线弹窗最小化后**无法恢复**，主流程被阻塞（`home-page.tsx:69,711`）。
2. 分析完成态从首页不可达：`activeEntry` 过滤掉 done/error，`RitualDoneState` 成死路径，成功无反馈无引导（`home-page.tsx:705-710`）。
3. AI 分析失败无重试按钮；重排时整块详情突然卸载、按钮无 pending 态可双击（`home/ai-inspector.tsx:98-102,118`、`use-analysis-panel.ts:14-25`）。
4. "进入详情 →"是假导航，只 `setFocusedId` 不跳转（`all-plans-view.tsx:336` ↔ `home-page.tsx:590-593`）。
5. GoalCard 输入的文字打开对话框时被丢弃（`goal-card.tsx:76` → `home-page.tsx:575` 忽略参数）；NewTaskInput 所选标签被静默丢弃（`new-task-input.tsx:44` 第二参数未使用）。
6. 通知中心今日视图同时挂载 2-3 个实例 × 30s 轮询，四处 catch 全静默（`notification-center.tsx:68,71-74,146,159,177`）。
7. 同一"完成子任务"动作，首页有 toast+回滚+撤销、详情页吞错、历史页删除 `catch {}` —— 三处反馈强度完全不同。
8. `/history` 是孤儿页面（侧栏/tab bar 无入口），与 `?view=plans` 数据同源 UI 分裂。
9. 落地页"先看演示数据"CTA 把访客带进**自己的空应用**，无登录引导，漏斗死路（`landing/final-cta.tsx:40-41`、`home-page.tsx:235`）。
10. 更新检查在 Web 端整体不可达：`global-update-modal` 对非原生壳返回 null 且 `openAppUpdateModal` 全仓无调用点。
11. 退出登录无二次确认（`user-profile/user-badge.tsx:45`）。
12. 首屏重复取数：`/api/tasks?withSubtasks=1` ×3、`/api/user/stats` ×2（挂载后共 9-11 请求；每勾选一次净增 3 个 stats 请求）（`home-page.tsx:182,222-241,314`、`level-badge.tsx:38`）。
13. `use-task-snapshot/use-home-filters/use-home-hotkeys` 死孪生体 + v1 详情页四件套死代码，随时可能被误接回形成双真相源。

**设计与信息层级（明细见 §3）：** z-index 三套体系互不知晓（登录框会被指令面板压住）；弹层遮罩 5 种写法；toast 三套系统并存；任务卡四视图四种圆角；98 个裸 `<button>`；`text-[Npx]` 约 280 处；JS 令牌镜像 `design-tokens.ts` fallback 与 CSS 值已漂移（`.14` vs `.16`）。

**状态管理（明细见 §4）：** 子任务四份可变副本且 postpone 漏更三份；`useEazo().loading` 恒 false 导致多处骨架屏死分支；`useUserStats` 不依赖 user，切换账号后统计不刷新；列表拉取无 abort/序号守卫。

#### P2 —— 打磨项（节选，全量见 §3/§5 表）

- 字号半像素档 6 种（9.5/10.5/11.5/12.5/13.5/14.5px 共约 37 处）；`--duration-*` 令牌零采纳（31 处 `duration-[.16s]` 等绕行）。
- 空态 DIY：共用件 `view-state-card` 采纳率 <50%，"暂无×"裸写 10+ 处。
- 侧栏折叠按钮不折叠（`icon-rail.tsx:26-33` 注释自认）；里程碑弹窗 4.2s 自动关闭与其他弹窗行为不一致。
- 弹窗开着时 n/Space 快捷键穿透（`home-page.tsx:419-423`、`ui/modal.tsx:61-72` 只 stopPropagation）。
- 落地页版本号硬编码 `v2.4`、AI 状态胶囊纯装饰假数据（`landing/hero.tsx:33`、`nav.tsx` AiPill）。
- i18n：143 个含中文组件仅 21 个接了 i18n，硬编码大户 `code-manager-tab`(43 串)/`auth-modal`(37 串)。
- 历史别名未清：`globals.css:205-214` 10 条 + `design-tokens.ts:104-111` 8 组双重兼容层。

---

## 2. 页面信息层级审查表

> 结论格式：**核心信息 → 次要信息 → 补充说明**；⚠ 标出主次颠倒处。

### 2.1 落地页 `/`

| 应然层级 | 实然状态 | 调整建议 |
|---|---|---|
| 核心：产品价值主张 + 主 CTA（开始规划） | hero 标题与主 CTA 合格 | — |
| 次要：功能演示、mock 屏 | 与主叙事同级铺陈 | 保持 |
| 补充：版本徽标、AI 胶囊、订阅、页脚 | ⚠ `v2.4` 硬编码徽标与假数据 AiPill 占据了与真实信息同权重的位置 | 徽标接真实版本源或删除；AiPill 改静态文案或移除 |
| ⚠ 死路 | 次 CTA「先看演示数据」落地是访客空应用 | 目标页加访客引导卡，或 CTA 直接打开 seeded 演示视图 |

### 2.2 应用主面板 `/app`（今日/天梯/全部/甘特四视图）

| 层级 | 内容 | 问题与建议 |
|---|---|---|
| 核心 | 今日应完成的子任务清单 + 打卡动作 + 新建目标入口 | 视图切换 tab、统计区与之争夺首屏权重；今日视图基本达标 |
| 次要 | 进度数字（等级徽章/周进度/成就）、通知红点 | ⚠ 周进度存在**两套并存口径**（IconRail 内部聚合 vs today-metrics 行级），且 home-page 未传 `weekSubtasks` 使 widget 永远走 fallback——同一"进度"概念两个数字 |
| 补充 | Bloom 层级 chip、时长、资源数、日期 | ⚠ 天梯视图所有 Bloom chip 硬编码 `--bloom-5` 色（`ascending-steps-view.tsx:211`），层级语义色失效；⚠ 全部计划视图整页裸 inline style，与今日视图品牌 token 不同源 |
| 反例 | 子任务详情弹窗内两个通栏 accent 主 CTA 并列（`subtask-detail-modal.tsx:189,365`） | 主次颠倒：「开始学习」保留 accent，「复制提示词」降 ghost |

### 2.3 任务详情 `/task/[id]`（v2）

| 层级 | 内容 | 问题与建议 |
|---|---|---|
| 核心 | 任务标题 + 子任务清单 + 打卡 | 达标 |
| 次要 | 进度、甘特、标签 | 加载态是纯文本，与首页骨架屏不同语言 |
| 补充 | 结业/重新规划入口 | ⚠「AI 重新规划」实为 `<Link href="/app">` 跨页跳转，文案承诺页内能力（`task-detail-header.tsx:55-62`）；404/未登录态无重试/返回按钮 |
| 死代码 | v1 全套（蓝 `#3B7AFF` 主色 + emoji，违反品牌） | 删除 |

### 2.4 历史 `/history`

| 层级 | 内容 | 问题与建议 |
|---|---|---|
| 核心 | 任务归档列表 + 删除 | ⚠ 加载失败伪装成空态（P0-3）；行内创建日期重复出现两次（`history-row.tsx:64,79`） |
| 次要 | 进度统计 | "新建规划"只回 `/app` 不打开输入框，与首页同名入口行为不一致 |
| 结构 | — | 与 `?view=plans` 同数据双 UI、且无导航入口（孤儿页）——二选一合并 |

### 2.5 共享弹层（会员/分享/通知/认证）

| 层级 | 问题与建议 |
|---|---|
| 会员弹窗 | 核心应是「当前等级/配额 → 升级动作」；⚠ 配额失败时显示假默认值（P0-4）；「一键填入并兑换」不兑换（:525 vs :126-131） |
| 分享卡 | 核心是卡面预览；主色上写白字违反品牌对比规范（`share-card-modal.tsx:192-193` 等 4 处）；无 ESC |
| 通知中心 | 核心是未读流；入口三实例轮询但无失败反馈，坏了用户不知道 |
| 认证弹窗 | 状态机全仓最佳（节流/倒计时/429 均有反馈），但视觉语言与 z 阶梯脱轨——**"最好的交互逻辑穿了最难看的衣服"** |

---

## 3. 设计一致性规则与 Design Token 建议

### 3.1 已成立的共用设计规则（应显式写进规范并强制）

1. **色彩**：奶油底 `--cream` + 墨字 `--ink` + 点缀黄 `--accent`（一屏最多一次）+ 白卡浮底无投影层次；语义色 success/warning/error + bloom 1-6 暖灰阶梯。
2. **字体阶梯**：heading 四档（hero/sec/sub/page）+ eyebrow（全站标题上方小字）；正文 13/11/10px 事实主力档。
3. **弹层语言**：45% 墨遮罩 + blur 2px + `rounded-[20px]` + `--shadow-float` + fadeSlideUp + z 阶梯（newTask100/detail200/confirm300/ritual350/danger360/milestone400）。
4. **组件语义**：Card tone(base/dark/soft)、Chip 胶囊 13px / Tag 6px 方角等宽、Badge live/done/plan 三态、主药丸 h-11/px-26/15px 粗字。
5. **动效**：`--duration-fast/normal/slow` + `--ease-out/bounce` + keyframes 族。

### 3.2 破坏"同一产品感"的根源（按影响排序）

| 级别 | 破坏点 | 量化证据 |
|---|---|---|
| P0 | 三套色板并存：品牌黄黑 vs shadcn 通用变量（membership/share/notification/update 用 `primary/emerald/amber/indigo`）vs 死代码 v1 的蓝紫板 | `share-card-modal.tsx` 69 处 hex；`task-detail-content.tsx:25-46` 自带 22 处 hex + 6 级 Bloom 全错 |
| P1 | z-index 双体系：`ui/modal.tsx` Z 阶梯 vs 手写 `z-50`×10 + `z-[150]`/`z-[400]`/内联 400/401/10000+ | 9 种 z 值；登录框会被 palette 遮挡 |
| P1 | 遮罩 5 种写法（`bg-ink/45` ✓ / `bg-black/40` / `bg-black/60` / 内联 rgba / shadcn 未改的 `black/10`） | dialog.tsx/sheet.tsx 仍是出厂样式 |
| P1 | toast 三套：sonner（shadcn 白卡）vs HomeToast（品牌深药丸）vs RitualToast（几乎逐类复制 HomeToast）+ 两处原生 `confirm()` | `notification-center.tsx:170`、`code-manager-tab.tsx:137` |
| P1 | 同类元素各写各的：任务卡 4 视图 4 样（5 种圆角 3 种投影来源）；98 个裸 `<button>` vs Button 13 variants | `all-plans-view` 整页 inline style 且引用未定义的 `--shadow-xs` |
| P1 | JS 令牌镜像漂移：`design-tokens.ts` fallback `.14` vs CSS `--accent-soft` `.16`；4 套主题在 globals.css 与 `theme-config.ts` 双源 | token-parity 闸门只测 `/app` 亮色，全绿 |
| P2 | 字号 280 处 arbitrary（含 6 个半像素档）；duration 令牌零采纳；`rounded-[Npx]` 45 处十个档位 | 详见 §1.2 P2 |
| P2 | `--radius` 四种命名法并存（card/field/pill、sm-2xl 刻度、shadcn `--radius`、`--r-*` 别名） | `globals.css:59-89,122-125,171` |

### 3.3 Design Token 增量建议（轻量，只收编出现 ≥3 次的一次性值）

```css
/* —— 文字 —— */
--text-2xs: 9.5px;   /* 15 用 */  --text-micro: 10px;   /* 48 用 */
--text-caption: 11px; /* 43 用 */  --text-body-sm: 12px; --text-body: 13px;  /* 26 用 */
--text-body-lg: 15px; --text-title-sm: 17px; --text-title: 19px;
/* 半像素档 10.5/11.5/12.5/13.5/14.5（约 37 处）就近归档，闸门容差 ±0.5px */

/* —— 遮罩/弹层/层级 —— */
--scrim: rgba(17,17,17,.45);  --scrim-blur: 2px;
--z-nav: 40; --z-modal-newtask: 100; /* …将 modal.tsx Z map 升为 CSS 令牌 */
--shadow-toast: 0 22px 46px -18px rgba(14,13,11,.6);
--radius-popover: 20px;  /* = --radius-xl，收编三处 rounded-[20px] */

/* —— 小圆角 —— */
--radius-tag: 6px;  --radius-chip-sm: 4px;  --radius-icon: 10px;  --radius-tile: 8px;

/* —— 间距/动效 —— */
--gap-tag: 5px;  --gap-meta: 7px;  --gap-ctl: 9px;  --space-snug: 18px;
--duration-quick: 160ms;  /* 25 处 .16s 是事实标准：直接改 --duration-fast 值并全局替换 */
```

**配套治理（比令牌本身更重要）：**
1. 静态闸：`src/components/**/*.tsx` 禁止 hex 字面量（白名单 design-tokens.ts/opengraph/manifest），补现有四道闸门对"TSX 内联 style / arbitrary 值 / JS fallback"的三大盲区。
2. `bun test` 断言 `design-tokens.ts` fallback 与 `globals.css` 值逐条相等；4 套主题对 `theme-config.ts` 同理。
3. 删除历史别名（`globals.css:205-214`、`design-tokens.ts:104-111`）前先 grep 消费方。
4. Dialog/Sheet 二选一：要么品牌化改造，要么废弃、全部收敛到 `ui/modal.tsx`。

### 3.4 缺失的基础组件

`ConfirmDialog`（title+destructive+cancel 原子件）· `EmptyState`（行内小空态，view-state-card 只管视图级）· `Skeleton` 家族（现仅 list-skeleton 一个）· 统一 Scrim/Overlay · 品牌化 Tab（三处裸 button 自拼）· Tag/Chip variant 收口（三处重造）· Progress（四处各写各的）· **单一 Toast 出口**（把 HomeToast 深药丸样式灌进 sonner `toastOptions.classNames`，删 RitualToast）。

---

## 4. 交互与数据流

### 4.1 核心数据流（现状，文字图）

```
【读·/app 首屏】
/api/subtasks ──┐
                ├─ loadSubtasks(home-page:176) ─→ ① subtaskRows ─→ TodayView/时间轴
/api/tasks?withSubtasks=1 ─┤                       ② tasksList   ─→ AllPlansView/侧栏计数
        (home-page:182 与 :238 各拉一次，:222-231 done 检测再触发第三轮)
/api/user/stats ── useUserStats(:395) + LevelBadge 自拉(level-badge:38) + 勾选后直调(:314)
/api/notifications ─ NotificationCenter ×2-3 实例各自 30s setInterval

【写·勾选子任务】
点击 → 同步改 ①②③④ 四份副本(home-page:246-289) → PATCH toggleSubtask
     → 失败逐份回滚 → 全完成时在 setState updater 内发 PATCH done + 弹庆祝(P0-5)
改期 postpone → 只改副本①，tasksList/entries/弹窗 startDay 全部陈旧 ← 漏更实锤
分析完成 → POST analyze → auth.refresh() → getTask 单拉 → 整表重拉①②
```

`/app` 首屏稳态 **9-11 个请求**：tasks×3、subtasks×2、stats×2、notifications×2（+30s 轮询×2）；每次打勾净增 3 个 stats 请求。

### 4.2 状态清单与职责边界

| 数据项 | 权威来源 | 持有位置 | 刷新机制 | 判定 |
|---|---|---|---|---|
| 子任务 | DB→API | **4 份可变副本**（subtaskRows / tasksList / entries[].task / detailSubtask） | 手工逐份 map | ✗ 违反单一来源（P0 级） |
| 用户统计 | `/api/user/stats` | 3 个独立持有者 | streakTick / 自拉 / 直调 | ✗ "单点读取"注释与事实矛盾 |
| 通知 | `/api/notifications` | 每组件实例私有 state + 各自轮询 | 30s interval | ✗ 需提为订阅式单例 |
| 当前用户 | JWT cookie | RSC → UserProvider → 模块级 store | auth.refresh() | ✓ 基本合格；⚠ `loading` 恒 false 是假来源 |
| 主题/语言 | localStorage | 各自 Provider | — | ✓（首帧 theme 闪烁已自认） |
| 分析流 phase | 前端计时器**伪造**（`phaseForElapsed`） | entries | 1s ticker | ⚠ 伪进度，服务端失败时表演与事实脱钩 |
| 复习节点 | **不存在**（不落库） | — | — | ✗ 幽灵概念（P0-7） |
| UI 临时态（tab/筛选/弹窗开关） | 组件 | home-page 顶层 30+ useState | — | ⚠ 容器过载，应随拆分下沉 |

### 4.3 领域抽象问题与建议模型

1. **`status` 一词三义**：`tasks.status`（active|done，但 done=“规划完成”而详情页又当“学习中”用）/ `subtasks.completed` 布尔 / 流 `Phase:"done"` 撞词。→ 建议 `task.planStatus` 与 `task.progressStatus` 拆开；流状态改名 `runState: running|succeeded|failed`。
2. **`startDay` 两套时间语义**：相对各任务的偏移 vs 视图跨任务排序（天梯/甘特直接按裸 startDay 排——A 任务第 3 天 ≠ B 任务第 3 天）。→ 数据层暴露 `absoluteStart/End`，禁止视图消费裸偏移量。
3. **同一子任务两种 TS 类型**（`SubtaskWithTask` vs `TaskWithSubtasks.subtasks`，日期字段一个 string 一个 Date）。→ 单一 DTO + 派生选择器。
4. **三套前端投影无对等转换**（TaskWithProgress/TaskWithSubtasks/SubtaskWithTask）。→ 规范化 store：`Map<taskId,Task> + Map<subtaskId,Subtask>`，写入时拆开归一，视图全部 selector 派生（不必上重库）。
5. `use-analysis-runner` 藏在"view-model"命名域里发请求——目录语义与职责冲突。

### 4.4 数据服务层契约

`src/lib/api/` 覆盖不全且契约不统一：tasks 抛裸文本 Error、notifications/membership 返回 `{ok:false}` 或 `null` 静默降级、无 401 拦截/重试/超时。绕过层：auth 族 4 处直接 `fetch`（建议补 `lib/api/auth.ts`）；`/api/user/stats`、`/api/tasks/:id/analyze` 无 typed client 逼出 `request` 半绕过；`membership-codes.ts` 是服务端代码放错进客户端目录；`calendar.ts` 疑似指向不存在端点（待核）。

---

## 5. 组件化与可替换架构

### 5.1 分层原则（目标态）

```
页面容器(page.tsx, 软≤30行)   只做路由级编排：读 params → 挂 Provider → 选布局
业务模块(features/*)           自取数或接 selector，持有本域交互，对外只暴露 props/events
通用组件(components/*)          纯呈现 + 局部交互，零数据请求、零业务字面量
基础 UI(ui/*)                   现 ui/ 原子件 + §3.4 补齐件；唯一样式真相源=token
hooks/状态(features/*/hooks + stores/)  服务端状态=规范化 store + 订阅；UI 态=局部 state
数据服务(lib/api/*)             每个端点一个 typed client；统一 ApiResult 契约；组件永不裸 fetch
类型与常量(lib/types + constants)  单一 DTO（TaskDTO/SubtaskDTO）+ 枚举，前后端共享
```

替换性判据：换 UI（Modal→Drawer、今日视图重排）不动 store 与 api 层；换数据实现（fetch→SWR、REST→RSC 注水）只动 `lib/api` 与 store 适配器，业务模块 props 不变。

### 5.2 建议目录结构（增量演进，不推倒重来）

```
src/
  app/
    page.tsx                    Landing（不变）
    app/page.tsx                → 只渲染 <HomeScreen/>
    task/[id]/page.tsx          → 只渲染 <TaskDetailScreen/>
    history/                    （并入 plans 视图后保留 redirect）
  components/
    ui/                         原子件 + 补齐 ConfirmDialog/EmptyState/Skeleton/Tab
    layout/                     AppShell/IconRail/SideNav/MobileTabBar/ContextPanel
    landing/  auth/  i18n/      （不变）
    home/      → 拆为 features/today + features/plans + features/gantt（见组件树）
    task/      → 删 v1 四件套；v2 拆细（见职责表）
    history/   → 与 all-plans 合并为 features/plans
    membership/ share/ notifications/ update/  → 保留，换 ui/modal 阶梯 + token 回归
  features/                     ★新增：业务模块层
    tasks/
      store.ts                  规范化 Task/Subtask store（单一来源）
      hooks/use-tasks.ts        selector 派生视图数据
      hooks/use-subtask-toggle.ts   统一打卡（乐观+回滚+撤销+toast，提级 use-subtask-actions）
      hooks/use-postpone.ts / use-delete-plan.ts
      analysis/                 AI 流水线：api client + runner + phase 类型（runState）
    stats/use-user-stats.ts     模块级单例 store
    notifications/use-notifications.ts  单例订阅，组件只消费
  lib/
    api/                        + auth.ts + user-stats.ts + analyze.ts；统一 ApiResult<T>
    types/                      ★新增：TaskDTO/SubtaskDTO/枚举（从 tasks.ts 投影收敛）
    view-models/                纯函数（现 subtask-view-model 等归位），禁止藏 fetch
```

### 5.3 组件树（目标态）

```
HomeScreen (编排, 0 fetch)
├─ AppShell(IconRail | SideNav | MobileTabBar)         props:view,counts  events:switch,collapse
├─ ViewHead                                            props:view,stats    events:search→CommandPalette, newPlan
├─ TodayView ─ TodayTaskList ─ SubtaskLine ─ CheckBox  props:rows          events:toggle,postpone,skip,openDetail
├─ PlansView(与/history合并) ─ PlanCard×               props:tasks         events:open(真导航),delete
├─ GanttView ─ TimelineSections ─ GanttBar             props:absoluteDates events:zoom
├─ RightPanel ─ AiInspector ─ AiEntryDetail            props:entries(纯消费,零请求)  events:replan,apply,remove
├─ NewTaskDialog ─ GoalCard                            props:initialText,tags(保留输入!)  events:submit(goal,tags)
└─ 弹层栈（全部走 ui/Modal Z 阶梯）:
   AnalysisRitual(minimize→可恢复 dock) · SubtaskDetail · DeleteConfirm(ConfirmDialog)
   · Auth · Membership · Share · NotificationPopover · Congrats · Milestone · CommandPalette(⌘K修复)
```

### 5.4 组件职责表（重点拆分对象）

| 组件（现状） | 行数 | 现职责 | 拆分后职责 | props ↓ / events ↑ | 可替换边界 |
|---|---|---|---|---|---|
| `home-page.tsx` | 766 | 编排+取数×4+乐观同步×4+快捷键+8 弹窗状态 | **HomeScreen 只编排**；取数入 `use-tasks` store；快捷键入 `use-home-hotkeys`（现成死码接活）；弹窗入 `use-overlays` | props: initialData? / events: 无 | 数据源换成 RSC 注水不影响呈现 |
| `task-detail-content.tsx` (v1) | 635 | 死码 | **删除** | — | — |
| `share-card-modal.tsx` | 1043 | 弹层壳+4 卡面模板+下载/复制 | `ShareModal`(壳) + `cards/*`(4 纯模板组件，吃 `ShareData` props) + `use-card-export` | props:data / events:close | 卡面模板可换不影响弹层 |
| `membership-modal.tsx` | 776 | 壳+配额展示+兑换+管理员三合一 | `MembershipModal`(壳) + `QuotaPanel`(错误态≠假数据) + `RedeemForm` + `AdminTab→code-manager` | props:open / events:redeem,upgrade | 配额失败显示错误+重试 |
| `task-detail-page-v2.tsx` | 176 | 取数+5 处吞错 mutation | `use-task-detail`(fetch+守卫) + 复用 `use-subtask-toggle`（首页范本提级），删 catch-吞错 | props:taskId / events:— | 与 /app 共享 mutation 语义 |
| `notification-center.tsx` | 522 | 按钮+面板+state+轮询+吞错 | `NotificationButton`+`NotificationPanel`(纯呈现)；数据入 `use-notifications` 单例 | props:items / events:read,clear | 轮询→SSE 只换 store |
| `onboarding-tour.tsx` | 597 | 步骤数据+遮罩+定位 | `TOUR_STEPS` 常量 + `TourOverlay` 组件 | props:steps / events:done,skip | 步骤内容可配置化 |
| `command-palette.tsx` | 414 | 监听+搜索+结果 | 修 P0-1（toggle 上收父级，只监听 ESC）；接 z 阶梯 | props:open / events:select,close | 命令源可注入 |
| `code-manager-tab.tsx` | 677 | 17 裸按钮表格 | 换 ui/Button/ui/Table；confirm()→ConfirmDialog | props:— / events:— | — |

### 5.5 复用基线（现状已有的"正确实现"，重构向它们收敛）

乐观更新四件套 `use-subtask-actions.ts` · 竞态守卫取数 `task-detail-page-v2.tsx:48-55` · 错误态+重试 `home-page.tsx:176-191` · 品牌弹层 `ui/modal.tsx` + `delete-plan-modal.tsx` · 语义化空态 `today-list-empty.tsx` · 甘特窗口化 `gantt-chart.tsx:60-64`。

---

## 6. 分阶段重构计划（待确认后实施）

> 原则：先止血（P0）→ 再收口（一致性）→ 后动骨（架构）。每阶段独立可发布，闸门 `lint/build/audit:*` 全绿是硬门槛。

### Phase 0 · 止血（1-2 天，低风险，不改架构）
- **范围**：7 条 P0。⌘K 双监听改单点 toggle；`task-detail-page-v2` 五处吞错换成复用 `use-subtask-actions`；history-page 加 `loadError`+重试分支（照抄 home-page:176-191）；membership 配额失败显示错误态删 `?? 2`；home-page:295-310 副作用移出 state updater（完成检测改 useEffect 派生）；分享卡编造字段接真实 stats 或标注"示意"；复习节点二选一（落库 or 删图例宣传文案）——**建议先删 UI 宣传，落库进 Phase 3 决策**。
- **依赖**：无。**风险**：极低（均为局部修补）。
- **验收**：断网打卡→出现错误 toast 且状态回滚；/history 断网→错误态非空态；⌘K 键盘可开关；`audit:modals` 不回归。

### Phase 1 · 清理死码与重复实现（1 天，中风险：删除需全仓 grep 确认）
- **范围**：删 `task-detail-page.tsx`(v1) / `task-detail-content.tsx` / `analysis-panel.tsx` / `task-input-form.tsx` / `user-profile.ts`(零调用) / `membership-codes.ts`(移到 server 侧)；把 `use-home-hotkeys`、`use-task-snapshot` 接活或删除；`/history` 与 plans 视图合并（保留 URL redirect）；更新 AGENTS §15。
- **依赖**：Phase 0 完成（避免在死码上修 bug）。**风险**：中——误删引用，靠 `bun run build` + 四道闸门兜底。
- **验收**：`bun run build` 绿；`audit:parity` 零偏差；页面数-1 且功能无回退。

### Phase 2 · 设计系统收口（3-5 天，中风险：视觉回归面大）
- **范围**：§3.3 token 增量落 `globals.css` + `design-tokens.ts` 同步；z-index 全量迁 `ui/modal` 阶梯（auth/update/share/membership/dialog/sheet 换壳）；toast 三合一（sonner 灌品牌样式，删 HomeToast/RitualToast 或反向）；原生 `confirm()` ×2 换 ConfirmDialog；任务卡四视图统一到 Card 原子件；hex 静态闸 + token 镜像测试进 CI；分 4 批还 arbitrary 值债（每批一个目录）。
- **依赖**：Phase 1（删掉的 v1 不再产生工作量）。**风险**：中——四道闸门逐批改逐批跑，视觉 diff 需人工过。
- **验收**：`audit:tokens/parity/modals/design` 全绿且新静态闸上线；同元素跨页 computed 值一致（抽查卡圆角/遮罩浓度/按钮尺寸）。

### Phase 3 · 状态与数据流收敛（5-8 天，高风险：核心链路，放最后）
- **范围**：`features/tasks/store.ts` 规范化 store（Map 双表 + selector），消灭 4 副本；postpone/勾选全走统一 mutation hooks（乐观+回滚+撤销）；`use-user-stats`/`use-notifications` 提为模块级单例订阅（首屏 9→≤5 请求，轮询 2→1）；`lib/api` 补 auth/user-stats/analyze typed client + 统一 `ApiResult<T>`；home-page.tsx 按 §5.3 拆至 <150 行；`startDay` 语义统一为 absolute 日期出层；领域改名（planStatus/progressStatus/runState）；（可选决策）review_nodes 落库 + `subtasks.kind` 字段 + 迁移。
- **依赖**：Phase 0-2（store 收敛后改 UI 才安全；命名收敛与领域决策一起做）。**风险**：高——打卡/分析主链路，需 parity-probe 全流程手测 + 每勾选时序回归。
- **验收**：Network 面板首屏 ≤5 请求、打勾 0 额外 stats 请求；快速切换视图/账号无陈旧闪现；postpone 后天梯/甘特/弹窗三处日期同步；`useEazo().loading` 真实化或删死分支。

### Phase 4 · 打磨（随需）
i18n 补齐（auth-modal 37 串起）、骨架屏家族、侧栏折叠语义、落地页版本徽标真实化、快捷键遮罩抑制、`--duration` 全局替换。

---

## 7. 决策请求（实施前需确认）

1. **复习节点**（P0-7）：删 UI 宣传（低成本）还是落库实现（+迁移）？
2. **`/history`**：并入 `?view=plans` 后旧 URL 是 redirect 还是保留只读页？
3. **Dialog/Sheet**：品牌化改造还是废弃收敛到 `ui/modal`？
4. **Phase 顺序**是否按 P0→清理→设计→架构执行，还是先做某个业务优先的局部？
