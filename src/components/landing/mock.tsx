import { Card } from "@/components/ui/card";
import { CheckBox } from "@/components/ui/check-box";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { BLOOM_CONFIG, bloomChromatic } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

/**
 * 行三态与复选框 / 甘特条共用设计说明 §3 的同一套语言。
 * level = Bloom 认知层级，决定层级色（时间色谱 · BLOOM_CHROMATIC）。
 */
const ROWS = [
  { state: "done", level: 1, title: "假名与发音定型", hours: "1.5h/天", days: 2 },
  { state: "live", level: 3, title: "核心动词变形 40 组", hours: "2h/天", days: 3 },
  { state: "todo", level: 4, title: "敬语与书面表达入门", hours: "2.5h/天", days: 3 },
  { state: "todo", level: 5, title: "N3 真题模考与复盘", hours: "3h/天", days: 4 },
] as const;

/**
 * 甘特条落格沿用 landing.css 的 9 列 × 3 行网格：
 * 原 `--r / --s / --c` 三个自定义属性 → `grid-row` 与 `grid-column: start / span n`。
 * `min-h-[10px]` 是为了让 1fr 行有确定基准 —— 原 `.bar{height:100%}` 在
 * 无固定高度的网格里会坍缩成 0，这里显式补齐设计稿的 10px 条高。
 *
 * 色条颜色 = 认知层级（时间色谱），与接续排期视图同源；今天所在列淡朱砂底。
 */
const BARS = [
  { key: "done", level: 1, cls: "row-start-1 [grid-column:1/span_4]" },
  { key: "live", level: 3, cls: "row-start-2 [grid-column:3/span_4]" },
  { key: "plan", level: 5, cls: "row-start-3 [grid-column:6/span_3]" },
] as const;

/** 今天所在列（9 列里的第 6 列） */
const TODAY_COL = 6;

/**
 * Hero 右侧产品界面 mockup —— 《品牌与产品设计说明》§2.2（原 `.mock*`）：
 * 白卡 + 浏览器条 + 新目标输入行 + 四行子任务 + 三行甘特。
 * 纯展示、不可交互，因此输入行与「开始规划」都是静态排版的 div/span。
 *
 * 视觉与产品内四个视图（时间色谱）对齐：认知色轨 + 彩色 L 标签 + 层级色甘特条。
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
        <Mono className="ml-3 text-micro text-text-3">gradus / 今日面板</Mono>
      </div>

      <div className="p-[22px]">
        <Eyebrow kind="label">NEW GOAL</Eyebrow>

        <div className="flex h-[52px] items-center justify-between gap-3 rounded-field border border-bd-field bg-cream-light pr-1.5 pl-4 text-body-lg">
          三个月内通过日语 N3 考试
          <span className="rounded-[9px] bg-ink px-4 py-2.5 text-body font-bold whitespace-nowrap text-cream">
            开始规划
          </span>
        </div>

        <ul className="mt-[18px] flex flex-col">
          {ROWS.map((row) => {
            const config = BLOOM_CONFIG[row.level as keyof typeof BLOOM_CONFIG];
            const color = bloomChromatic(row.level);
            return (
              <li
                key={row.title}
                className="grid grid-cols-[8px_18px_minmax(0,1fr)_auto] items-center gap-[11px] border-b border-bd-card py-2.5 last:border-0"
              >
                <span className="h-9 w-2" style={{ background: color }} aria-hidden="true" />
                <CheckBox
                  state={row.state}
                  size={15}
                  tabIndex={-1}
                  className="rounded-chip-sm"
                />
                <span
                  className={cn(
                    "truncate text-body font-medium",
                    row.state === "done" &&
                      "text-text-3 line-through decoration-bd-check",
                  )}
                >
                  {row.title}
                </span>
                <span className="flex flex-none items-baseline gap-2">
                  <b className="text-micro font-bold whitespace-nowrap" style={{ color }}>
                    L{row.level} {config.name}
                  </b>
                  <Mono className="text-micro whitespace-nowrap text-text-3">{row.hours}</Mono>
                </span>
              </li>
            );
          })}
        </ul>

        {/* 甘特：底层日期格（今天列淡朱砂）+ 上层色条，两层网格几何一致，条与格严格对齐 */}
        <div className="relative mt-[18px] rounded-icon border border-bd-card bg-cream-light p-3">
          <div className="grid grid-cols-[repeat(9,minmax(0,1fr))] grid-rows-[repeat(3,1fr)] gap-[7px]" aria-hidden="true">
            {Array.from({ length: 27 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "min-h-[10px] rounded-[5px] bg-transparent",
                  i % 9 === TODAY_COL - 1 && "bg-error-soft",
                )}
              />
            ))}
          </div>
          <div className="absolute inset-3 grid grid-cols-[repeat(9,minmax(0,1fr))] grid-rows-[repeat(3,1fr)] gap-[7px]">
            {BARS.map((bar) => (
              <span
                key={bar.key}
                className={cn("min-h-[10px] rounded-[5px]", bar.cls)}
                style={{ background: bloomChromatic(bar.level) }}
              />
            ))}
          </div>
        </div>
        <p className="mt-2 font-mono text-micro tracking-[.06em] text-text-3">
          甘特条颜色 = 认知层级 · 淡朱砂列为今天
        </p>
      </div>
    </Card>
  );
}
