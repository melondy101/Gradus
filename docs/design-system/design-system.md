# design-system.md — 拾级 Gradus 组件清单

> **版本**：v0.2.0 · **日期**：2026-09-26 · **变更摘要**：签字点①②③ 落地——Button accent 归属按方案 A 收紧；Input 增 `onDark` 变体；删除 4 个未接线脚手架组件（select/tabs/label/textarea）；UserBadge 增 `compact` 形态。
>
> ✅ **状态：基准已确认（签字点 ①，2026-09-26，用户委托按推荐方案执行）。**
>
> 强制约定：
> - UI 原语**只能**从 `@/components/ui/<file>` 深路径具名导入（本目录**无 barrel**，禁止新建 `ui/index.ts`）；
> - 每个文件只导出一个组件（`card.tsx` 的子件、`input.tsx` 家族、`select.tsx` 家族按既有家族约定豁免）；
> - 页面/功能目录（home/task/landing/layout…）**禁止**就地定义一次性 UI 原语或重复造已有组件（ds-check-imports 抓）；
> - 样式一律引用 tokens.md 的 Token（Tailwind 语义类优先），禁止裸值（ds-check-tokens 抓）；
> - 图标统一 `import { X } from "lucide-react"` 具名导入（无封装层，53 处既成事实）。

## 1. 组件总览

| 组件 | 导出 | 文件 | 一句话用途 | 典型截图区 |
|---|---|---|---|---|
| Button | `Button` `buttonVariants` | button.tsx | 全部按钮（9 变体 × 9 尺寸） | landing hero、侧栏「新建计划」 |
| Card 家族 | `Card` `CardHeader` `CardTitle` `CardDescription` `CardAction` `CardContent` `CardFooter` | card.tsx | 白卡/深底卡/soft 卡 | 今日面板各卡、AI 面板 |
| Stat | `Stat` `StatRow` | stat.tsx | 统计卡（含强调黄/深底变体） | 侧栏「本周进度」、详情「总体进度」 |
| Badge / Tag | `Badge` `Tag` | badge.tsx | 状态徽章（live/done/plan） | 详情「进行中·L4」、VERIFIED |
| Chip / ChipRow | `Chip` `ChipRow` | chip.tsx | 筛选/建议 chips（可选中） | 建议输入、全部/仅待完成 |
| CheckBox | `CheckBox` `CheckMark` `CheckState` | check-box.tsx | 三态复选（todo/live/done） | 子任务清单 |
| Input 家族 | `Input` `Textarea` `SearchField` | input.tsx | 输入框/文本域/搜索框 | NEW GOAL、⌘K 搜索、页脚订阅 |
| Modal | `Modal` `ModalProps` | modal.tsx | 7 层弹层（z 阶梯 100→400） | 新手引导、新建目标 |
| ConfirmDialog | `ConfirmDialog` | confirm-dialog.tsx | 确认/危险二次确认 | 删除确认 |
| Eyebrow / Mono | `Eyebrow` `Mono` | eyebrow.tsx | mono 大写眉题/等宽 meta | TODAY、NEW GOAL、AI REVIEW |
| Heading | `Heading` | heading.tsx | 标题（hero/sec/sub/page + 黄句点） | 各面板标题、落地 hero |
| IconButton / Avatar | `IconButton` `Avatar` | icon-button.tsx | 方形图标钮 / 圆形头像 | 侧栏折叠钮、访客头像 |
| AiPill | `AiPill` | ai-pill.tsx | 深底 AI 状态浮标 | 「AI 建议复核未验证资源 1/2」 |
| GradusLogo | `GradusLogo` | gradus-logo.tsx | 品牌 logo（可带字标） | 顶栏、页脚 |
| Toaster | `Toaster` | sonner.tsx | 全局 toast（底部居中） | 交互反馈 |

> 2026-09-26 签字点② 删除：`select.tsx` / `tabs.tsx` / `label.tsx` / `textarea.tsx`（零引用脚手架，见文末「已删除组件」）。现存 15 文件 / 20 导出。

## 2. 逐组件契约

