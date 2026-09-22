import { Card } from "@/components/ui/card";
import { CheckBox } from "@/components/ui/check-box";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

/** 行三态与复选框 / 甘特条共用设计说明 §3 的同一套语言 */
const ROWS = [
  { state: "done", title: "假名与发音定型", meta: "L1 · 2 天" },
  { state: "live", title: "核心动词变形 40 组", meta: "L3 · 3 天" },
  { state: "todo", title: "敬语与书面表达入门", meta: "L4 · 3 天" },
  { state: "todo", title: "N3 真题模考与复盘", meta: "L5 · 4 天" },
] as const;

/**
 * 甘特条落格沿用 landing.css 的 9 列 × 3 行网格：
 * 原 `--r / --s / --c` 三个自定义属性 → `grid-row` 与 `grid-column: start / span n`。
 * `min-h-[10px]` 是为了让 1fr 行有确定基准 —— 原 `.bar{height:100%}` 在
 * 无固定高度的网格里会坍缩成 0，这里显式补齐设计稿的 10px 条高。
 */
const BARS = [
  { key: "done", cls: "row-start-1 [grid-column:1/span_4] bg-gantt-done" },
  { key: "live", cls: "row-start-2 [grid-column:3/span_4] bg-accent" },
  {
    key: "plan",
    cls: "row-start-3 [grid-column:6/span_3] hairline border-dashed border-bd-check",
  },
] as const;

/**
 * Hero 右侧产品界面 mockup —— 《品牌与产品设计说明》§2.2（原 `.mock*`）：
 * 白卡 + 浏览器条 + 新目标输入行 + 四行子任务 + 三行甘特。
 * 纯展示、不可交互，因此输入行与「开始规划」都是静态排版的 div/span。
 */
export function HeroMock({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "gap-0 p-0 shadow-[0_44px_88px_-34px_rgba(17,17,17,.3)]",
        className,
      )}
    >
      <div className="flex h-[38px] items-center gap-[7px] border-b border-bd-card bg-cream-light px-4">
        <i className="size-[9px] rounded-full bg-bd-check" />
        <i className="size-[9px] rounded-full bg-bd-check" />
        <i className="size-[9px] rounded-full bg-bd-check" />
        <Mono className="ml-3 text-[10px] text-text-3">gradus / 今日面板</Mono>
      </div>

      <div className="p-[22px]">
        <Eyebrow kind="label">NEW GOAL</Eyebrow>

        <div className="flex h-[52px] items-center justify-between gap-3 rounded-field border border-bd-field bg-cream-light pr-1.5 pl-4 text-[15px]">
          三个月内通过日语 N3 考试
          <span className="rounded-[9px] bg-ink px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-cream">
            开始规划
          </span>
        </div>

        <ul className="mt-[18px] flex flex-col gap-0.5">
          {ROWS.map((row) => (
            <li
              key={row.title}
              className="grid grid-cols-[18px_1fr_auto] items-center gap-[11px] border-b border-dashed border-bd-card px-1 py-2.5 last:border-0"
            >
              <CheckBox
                state={row.state}
                size={15}
                tabIndex={-1}
                className="rounded-[4px]"
              />
              <span
                className={cn(
                  "text-[13.5px] font-medium",
                  row.state === "done" &&
                    "text-text-3 line-through decoration-bd-check",
                )}
              >
                {row.title}
              </span>
              <Mono className="text-[10px] text-text-3">{row.meta}</Mono>
            </li>
          ))}
        </ul>

        <div className="mt-[18px] grid grid-cols-[repeat(9,minmax(0,1fr))] grid-rows-[repeat(3,1fr)] gap-[7px] rounded-[10px] border border-bd-card bg-cream-light p-3">
          {BARS.map((bar) => (
            <span
              key={bar.key}
              className={cn("min-h-[10px] rounded-[5px] bg-transparent", bar.cls)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
