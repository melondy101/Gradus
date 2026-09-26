# rules.md — 拾级 Gradus UI 强制规则

> **版本**：v0.2.0 · **日期**：2026-09-26 · **变更摘要**：签字点①②③ 落地——R2 增薄封装豁免（含白名单）、R7 增局部派生变量豁免；accent 归属按方案 A 裁决（见 tokens.md §1 与 design-system.md Button 条）。
>
> ✅ **状态：基准已确认（签字点 ①，2026-09-26，用户委托按推荐方案执行）。**
>
> 违反任一条 = 代码不合格，**必须重写，不允许解释**。每条规则标注执行方式：
> - 🤖 `ds-check-*`：确定性脚本（exit code 判定）；
> - 👁 仅视觉层：归独立检查 Agent（阶段三第二层），无法脚本化。
>
> 修改本规则 = 规则变更：须同步改对应脚本并在体检报告显式声明（硬边界）。

## R1 组件来源白名单 🤖 ds-check-imports

UI 原语**只能**从 `src/components/ui/` 深路径具名导入（如 `import { Button } from "@/components/ui/button"`）：
- 导入的标识符必须是目标文件的真实导出（打错名即违规）；
- `ui/` 下无 barrel，禁止 `from "@/components/ui"`；
- 图标统一 `lucide-react` 具名导入。

## R2 禁止页面级私有原语组件 🤖 ds-check-imports

`ui/` 之外（home/task/landing/layout/app…）**不得定义**手写样式语言的一次性 UI 原语
（裸 button/span 自绘按钮、标签、弹层等）。

**薄封装豁免（签字点②③ 2026-09-26 批准）**：仅组合 `ui/` 原语、不含自有样式语言的组件
（如 `MiniActionButton`＝IconButton 24px 形态、`CopyCommandButton`＝Button+剪贴板逻辑、
`AttrPill`＝Tag+语义色文字、`TourHelpButton`＝Button ghost 入口）不算私有原语；名单登记在
`ds-check-imports.mjs` 的 `WRAPPER_ALLOWLIST`，增删须走本规则修订。

- 缺组件 → 走阶段四补录流程（设计 → 实现 → 文档 → 人工签字点 ②）；
- 设计不合理 → 改设计回到现有组件能表达的范围（签字点 ③）；
- 禁止第三种处理：就地手写一次性组件或内联样式。

## R3 禁止硬编码色值 🤖 ds-check-tokens

`src/components/**` 与 `src/app/**` 内禁止裸 `#RRGGBB`、`rgb()/rgba()`、Tailwind 默认调色板色类（`bg-white`、`text-black`、`bg-slate-*` 等）。
- 唯一豁免：`var(--x, #hex)` 形式的 SSR 回退（回退值必须等于 globals.css 浅色值，由 `bun test` 的 design-token-parity 把关）；
- 取色三途径（优先级）：Tailwind 语义类 > `var(--token)` > `T.*`（design-tokens.ts，仅 canvas/SVG/内联）；
- 存量债冻结在 `scripts/ds-check/tokens-baseline.json`（棘轮：只许减不许增）。

## R4 禁止裸字号 🤖 ds-check-tokens

字号只允许 tokens.md §4 的 `--text-*` 档位（Tailwind 类 `text-2xs/micro/caption/body-sm/body/body-lg/title-sm/title`）：
- 禁止 `text-[13px]` 等任意值字号；
- 禁止 Tailwind 默认命名字号 `text-xs/sm/base/lg/xl/2xl…`（存量冻结，新代码禁用）；
- 展示字号（landing hero）在 §7 候选区获批前沿用冻结基线，不得新增档位外值。

## R5 布局间距只允许梯度档位 🤖 ds-check-tokens