### Button — `import { Button } from "@/components/ui/button"`
- 底层：`@base-ui/react` useRender，支持 `render` 合成。
- props：`variant?: "default"|"outline"|"secondary"|"ghost"|"destructive"|"link"|"accent"|"app"|"cream"|"onDark"`（默认 `"default"`＝墨底奶油字）；`size?: "default"|"xs"|"sm"|"lg"|"icon"|"icon-xs"|"icon-sm"|"icon-lg"|"full"`（默认 `"default"`）；其余透传 button 属性。
- 适用：一切可点击动作。产品壳内主操作用 `variant="app"`（圆角 field、h-11）；落地页主 CTA 用 `default`（墨色）；深色带（深底卡/深底弹层/页脚深带）内的强调 CTA 用 `accent`——**同屏最多一枚**。
- 禁止（签字点① 方案A，2026-09-26）：**米白底上使用 `accent` 黄按钮**（产品壳与落地页浅底区一律墨色系）；用 `disabled` 之外的 DIY 灰化手段。

### Card — `import { Card } from "@/components/ui/card"`
- props：`size?: "default"|"sm"`；`tone?: "base"|"dark"|"soft"`（默认 base＝白卡 bd-card 描边；dark＝band-dark 深底；soft＝cream-light）。
- 子件：`CardHeader/CardTitle/CardDescription/CardAction/CardContent/CardFooter`（data-slot 组合）。
- 适用：一切面板容器。AI 面板/深底卡必须用 `tone="dark"`，禁止手写 `bg-band-dark` 裸卡。
- 禁止：嵌套超过两层 Card；在 Card 上叠自定义阴影（阴影 Token 只有 4 档）。

### Stat — `import { Stat } from "@/components/ui/stat"`
- props：`label: string`（必填）；`value: ReactNode`（必填）；`tone?: "base"|"accent"|"dark"`；`unit?: string`；`foot?: ReactNode`。
- 适用：单指标统计卡；连续指标用 `StatRow`。
- 禁止：把强调黄 `tone="accent"` 用在非关键指标上（品牌规范：黄只出现在强调统计卡等五处）。

### Badge / Tag — `import { Badge, Tag } from "@/components/ui/badge"`
- props：Badge `state?: "live"|"done"|"plan"`（默认 plan）、`onDark?: boolean`；Tag 透传 span。
- 适用：任务/子任务状态徽章（live=黄柔底、done=墨底、plan=描边）；Tag 用于资源可信度（VERIFIED / SEARCH ONLY）等中性小标签。
- 禁止：用 Badge 表达语义状态色（success/warning/error 属于表单/浮层校验，不属于任务状态）。

### Chip / ChipRow — `import { Chip, ChipRow } from "@/components/ui/chip"`
- props：`selected?: boolean`（受控选中＝墨底奶油字）＋ button 属性；`ChipRow` 横向滚动容器。
- 适用：筛选器、建议输入、视图切换。
- 禁止：当链接用（跳转用 Button link 变体）； ChipRow 里塞非 Chip 元素。

### CheckBox — `import { CheckBox } from "@/components/ui/check-box"`
- props：`state?: "todo"|"live"|"done"`（默认 todo）；`size?: number`（默认 20px）。
- 适用：子任务打卡（todo=描边、live=黄描边、done=墨底白勾）。
- 禁止：用原生 `<input type=checkbox>` 替代；用颜色变体表达 state 之外的含义。

### Input / Textarea / SearchField — `import { Input, SearchField } from "@/components/ui/input"`
- props：`size?: "default"|"lg"`（lg=h-14 与 app 按钮同高）；`invalid?: boolean`（错误描边，深底自动切 `--error-on-dark`）；`onDark?: boolean`（深色带输入：白雾底 + 深带描边 + 聚焦点缀黄，签字点② 2026-09-26 新增）；SearchField `icon?/trailing?: ReactNode`。
- 适用：一切文本输入。深底输入（页脚订阅等）必须用 `onDark`，禁止手写 className 覆盖深底语言。移动端 16px 兜底由 globals.css 全局处理，组件内不要再写字号。
- 禁止：裸写 `border`/`bg` 覆盖品牌输入语言；错误态用 `invalid` 而不是手写红描边。

