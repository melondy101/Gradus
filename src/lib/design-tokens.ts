// ─── Gradus Centralized Design Token System (Warm Precision) ────────────

// Centralized JS token accessor — reads CSS variables at runtime
export function tokens() {
  if (typeof window === "undefined") return STATIC_TOKENS;
  const s = getComputedStyle(document.documentElement);
  const get = (v: string) => s.getPropertyValue(v).trim();
  return {
    bg:          get("--background") || "#FAFAF8",
    surface:     get("--card") || "#FFFFFF",
    soft:        get("--secondary") || "#F4F4F5",
    line:        get("--border") || "#E4E4E7",
    ink:         get("--foreground") || "#18181B",
    muted:       get("--muted-foreground") || "#71717A",
    accent:      get("--accent") || "#4F46E5",
    accentSoft:  get("--accent-soft") || "rgba(79, 70, 229, 0.08)",
    success:     get("--success") || "#059669",
    warning:     get("--warning") || "#D97706",
    error:       get("--error") || "#DC2626",
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
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  soft: "#F4F4F5",
  line: "#E4E4E7",
  ink: "#18181B",
  muted: "#71717A",
  accent: "#4F46E5",
  accentSoft: "rgba(79, 70, 229, 0.08)",
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",
  bloom: ["#94A3B8", "#60A5FA", "#34D399", "#FBBF24", "#F97316", "#EC4899"] as [
    string,
    string,
    string,
    string,
    string,
    string
  ],
} as const;

// ─── T Object using CSS variables for inline styles ──────────────────
export const T = {
  // Dual-theme surfaces
  bg:        "var(--background, #FAFAF8)",
  surface:   "var(--card, #FFFFFF)",
  soft:      "var(--secondary, #F4F4F5)",
  line:      "var(--border, #E4E4E7)",
  ink:       "var(--foreground, #18181B)",
  muted:     "var(--muted-foreground, #71717A)",
  subtle:    "var(--muted-foreground, #71717A)",
  
  // Brand accents & functional colors
  accent:     "var(--accent, #4F46E5)",
  accentSoft: "var(--accent-soft, rgba(79, 70, 229, 0.08))",
  accentHover:"var(--color-accent-hover, #4338CA)",
  green:      "var(--success, #059669)",
  sage:       "#4F46E5",
  lavender:   "#818CF8",
  paper:      "var(--secondary, #F4F4F5)",
  
  // Functional Status
  success:   "var(--success, #059669)",
  warning:   "var(--warning, #D97706)",
  error:     "var(--error, #DC2626)",
  info:      "#60A5FA",
  orange:    "var(--warning, #D97706)",
  yellow:    "var(--warning, #D97706)",
  purple:    "var(--accent, #818CF8)",
  blue:      "#60A5FA",
  highlight: "var(--accent-soft, rgba(79, 70, 229, 0.08))",
} as const;

// ─── Bloom Taxonomy Progressive Cognitive Palette ────────────────────
export const BLOOM_CONFIG = {
  1: { level: 1, name: "识记", nameEn: "Remember", color: "var(--bloom-1, #94A3B8)", bg: "rgba(148, 163, 184, 0.12)", border: "var(--bloom-1, #94A3B8)" },
  2: { level: 2, name: "理解", nameEn: "Understand", color: "var(--bloom-2, #60A5FA)", bg: "rgba(96, 165, 250, 0.12)", border: "var(--bloom-2, #60A5FA)" },
  3: { level: 3, name: "应用", nameEn: "Apply", color: "var(--bloom-3, #34D399)", bg: "rgba(52, 211, 153, 0.12)", border: "var(--bloom-3, #34D399)" },
  4: { level: 4, name: "分析", nameEn: "Analyze", color: "var(--bloom-4, #FBBF24)", bg: "rgba(251, 191, 36, 0.12)", border: "var(--bloom-4, #FBBF24)" },
  5: { level: 5, name: "评估", nameEn: "Evaluate", color: "var(--bloom-5, #F97316)", bg: "rgba(249, 115, 22, 0.12)", border: "var(--bloom-5, #F97316)" },
  6: { level: 6, name: "创造", nameEn: "Create", color: "var(--bloom-6, #EC4899)", bg: "rgba(236, 72, 153, 0.12)", border: "var(--bloom-6, #EC4899)" },
} as const;

export const BLOOM_COLORS: Record<number, string> = {
  1: "var(--bloom-1, #94A3B8)",
  2: "var(--bloom-2, #60A5FA)",
  3: "var(--bloom-3, #34D399)",
  4: "var(--bloom-4, #FBBF24)",
  5: "var(--bloom-5, #F97316)",
  6: "var(--bloom-6, #EC4899)",
};