间距只允许 tokens.md §3 的档位（Tailwind 数字 utility：`p/gap/m/w/h` 等 × {0.5,1,1.5,2,2.5,3,4,5,6,8,10,12,16,20,24}）：
- 禁止 `p-[13px]`、`gap-[9px]` 等任意值间距；
- 档位外的整数值（如 `p-7`）视同违规（存量冻结）；
- 宽高/定位尺寸不在本条范围（组件固有尺寸），但任意值 px 一律记录。

## R6 禁止裸圆角 🤖 ds-check-tokens

圆角只允许 tokens.md §5 档位：`rounded-card/field/pill/chip-sm/tag/tile/icon/popover` 及 shadcn 兼容档（sm/md/lg/xl/2xl/full）。禁止 `rounded-[10px]` 任意值。

## R7 CSS 变量必须注册 🤖 ds-check-vars

源码中出现的每个 `var(--x)`，`x` 必须在 `globals.css`（真源）注册；使用未注册变量 = 违规。
**局部派生变量豁免（签字点③ 2026-09-26）**：组件内部计算管道用的带前缀局部变量
（甘特 `--s`/`--c`/`--g-lab`、弹层 `--modal-z`）不是设计变量，以 vars-baseline 冻结视为已豁免；
新增同类变量须先在本条登记命名前缀。反向输出（零引用注册 Token）记入阶段五废弃候选，不阻断。

## R8 主题安全 👁 仅视觉层 + 🤖 ds-check-vars

任何 UI 不得写死主题具体值（4 主题 + 深色模式自动换装）。脚本层由 R3/R7 兜底；「同一 Token 在某主题下对比度不足」类问题归独立检查 Agent。

## R9 Token 单一真源一致 🤖（复用既有闸门）

`globals.css` ↔ `src/lib/design-tokens.ts` ↔ `src/lib/theme-config.ts` 三方逐条一致由 **`bun test`（src/lib/design-token-parity.test.ts）** 与 **`bun run audit:tokens`** 把关——本体系不重复造轮子，体检报告直接引用其结果。

## R10 组件场景匹配 👁 仅视觉层

组件用法必须符合 design-system.md 的「适用/禁止场景」（如 AI 面板必须 `tone="dark"`、黄 accent 变体不得用于产品壳常规按钮、黄字眉题仅深底带）。归独立检查 Agent。

## R11 交互态完整 👁 仅视觉层

可交互元素必须有 hover / focus-visible（全局 ring=点缀黄）/ disabled 态；列表/面板必须设计空态与错误态。归独立检查 Agent。

## R12 对齐与留白节奏、层级关系 👁 仅视觉层

间距遵循 §3 档位节奏、同组元素对齐、信息层级（眉题→标题→正文→meta）清晰。归独立检查 Agent。

## 脚本清单

| 脚本 | 覆盖规则 | 命令 |
|---|---|---|
| `scripts/ds-check/ds-check-tokens.mjs` | R3 R4 R5 R6 | `bun run ds:tokens` |
| `scripts/ds-check/ds-check-imports.mjs` | R1 R2 | `bun run ds:imports` |
| `scripts/ds-check/ds-check-vars.mjs` | R7 R8(脚本侧) | `bun run ds:vars` |
| `scripts/ds-check/ds-report.mjs` | 汇总 + 存档 | `bun run ds:report` |
| （复用）`bun test` / `audit:tokens` | R9 | 既有命令 |

## 体检流程（阶段三）

1. 第一层：依次跑 `ds:tokens / ds:imports / ds:vars`，全部 exit 0 才进第二层；非 0 当场修复重跑（存量超基线同违规）。
2. 第二层：独立检查 Agent（与编码者分离，只给 rules.md / tokens.md / design-system.md / 脚本输出 / 截图 / 代码）出报告，严重度两档（阻断/建议），Agent 无权降档。
3. 阻断 → 修复并复检；建议 → 记 `ui-debt.md`；疑似 → 修复或书面说明，随报告存档。
4. 每轮报告存档于 `docs/design-system/audits/`。**签字点 ① 未过前，全部结果标注 provisional。**
