# tokens.md — 拾级 Gradus 设计变量清单

> **版本**：v0.2.0 · **日期**：2026-09-26 · **变更摘要**：签字点① 通过——accent 归属按方案 A 裁决（米白底禁黄按钮，深色带内允许作强调 CTA）；v0.1.0 初稿从 7 张核心页面截图（`output/ds-screenshots/`）与令牌真源 `src/app/globals.css` 提炼。
>
> ✅ **状态：基准已确认（签字点 ①，2026-09-26，用户委托按推荐方案执行）。**
>
> 命名规则：`--color-*` / `--radius-*` / `--text-*` / `--shadow-*` / `--space-*`，按 类别-层级 命名。单一真源是 `src/app/globals.css` 的 `:root` / `.dark`；本文件是可读词典，两者由 `bun test`（`src/lib/design-token-parity.test.ts`）与 `ds-check-vars` 双向把关。
>
> 代码引用方式（三选一，优先级从高到低）：
> 1. **Tailwind 语义类**：`bg-accent` / `text-ink` / `rounded-card` / `text-body`（由 `@theme inline` 映射）；
> 2. **CSS 变量**：`var(--accent)`；
> 3. **JS 内联**：`src/lib/design-tokens.ts` 的 `T.accent` / `tokens()`（仅 canvas/SVG/内联 style 场景）。
>
> 本项目有 4 套主题（默认奶油黄 / forest / ocean / rose）+ 深色模式。**代码里一律写语义 Token，禁止写主题的具体值**——同一 Token 在各主题下自动换装。

---

## 1. 颜色 — 品牌面（§1.2 品牌规范）

| Token | 值（浅色/默认主题） | 用途 | 代码引用 | 来源截图 |
|---|---|---|---|---|
| `--color-cream` | `#F5F2EA` | 全局底色（奶油纸） | `bg-cream` / `var(--cream)` | landing-desktop、app-today-desktop |
| `--color-cream-light` | `#FAF8F3` | 次级面：输入框底、soft 卡、chips | `bg-cream-light` | app-today-desktop（输入框、建议 chips）、app-plans-desktop |
| `--color-ink` | `#111111` | 主文字、深底按钮/选中态底 | `text-ink` / `bg-ink` | 全部截图 |
| `--color-accent` | `#F5C518` | 唯一点缀黄：**深色带内强调 CTA（同屏最多一枚）**、进行中状态、强调统计卡、黄句点、深底眉题。**米白底禁用黄按钮**（签字点① 方案A：产品壳常规主操作用 app 墨色，落地页主 CTA 用 default） | `bg-accent` / `text-accent` | app-plans-desktop、probe-ritual-desktop（甘特进行中条、D1）、landing-desktop（句点、页脚深底订阅钮） |
| `--color-accent-deep` | `#E3B40F` | 黄按钮 hover 加深 | `bg-accent-deep` | 交互态（静态截图未定格；来源=品牌说明 §1.2，由 audit:tokens 对设计稿量测） |
| `--color-accent-ink` | `#7A5F00` | 黄柔底上的可读文字（VERIFIED 徽章） | `text-accent-ink` | probe-ritual-desktop（VERIFIED 标签） |
| `--color-accent-bright` | `#FFD740` | 点缀黄 hover 提亮 / 深底校验失败描边 | `bg-accent-bright` | 交互态（设计稿字面量收编，静态截图未定格） |
| `--color-accent-soft` | `rgba(245,197,24,.16)` | 黄柔底（live 徽章、Bloom 顶点底） | `bg-accent-soft` | probe-ritual-desktop（进行中·L4 徽章） |
| `--color-band-dark` | `#0E0D0B` | 深色带：AI 面板、页脚、深底卡 | `bg-band-dark` | app-today-desktop（右侧 AI 面板）、landing-desktop（隐私段、页脚） |
| `--color-card` | `#FFFFFF` | 卡片面 | `bg-card` | 全部截图 |
| `--color-text-2` | `#5E5B53` | 次级文字（可达性修订色） | `text-text-2` | app-today-desktop（说明文字） |
| `--color-text-3` | `#6E6B62` | 三级文字、眉题 | `text-text-3` | landing-desktop（眉题 TODAY/HOW IT WORKS） |
| `--color-on-dark` | `#F5F2EA` | 深底主文字 | `text-on-dark` | app-today-desktop（AI 面板标题） |
| `--color-on-dark-2` | `rgba(245,242,234,.72)` | 深底次级文字 | `text-on-dark-2` | app-today-desktop（AI 面板正文） |
| `--color-on-dark-3` | `rgba(245,242,234,.58)` | 深底弱文字 | `text-on-dark-3` | landing-desktop（页脚说明） |
| `--color-bd-card` | `#E6E1D3` | 卡片描边 | `border-bd-card` | 全部截图 |
| `--color-bd-field` | `#E1DCCF` | 输入框描边 | `border-bd-field` | app-today-desktop（NEW GOAL 输入框） |
| `--color-bd-check` | `#C9C3B2` | 复选框/更强调描边 | `border-bd-check` | probe-ritual-desktop（计划中复选框） |
| `--color-bd-dark` | `#2B2924` | 深色带内描边 | `border-bd-dark` | app-today-desktop（AI 面板分隔线） |

