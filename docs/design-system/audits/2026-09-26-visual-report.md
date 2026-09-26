# 独立检查 Agent 视觉体检报告（第二层）

> 检查人：独立 sub-agent（与编码者分离，仅凭 rules.md / tokens.md / design-system.md / 第一层脚本输出 / 7 张截图 / 页面代码）
> 日期：2026-09-26 · **PROVISIONAL（签字点①未签，基准未经人工确认）**
> 本文件为检查 Agent 报告原文存档，编码 Agent 无权修改其结论与严重度。

---

PROVISIONAL（签字点①未签，基准未经人工确认）

## 阻断级

| 位置（截图文件名或 file:line） | 问题 | 违反的 Token/规则（引用 tokens.md 或 rules.md 编号） | 修复动作 | 严重度 |
|---|---|---|---|---|
| app-today-mobile.png 顶栏（放大可见：铃铛钮内「消息通知」四字竖排逐字换行、上下被裁切） | 移动端顶栏 NotificationCenter 未传 `collapsed`，触发器内联 `width:"100%"` + 常显「消息通知」label 在 32px 高按钮里竖排溢出，文字被裁剪 | rules.md R12（对齐与留白节奏、层级）；视觉破损 | 移动端顶栏改传 `collapsed`（仅图标）或换 IconButton 化触发器；触发器去掉 `width:"100%"`（notification-center.tsx:193-222、app-header.tsx:80） | 阻断 |
| app-today-mobile.png 顶栏左缘（放大可见：三枚台阶标识后仅剩半个「拾」字，「级」整体被裁） | 品牌字标被左侧容器 `overflow-hidden` 裁切——右侧 4 个操作件（搜索/通知/主题/登录注册宽 pill）挤占空间，logo Link `shrink-0` 之外的字标溢出被剪 | rules.md R12；视觉破损 | 移动端收窄右侧簇（登录钮收成图标/头像）或允许品牌行收缩换行，保证字标完整（app-header.tsx:41-49、76-83） | 阻断 |
| app-today-mobile.png NEW GOAL 卡（放大可见：输入框被压至约 1/3 宽，占位文本「三个月内通过」后半截断；黑色按钮反而占近半宽） | 输入行 `flex` 无响应式堆叠：390px 视口下 Button size="lg" 固定宽，`flex-1 min-w-0` 的输入框被挤扁致文本截断，首屏主入口比例失衡 | rules.md R12；视觉破损 | 移动端改为纵向堆叠（input 全宽 + 按钮全宽），或按钮降为 icon 形态（goal-card.tsx:54-74） | 阻断 |
| app-today-mobile.png 底部（放大可见：TabBar 上缘露出一截黑色圆角块、无任何文字） | 移动端「AI 规划面板」悬浮按钮 `fixed bottom-[22px] z-40` 被 `z-50`、高约 56px+safe-area 的底部 TabBar 整体盖住，仅顶弧外露，入口不可见不可辨 | rules.md R12；组件契约 design-system.md §3「浮层 z 阶梯保证不穿模」被破坏 | 移动端将 AI 入口 `bottom` 抬到 TabBar 之上（≥56px+safe-area）或并入 TabBar/抽屉（right-panel.tsx:121-135 vs mobile-tab-bar.tsx:35-40） | 阻断 |
| app-plans-desktop.png 页头「新增学习目标」+ 空态卡「立即创建第一个计划」 | 产品壳内使用 `variant="accent"` 黄按钮，且同屏出现两枚（button.tsx:47 自注释「一个界面里最多出现一次」亦被违反）；对照组：侧栏「新建计划」正确使用 `variant="app"`（icon-rail.tsx:110） | rules.md R10 + design-system.md Button「禁止：在 app 壳里用落地页专属的 accent/cream 变体冒充产品按钮」（all-plans-view.tsx:45、71） | 改为 `variant="app"`（页头）与 outline/secondary（空态次 CTA）；同时在签字点①裁决 tokens.md §1 将该按钮列为 accent 来源与 design-system.md 的冲突 | 阻断 |
| app-timeline-desktop.png 图例区（「常规任务」＝实心黄方块、「未开始」＝黄虚线框） | 图例与实际渲染不符：条色实际按 Bloom 层级取 `bloom.color`（timeline-gantt-row.tsx:148；bloom-1..5 为暖灰、仅 L6 是黄），行内从无虚线条；且与紧邻说明「色条对应认知层级深度」自相矛盾，也与 tokens.md §2「甘特-计划中＝bd-check 灰虚线」不符 | rules.md R12（信息层级清晰）；tokens.md §2 甘特三态定义 | 重写图例为 Bloom 阶梯色（或改为与实现一致的编码说明）；删除「未开始」虚线项（timeline-view.tsx:74-92） | 阻断 |
| probe-ritual-desktop.png 右下（放大可见：AiPill「AI 建议复核未验证资源 1 / 2」压住「完成此项」右半与「稍后」按钮大部） | 右下悬浮 AiPill（fixed z-40）与吸顶详情面板底部主操作按钮行重叠，遮挡可点击区域；注释自述「58px 净空」只给了内容列底部，吸顶卡的按钮行未避让 | rules.md R12（层级混乱：浮层压住交互件）；design-system.md §3 浮层语言 | 为吸顶面板底部按钮行预留 pill 高度净空，或将 AiPill 改为不与按钮行重叠的落点（task-detail-screen.tsx:135、subtask-inspector.tsx:87-105） | 阻断 |

