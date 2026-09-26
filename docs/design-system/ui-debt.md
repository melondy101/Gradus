# ui-debt.md — UI 债务与签字点议程

> **版本**：v0.2.0 · **日期**：2026-09-26 · 状态：**签字点 ①②③ 已于 2026-09-26 处置（用户委托按推荐方案执行）；S1-S8 建议级留待下轮体检。**
> 来源：独立检查 Agent 体检报告（`audits/2026-09-26-visual-report.md` 阻断 7 已全部修复清零、复检见 `audits/2026-09-26-visual-report-round2.md`）+ 第一层脚本存量基线。
> 规则：建议级与疑似项在此留痕，**不静默丢弃**；争议仲裁写明双方证据交人工裁决。

## 1. 建议级（9 项，来自体检报告，按影响排序）

| # | 位置 | 问题 | 处置 | 归属 |
|---|---|---|---|---|
| S1 | right-panel.tsx:179-187 + ai-inspector.tsx:69 | AI 面板头部与区块各渲染一个「AI REVIEW」眉题，层级冗余 | 待修 | 下轮体检 |
| S2 | app-header.tsx:51 | 顶栏眉题与页内 H1 同文案重复（桌面端） | 待修（移动端已随阻断#1 隐藏） | 下轮体检 |
| S3 | check-box.tsx:27-35、subtask-mark.tsx:55-67、side-nav.tsx:43-73、modal.tsx:130-138、notification-center.tsx:177-203、mobile-tab-bar.tsx:52-77 | 原生 button/a 未声明品牌 focus-visible 环，仅靠全局半强度基座 | 待修（统一补 `focus-visible:outline-2 outline-accent`） | 下轮体检 |
| S4 | timeline-view / ascending-steps-view 空态 | 空态形态三套（裸文本 vs 完整引导），信息量不一致 | 待修（统一走 view-state-card 同族语言） | 下轮体检 |
| S5 | landing hero.tsx:54、final-cta.tsx:37 | 落地页主 CTA 用 default 而非 accent——实现与设计真源一致，疑 design-system.md 契约文字过严 | **签字点 ① 裁决**（与 B1 同一冲突的两面） | 签字点 ① |
| S6 | all-plans-view.tsx:42 | 皇冠图标用 `text-warning` 作装饰，语义借用且主题换装漂移 | 待修（改 text-text-2/3） | 下轮体检 |
| S7 | check-box.tsx:28、icon-button.tsx:15、subtask-mark.tsx:33-34 | `bg-white` 在深色模式不换装（存量债的主题层视觉后果） | 随 R3 存量债清偿归一到 `bg-card` | 存量债 |
| S8 | notification-center.tsx:187-203 | 通知触发器内联自绘（radius 6 / fontSize 12），与相邻控件圆角语言不成档 | 待修（改 IconButton/品牌 Token 类） | 下轮体检 |
| S9 | subscribe-form.tsx:21-25 | Input 手写 className 覆盖达成深底形态——根因是缺 onDark 输入变体 | **签字点 ②+③ 提名**：Input `onDark` 变体补录，或改设计 | 签字点 ②③ |

## 2. 疑似区处置（3 项）

| # | 现象 | 处置 | 说明 |
|---|---|---|---|
| Y1 | 截图左下黑色「N」浮标 | **证伪（环境产物）** | 系 Next.js dev DevTools 指示器；ds-screenshot.mjs 已加 `nextjs-portal{display:none}`，重拍 7 张均无 |
| Y2 | 甘特今日 pill 文字贴左缘 | **已修复** | gantt-chart.tsx:107 加 `px-1.5 text-center`（复检确认居中） |
| Y3 | AI 面板待启动态约 600px 纯黑空底 | **结案（不修，C3 一并裁决）** | 该「空底」是 idle 态的有意留白：AI 面板以流水线状态为主视觉，INTENT→TAVILY→PLAN→VALIDATE 一行即为待启动文案；无规则约束空态信息密度下限（复检员同判）。签字点② C3 裁决不做；若产品后续要引导语，走补录流程新增深底空态形态，不得就地手写 |