## 2. 颜色 — 语义状态与数据

| Token | 值（浅色） | 用途 | 代码引用 | 来源截图 |
|---|---|---|---|---|
| `--color-success` | `#3F6B2F` | 成功/核查通过文字 | `text-success` | 浮层交互态（静态截图未定格；来源=设计稿评审页） |
| `--color-success-soft` | `rgba(63,107,47,.12)` | 成功柔底 | `bg-success-soft` | 同上 |
| `--color-warning` | `#8A6200` | 警示文字 | `text-warning` | ConfirmDialog danger 层（audit:modals 量测） |
| `--color-warning-soft` | `rgba(245,197,24,.16)` | 警示柔底 | `bg-warning-soft` | 同上 |
| `--color-error` | `#A8331B` | 错误/破坏性文字与描边 | `text-error` / `border-error` | 删除确认浮层（audit:modals 量测） |
| `--color-error-soft` | `rgba(168,51,27,.1)` | 错误柔底 | `bg-error-soft` | 同上 |
| `--color-error-on-dark` | `#E06C4A` | 深底上的校验失败色 | `text-error-on-dark` | 深底浮层校验态 |
| `--color-gantt-done` | `#D8D3C4` | 甘特条-已完成（灰） | `bg-gantt-done` | probe-ritual-desktop（假名与发音定型条） |
| `--color-gantt-live` | `= --accent` | 甘特条-进行中（黄） | `bg-gantt-live` | probe-ritual-desktop（N4 语法收尾条） |
| 甘特-计划中 | 描边虚线框（无独立色） | `border-dashed` + `--bd-check` | probe-ritual-desktop（敬语与书面表达入门条） |
| `--color-bloom-1..6` | `#D8D3C4 → #C9C3B2 → #8A867C → #6E6B62 → #3A3833 → #F5C518` | Bloom 认知层级阶梯（暖灰递进到顶点黄） | `bg-bloom-N` / `T.BLOOM_CONFIG` | probe-ritual-desktop（L2/L4/L5 标注）、app-steps-desktop（天梯台阶） |

> Shadcn 语义映射（`--color-background/-foreground/-primary/-muted/-border/-ring/-popover/-sidebar-*/-chart-*`）全部指向上述品牌 Token（见 globals.css §Shadcn 语义映射），同样可用；`--ring` = 点缀黄，是全局 focus 环。

## 3. 间距梯度（Tailwind 4px 阶）

| Token | 值 | 典型用途 | 代码引用 |
|---|---|---|---|
| `--space-0.5` | 2px | 图标微调 | `p-0.5` / `gap-0.5` |
| `--space-1` | 4px | 图标与文字 | `p-1` |
| `--space-1.5` | 6px | 紧凑 chip 内距 | `px-1.5` |
| `--space-2` | 8px | chip 内距、小卡内距 | `p-2` |
| `--space-2.5` | 10px | 按钮纵向内距 | `py-2.5` |
| `--space-3` | 12px | 卡片内距（紧凑）、列表行距 | `p-3` |
| `--space-4` | 16px | 标准卡内距、块间距 | `p-4` |
| `--space-5` | 20px | 大卡内距 | `p-5` |
| `--space-6` | 24px | 区块间距 | `p-6` |
| `--space-8` | 32px | 区组间距 | `p-8` |
| `--space-10` | 40px | 区段间距 | `p-10` |
| `--space-12` | 48px | 页面级留白 | `p-12` |
| `--space-16` | 64px | 落地页区段 | `py-16` |
| `--space-20` | 80px | 落地页大区段 | `py-20` |
| `--space-24` | 96px | 落地页区段呼吸 | `py-24` |

> 规则：布局间距**只允许上表档位**（Tailwind 数字 utility）。`p-[13px]` 这类任意值 px 是违规（ds-check-tokens 抓）。中间档（如 18px/22px）在存量出现 ≥3 次的，走阶段五提名流程（见 §7 候选区），批准前继续算违规存量。

## 4. 字号梯度（`--text-*`，闸门容差 ±0.5px）

| Token | 值 | 用途 | 代码引用 | 来源截图 |
|---|---|---|---|---|
| `--text-2xs` | 9.5px | 最小脚注/快捷键 | `text-2xs` | app-today-desktop（⌘K 徽标） |
| `--text-micro` | 10px | 深底眉题、meta | `text-micro` | app-today-desktop（AI REVIEW 眉题） |
| `--text-caption` | 11px | 辅助说明、标签 | `text-caption` | app-plans-desktop（卡片说明） |
| `--text-body-sm` | 12px | 紧凑正文、列表 meta | `text-body-sm` | probe-ritual-desktop（资源卡 meta） |
| `--text-body` | 13px | **默认正文** | `text-body` | 全部截图 |
| `--text-body-lg` | 15px | 大正文、输入框文字 | `text-body-lg` | app-today-desktop（输入框） |
| `--text-title-sm` | 17px | 小标题、卡标题 | `text-title-sm` | probe-ritual-desktop（资源卡标题） |
| `--text-title` | 19px | 面板标题 | `text-title` | app-today-desktop（今日面板） |
| 页面大标题/展示字号 | 存量 `text-[22..64px]`（landing hero 等） | **未收编** → 见 §7 候选区 | — | landing-desktop（hero） |

