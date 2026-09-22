// ─── 拾级 Gradus 设计令牌（品牌 §1.2 / §1.3 / §1.4）─────────────────────
// 单一真源是 src/app/globals.css 的 :root / .dark；这里只做两层读取：
//   1) tokens()  —— 运行时 getComputedStyle，供 canvas/SVG 需要真实色值的场景
//   2) T         —— CSS var 表达式，供内联 style 使用（随主题切换自动跟随）

// Centralized JS token accessor — reads CSS variables at runtime
export function tokens() {
  if (typeof window === "undefined") return STATIC_TOKENS;
  const s = getComputedStyle(document.documentElement);
  const get = (v: string) => s.getPropertyValue(v).trim();
  return {
    bg:          get("--cream") || "#F5F2EA",
    surface:     get("--card") || "#FFFFFF",
    soft:        get("--cream-light") || "#FAF8F3",
    line:        get("--bd-card") || "#E6E1D3",
    ink:         get("--ink") || "#111111",
    muted:       get("--text-2") || "#5E5B53",
    subtle:      get("--text-3") || "#6E6B62",
    accent:      get("--accent") || "#F5C518",
    accentSoft:  get("--accent-soft") || "rgba(245, 197, 24, 0.14)",
    band:        get("--dark") || "#0E0D0B",
    success:     get("--success") || "#3F6B2F",
    warning:     get("--warning") || "#8A6200",
    error:       get("--error") || "#A8331B",
    bloom: [1, 2, 3, 4, 5, 6].map((i) => get(`--bloom-${i}`)) as [
      string,
      string,
      string,
      string,
      string,
      string
    ],
  } as const;
}

// Static fallback for SSR (before hydration)
export const STATIC_TOKENS = {
  bg: "#F5F2EA",
  surface: "#FFFFFF",
  soft: "#FAF8F3",
  line: "#E6E1D3",
  ink: "#111111",
  muted: "#5E5B53",
  subtle: "#6E6B62",
  accent: "#F5C518",
  accentSoft: "rgba(245, 197, 24, 0.14)",
  band: "#0E0D0B",
  success: "#3F6B2F",
  warning: "#8A6200",
  error: "#A8331B",
  bloom: ["#D8D3C4", "#C9C3B2", "#8A867C", "#6E6B62", "#3A3833", "#F5C518"] as [
    string,
    string,
    string,
    string,
    string,
    string
  ],
} as const;

// ─── T：内联 style 用的 CSS 变量表达式 ─────────────────────────────────
// ⚠ 保持 `var(--x, 回退值)` 形态：回退值必须与 globals.css 浅色一致，
//   这样即使变量尚未注入（首帧 SSR）也不会出现品牌外的颜色。
export const T = {
  // 表面与文字
  bg:        "var(--cream, #F5F2EA)",
  surface:   "var(--card, #FFFFFF)",
  soft:      "var(--cream-light, #FAF8F3)",
  line:      "var(--bd-card, #E6E1D3)",
  ink:       "var(--ink, #111111)",
  muted:     "var(--text-2, #5E5B53)",
  subtle:    "var(--text-3, #6E6B62)",

  // 深色带（AI 模块、页脚、隐私区块共用同一语言）
  band:      "var(--dark, #0E0D0B)",
  onDark:    "var(--on-dark, #F5F2EA)",
  onDark2:   "var(--on-dark-2, rgba(245,242,234,.72))",
  onDark3:   "var(--on-dark-3, rgba(245,242,234,.58))",
  lineDark:  "var(--bd-dark, #2B2924)",

  // 唯一点缀黄
  accent:      "var(--accent, #F5C518)",
  accentDeep:  "var(--accent-deep, #E3B40F)",
  accentInk:   "var(--accent-ink, #7A5F00)",
  accentSoft:  "var(--accent-soft, rgba(245,197,24,.14))",
  accentHover: "var(--color-accent-hover, #E3B40F)",
  highlight:   "var(--accent-soft, rgba(245,197,24,.14))",

  // 描边三态
  lineField: "var(--bd-field, #E1DCCF)",
  lineCheck: "var(--bd-check, #C9C3B2)",

  // 功能状态
  success: "var(--success, #3F6B2F)",
  warning: "var(--warning, #8A6200)",
  error:   "var(--error, #A8331B)",
  info:    "var(--text-2, #5E5B53)",

  // 甘特条三态（灰=已完成 / 黄=进行中 / 描边=计划）
  ganttDone: "#D8D3C4",
  ganttLive: "var(--accent, #F5C518)",

  // 迁移期别名：历史代码里的旧命名统一收敛到品牌值
  paper:   "var(--cream-light, #FAF8F3)",
  sage:    "var(--ink, #111111)",
  lavender: "var(--accent, #F5C518)",
  purple:  "var(--ink, #111111)",
  blue:    "var(--accent, #F5C518)",
  orange:  "var(--accent-deep, #E3B40F)",
  yellow:  "var(--accent, #F5C518)",
  green:   "var(--success, #3F6B2F)",
} as const;

// ─── Bloom 认知层级：暖灰阶梯递进到顶点黄 ──────────────────────────────
export const BLOOM_CONFIG = {
  1: { level: 1, name: "识记", nameEn: "Remember", color: "var(--bloom-1, #D8D3C4)", bg: "rgba(216, 211, 196, 0.28)", border: "var(--bloom-1, #D8D3C4)" },
  2: { level: 2, name: "理解", nameEn: "Understand", color: "var(--bloom-2, #C9C3B2)", bg: "rgba(201, 195, 178, 0.28)", border: "var(--bloom-2, #C9C3B2)" },
  3: { level: 3, name: "应用", nameEn: "Apply", color: "var(--bloom-3, #8A867C)", bg: "rgba(138, 134, 124, 0.20)", border: "var(--bloom-3, #8A867C)" },
  4: { level: 4, name: "分析", nameEn: "Analyze", color: "var(--bloom-4, #6E6B62)", bg: "rgba(110, 107, 98, 0.18)", border: "var(--bloom-4, #6E6B62)" },
  5: { level: 5, name: "评估", nameEn: "Evaluate", color: "var(--bloom-5, #3A3833)", bg: "rgba(58, 56, 51, 0.16)", border: "var(--bloom-5, #3A3833)" },
  6: { level: 6, name: "创造", nameEn: "Create", color: "var(--bloom-6, #F5C518)", bg: "rgba(245, 197, 24, 0.18)", border: "var(--bloom-6, #F5C518)" },
} as const;

export const BLOOM_COLORS: Record<number, string> = {
  1: "var(--bloom-1, #D8D3C4)",
  2: "var(--bloom-2, #C9C3B2)",
  3: "var(--bloom-3, #8A867C)",
  4: "var(--bloom-4, #6E6B62)",
  5: "var(--bloom-5, #3A3833)",
  6: "var(--bloom-6, #F5C518)",
};