## 建议级

| 位置（截图文件名或 file:line） | 问题 | 违反的 Token/规则（引用 tokens.md 或 rules.md 编号） | 修复动作 | 严重度 |
|---|---|---|---|---|
| app-today-desktop.png 右栏（放大可见同一面板内出现两次「AI REVIEW」黄眉题：面板头 + 流水线区块各一） | AI 面板头部与 AiInspector 区块各渲染一个相同眉题，层级冗余 | rules.md R12（层级关系）；eyebrow.tsx tone="accent" 用法本身合规（深底） | 二者留一：面板头保留「AI 分析面板」，区块内 eyebrow 改为状态性文案（right-panel.tsx:179-187、ai-inspector.tsx:69） | 建议 |
| app-today-desktop.png 顶栏「今日面板」眉题 + 页内 H1「今日面板」 | 面包屑与页标题同文案紧邻重复，四视图同构 | rules.md R12 | 顶栏改显示上下文信息（如标签过滤/返回）或直接移除顶栏文案（app-header.tsx:51） | 建议 |
| check-box.tsx:27-35、subtask-mark.tsx:55-67、side-nav.tsx:43-73、modal.tsx:130-138、notification-center.tsx:177-203、mobile-tab-bar.tsx:52-77 | 上述原生 button/a 均未声明品牌 focus-visible 环，仅靠 globals.css:453-456 `* { outline-ring/50 }` 的半强度基座；与 Button/Chip/IconButton 的全强度点缀黄环（button.tsx:12）不一致 | rules.md R11（focus-visible＝全局 ring 点缀黄） | 为可交互元素统一补 `focus-visible:outline-2 outline-accent`，或抽公共类 | 建议 |
| app-timeline-desktop.png（卡内仅一行灰字「暂无时间轴数据」）、app-steps-desktop.png（虚线卡内单行文字） | 空态形态三套：today（眉题+标题+说明+动作钮）、plans（图标+标题+说明+CTA）、timeline/steps（裸文本），信息量与引导力不一致 | rules.md R11（空态）、R12 | 空态统一走 today-list-empty / view-state-card 同族语言，timeline/steps 补引导 CTA（timeline-view.tsx:177-181、ascending-steps-view.tsx:132-135） | 建议 |
| landing-desktop.png hero 与页尾 CTA 行（均为墨色主按钮） | 落地页主 CTA 实际用 `variant="default"`（hero.tsx:54、final-cta.tsx:37），与 design-system.md Button 适用条款「落地页主 CTA 用 accent」文字不符；实现与设计真源一致，疑契约文字过严 | rules.md R10（文档-实现出入，方向与阻断#5 相反） | 在签字点①统一裁决 accent 变体的归属场景，修订 design-system.md 或实现 | 建议 |
| app-plans-desktop.png「会员与容量」钮内皇冠图标 | 图标用 `text-warning`（#8A6200，tokens.md §2 定义为警示文字色）作装饰图标，语义借用且主题换装后会漂移 | tokens.md §2（warning 用途＝警示文字）；R8 | 皇冠改中性色（text-text-2/text-text-3）或入库存专属 token（all-plans-view.tsx:42） | 建议 |
| check-box.tsx:28、icon-button.tsx:15、subtask-mark.tsx:33-34（`bg-white`） | 深色模式下（.dark `--card:#17150F`）复选框/图标钮仍为纯白不换装——冻结存量债（R3）在主题层的视觉后果 | rules.md R8（主题安全，视觉层）；存量债不重复立项，只报后果 | 存量债清偿时将 `bg-white` 归一到 `bg-card`（globals.css .dark 段） | 建议 |
| app-today-desktop.png 侧栏底部簇（放大可见「消息通知」行圆角明显小于相邻搜索框/主题钮） | NotificationCenter 触发器为内联样式自绘（radius 6、fontSize 12、shadcn 变量），与相邻 12px/10px 圆角控件语言不成档，一处簇内三种圆角 | rules.md R12；tokens.md §5 圆角档位 | 触发器改用 IconButton/品牌 Token 类（notification-center.tsx:187-203） | 建议 |
| landing-desktop.png 页脚订阅输入框（深底白雾底、聚焦黄描边） | Input 被手写 className 覆盖 bg/border/focus（subscribe-form.tsx:21-25）达成深底形态，违反 Input「禁止裸写 border/bg 覆盖品牌输入语言」；根因是缺 onDark 输入变体 | design-system.md Input 禁止条款；rules.md R2（缺组件走补录流程） | 提名 Input `onDark` 变体进签字点②补录，替换散落覆盖 | 建议 |