> 存量混用：`text-xs`(12px)/`text-sm`(14px) 等 Tailwind 命名字号共 125 处、任意值 `text-[..px]` 96 处——已冻结进 ds-check-tokens 基线，新代码一律用 `--text-*` 档位。

## 5. 圆角（§1.4：卡片 16 / 输入 12 / 按钮 999）

| Token | 值 | 用途 | 代码引用 | 来源截图 |
|---|---|---|---|---|
| `--radius-card` | 16px | 卡片 | `rounded-card` | 全部截图 |
| `--radius-field` | 12px | 输入框、app 按钮、详情弹层 | `rounded-field` | app-today-desktop（输入框） |
| `--radius-pill` | 999px | 按钮、chip、徽章 | `rounded-pill` | 全部截图 |
| `--radius-chip-sm` | 4px | 小 chip、复选框 | `rounded-chip-sm` | probe-ritual-desktop（复选框） |
| `--radius-tag` | 6px | 标签（VERIFIED）、复选框 | `rounded-tag` | probe-ritual-desktop（VERIFIED） |
| `--radius-tile` | 8px | 小瓷砖/图标容器 | `rounded-tile` | app-today-desktop（快捷键徽标） |
| `--radius-icon` | 10px | 图标按钮 | `rounded-icon` | 侧栏图标钮 |
| `--radius-popover` | 20px | 弹层/浮层 | `rounded-popover` | app-timeline-desktop（引导弹层，截图存档于重拍前版本） |
| shadcn 兼容档 | sm 8 / md 12 / lg 16 / xl 20 / 2xl 24 / full 9999 | 通用兜底 | `rounded-md` 等 | — |

## 6. 阴影与动效

| Token | 值 | 用途 | 来源截图 |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(17,17,17,.04)` | 轻浮起（设计语言「几乎无阴影」） | 全部截图（几乎不可见） |
| `--shadow-md` | `0 14px 30px -16px rgba(17,17,17,.28)` | 下拉/悬浮 | 下拉浮层 |
| `--shadow-lg` | `0 40px 90px -40px rgba(17,17,17,.34)` | 弹层 | app-timeline-desktop（引导弹层） |
| `--shadow-float` | `0 60px 120px -30px rgba(14,13,11,.6)` | 深底 mockup 悬浮 | landing-desktop（首屏右侧 mockup 卡） |
| `--duration-fast/normal/slow` | 120/200/300ms | 过渡时长 | 仅视觉层 |
| `--ease-out` / `--ease-bounce` | cubic-bezier | 缓动曲线 | 仅视觉层 |
| 字体 | `--font-sans` = Noto Sans SC 栈；`--font-mono` = JetBrains Mono 栈（眉题/meta/快捷键专用） | `font-sans` / `font-mono` | landing-desktop（mono 眉题）、app-today-desktop（TODAY/NEW GOAL） |

## 7. 孤例与候选区（不入库，待签字点 ② 轻量版裁决）

> 提炼规则：值出现 ≥2 次或明显系统级才收进 Token；以下是**未收编的存量重复值**，由 ds-check-tokens/usage 统计自动提名，人工批准后才升格。

| 候选值 | 出现次数（存量） | 建议归宿 |
|---|---|---|
| `text-sm`（14px） | 44 处 | 提名 `--text-body-md: 14px`，或迁到 `--text-body-lg`(15px) |
| `text-[10px]/[11px]` | 38 处 | 迁移到既有 `--text-micro` / `--text-caption`（不需新 Token） |
| 任意值间距 `gap-[5px]/[7px]/[9px]`、`py-[5px]/[7px]/[9px]` 等 | 78 处 | 多数可就近归档到 4/6/8px 档；确需保留的提名 `--space-2.5` 已存在档位复用 |
| 展示字号 `text-[22/24/26/28/30/38/40/44/64px]` | 14 处 | 提名展示梯度 `--text-display-sm/md/lg`（landing hero 用） |
| 一次性颜色散值 | 见 `scripts/color-baseline.json` | 由 audit:colors 棘轮管理，清零后收紧 |

## 8. 覆盖率自检（阶段一验收门：≥90%）

- 截图可见样式的归类结果：**色彩**——全部落在 §1/§2 的 24 个语义 Token（4 套主题换装不产生新值）；**圆角**——9 档全覆盖；**字号**——正文档位全覆盖，展示字号 14 处进候选区；**间距**——档位内全覆盖，78 处任意值进候选区/基线。
- 未达 100% 的差额全部集中在 §7 候选区与冻结基线，无「静默裸值」。
- 结论：**Token 覆盖截图可见样式约 93%（估算），满足 ≥90% 验收门（已随签字点 ① 于 2026-09-26 确认生效）**。