### Modal — `import { Modal } from "@/components/ui/modal"`
- props：`open: boolean`；`onClose`；`title?/eyebrow?/icon?/footer?`；`width?=720`；`layer?: "newTask"|"drawer"|"detail"|"confirm"|"ritual"|"danger"|"milestone"`（默认 detail，z 阶梯 100→400）；`placement?: "center"|"bottom"`；`busy?: boolean`。
- 适用：一切浮层。手写 portal（非 base-ui），7 层 z 序保证弹层叠弹层不穿模。
- 禁止：绕过 layer 体系手写 fixed 浮层；在 Modal 里再塞 portal。

### ConfirmDialog — `import { ConfirmDialog } from "@/components/ui/confirm-dialog"`
- props：`open`（必填）；`onClose/onConfirm`；`title: string`；`message?/hint?`；`confirmLabel?="确认"` `cancelLabel?="取消"`；`destructive?: boolean`；`layer?: "confirm"|"danger"`。
- 适用：一切破坏性/不可逆操作确认。
- 禁止：用 `window.confirm`；把非破坏操作放进 danger 层。

### Eyebrow / Mono — `import { Eyebrow, Mono } from "@/components/ui/eyebrow"`
- props：`kind?: "eyebrow"|"label"|"meta"`；`tone?: "base"|"accent"|"muted"`（accent=点缀黄，仅深底带可用）。
- 适用：mono 大写字母间距眉题（TODAY / NEW GOAL / AI REVIEW）、等宽 meta。
- 禁止：中文正文用 Mono（等宽栈只覆盖拉丁与数字）；浅底上用 accent 眉题（黄字在奶油底不达对比度，仅深底带豁免）。

### Heading — `import { Heading } from "@/components/ui/heading"`
- props：`level?: 1|2|3`（默认 2，映射 h1/h2/h3）；`spec?: "hero"|"sec"|"sub"|"page"`（默认 sec）；`accentDot?: boolean`（句号黄点）。
- 适用：全部标题。品牌句号黄点（标题结尾的「。」 accent）只能通过 `accentDot` 获得。
- 禁止：裸 h 标签 + 手写字号；在同屏用两个以上 hero。

### IconButton / Avatar — `import { IconButton, Avatar } from "@/components/ui/icon-button"`
- props：IconButton `haspip?: boolean` ＋ button 属性；Avatar `name?: string`（默认「访客」）、`size?: number`（默认 34）。
- 适用：纯图标操作钮（折叠/关闭/主题切换）、用户头像。
- 禁止：IconButton 里塞文字（那是 Button sm/xs）。

### UserBadge（feature 组件，非 ui/）— `import { UserBadge } from "@/components/user-profile/user-badge"`
- props：`compact?: boolean`（默认 false）。
- 适用：侧栏底部账户入口（完整形态：图标+名称+等级徽章）；顶栏等窄容器用 `compact`（仅图标/首字母，含 focus-visible 环）。2026-09-26 体检阻断#1/#2 后新增。
- 禁止：在窄容器用完整形态（390px 下会挤裁品牌字标）。

### AiPill — `import { AiPill } from "@/components/ui/ai-pill"`
- props：`label: string`（必填）；`stage?: string`；`spinning?: boolean`（默认 true）；`live?: boolean`。
- 适用：AI 流水线状态浮标（深底 pill，黄 accent）。
- 禁止：非 AI 场景复用（普通提示用 Toaster）。

### GradusLogo / Toaster — 常规用法，无变体；`Toaster` 全局挂载一次（layout 已装），业务代码只调 `sonner` 的 `toast()`。

### 已删除组件（签字点②，2026-09-26）
- `select.tsx` / `tabs.tsx` / `label.tsx` / `textarea.tsx`：全仓零引用、样式未接品牌令牌的脚手架残留（textarea.tsx 曾与 input.tsx 的 `Textarea` 重名），已从 `src/components/ui/` 删除。若未来需要 Select/Tabs，按阶段四补录流程重新实现并接品牌令牌。

## 3. 布局与页面级语言（引用而非组件）

- 产品壳四视图路由：`/app?view=today|plans|steps|timeline`（page.tsx 只做壳，取数在组件）。
- 浮层 z 阶梯：Modal layer 100→400；toast/浮标在其上。
- 探针页：`/task/parity-probe`（`?ritual=<phase>` / `?overlay=<name>`）用固定样例渲染屏二/屏三版面，是**无数据库环境下的实测入口**。