## 疑似区

| 位置 | 现象描述 | 为何无法归入具体规则 |
|---|---|---|
| 全部 7 张截图左下角（landing-desktop 中段、四张 app 桌面图侧栏登录卡上、probe 左下、mobile TabBar「今日」上均有一枚黑色圆形「N」浮标，压住下层元素） | 代码中不存在对应的全局悬浮头像/浮标组件（Avatar 仅在 share-card-modal 与 icon-button.tsx 定义，无 fixed 挂载）；形态与 Next.js dev 模式 DevTools 指示器一致，疑为开发模式截图的环境产物而非应用缺陷 | 源码无此元素，无法对应任何规则条目；需生产构建（`bun run build && bun start`）复拍同一组截图即可证伪/证实 |
| probe-ritual-desktop.png 甘特表头（放大可见「六」字贴黄色今日 pill 左缘，pill 右侧大片留白） | 今日单元格 `rounded-tag py-[5px]` 无水平内距、无 text-center（gantt-chart.tsx:102-114），文字贴圆角左缘；其余表头同样贴左但无底色不显眼，黄底放大了不对齐感 | 说不清是「表头左对齐语言」还是缺陷：无对应规则条目禁止表头文字贴左，但视觉上黄底 pill 的文字重心明显偏移 |
| app-today-desktop.png / app-plans-desktop.png / app-steps-desktop.png / app-timeline-desktop.png 右栏 AI 面板待启动态（INTENT→TAVILY→PLAN→VALIDATE 一行之下约 600px 纯黑空底） | 待启动态信息密度极低且无引导文案，视觉上像未加载完成而非有意留白；AiInspector 有 idle 态但未给深底空态内容 | 「待启动留白」本身是合理状态设计，无规则约束空态信息密度下限；但与左侧内容屏的丰富度落差明显，是否补引导语属产品判断 |

---

结论：阻断级 7 / 建议级 9 / 疑似 3（全部结论为 provisional，随签字点①基准确认后生效；阻断项修复后需本层复检）。