## 3. 签字点裁决记录（2026-09-26，用户委托按推荐方案执行）

### 签字点 ① —— 基准确认 ✅
- A. tokens.md v0.2.0 全部 Token 基准确认生效。
- B1. **accent 归属：方案 A** —— 米白底禁用黄按钮（产品壳主操作＝app 墨色、落地页主 CTA＝default 墨色）；深色带（深底卡/深底弹层/页脚深带）内允许作强调 CTA，同屏最多一枚。落地：tokens.md §1、design-system.md Button 条已改写；浅底弹层内 1 处 accent 已改 app（subtask-detail-modal「开始学习」）；深底带 3 处（ai-review-hint-row / ai-entry-detail / 页脚订阅）依此合法保留。
- B2. 档位裁决：**不新增字号/间距档位**。`text-sm`(14px) 等 125 处存量在清偿中逐文件迁移到既有档位（13/15px），由视觉复检把关； tokens.md §7 候选区保留为提名池。

### 签字点 ② —— 入库/废弃 ✅
- C1. 删除 `select.tsx` / `tabs.tsx` / `label.tsx` / `textarea.tsx`（零引用脚手架）✅ 已执行；未来需要时按补录流程重做。
- C2. Input `onDark` 变体 ✅ 已入库（ui/input.tsx + design-system.md），subscribe-form 手写覆盖已替换。
- C3. 深底空态引导：**不做**（Y3 维持书面说明：idle 留白是有意状态设计，无规则约束密度下限；若产品后续要补，走补录流程）。
- C4. Token 清理：删除死别名 `--r-card/--r-field/--r-pill` ✅；其余零引用 Token **保留**并登记理由——shadcn 框架契约（`--card-foreground`/`--secondary-foreground`/`--radius`/`--sidebar-*`/`--chart-*`，删除会偏离 shadcn 主题契约）、阶梯完备性（`--shadow-lg/float`、`--duration-*`/`--ease-*` 为 tokens.md §6 在册档位）、语义储备（`--color-success-soft`/`--color-gantt-live`）。`ds:vars` 每轮仍会列出它们作对照，不视为债务。

### 签字点 ③ —— 缺件 vs 改设计 ✅
- D1. 四个本地 Button 组件处置：`TourHelpButton`（真违规：手写内联按钮）→ 改为 ui Button ghost ✅；`AttrPill`（真违规：color-mix 手写标签）→ 改为组合 ui Tag ✅、其宿主弹层的 accent CTA 改 app ✅；`MiniActionButton` / `CopyCommandButton`（良民：ui 原语薄封装）→ R2 增薄封装豁免条款 + `WRAPPER_ALLOWLIST` 白名单 ✅。imports 基线清零。
- D2. 局部派生变量（`--s`/`--c`/`--g-lab`/`--modal-z`）：R7 增豁免条款（组件内部计算管道，非设计变量），以 vars-baseline 冻结 ✅；新增同类变量须先在 R7 登记前缀。

## 4. 存量债基线（棘轮，只许减不许增）

| 基线 | 冻结值（2026-09-26 v0.2.0 收紧后） | 内容 |
|---|---|---|
| tokens-baseline.json | 1132 处 / 115 文件 | font-size · spacing · color-hex · color-palette · radius · color-rgb（另有 100 处任意值宽高/定位仅记录） |
| imports-baseline.json | **0 处（清零）** | 4 个本地组件已处置：2 个改真（TourHelpButton→ghost、AttrPill→Tag），2 个薄封装入白名单 |
| vars-baseline.json | 6 处 | 局部派生变量（R7 豁免条款覆盖，见 D2） |

清偿路径：新代码零违规 + 逐文件迁移到 Token 档位后 `--write-baseline` 收紧；tokens 清零后基线文件移除。
