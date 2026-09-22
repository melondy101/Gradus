// 拾级 Gradus 主题配置 —— 只有两套：奶油浅色（品牌默认）与深色带反推
// 色值真源在 src/app/globals.css 的 :root / .dark；这里仅用于风格预览与
// 文案展示，不再向 <html> 写内联变量（避免与样式表打架）。

export type ThemeId = "cream" | "ink";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  nameEn: string;
  tagline: string;
  bg: string;
  surface: string;
  soft: string;
  line: string;
  ink: string;
  muted: string;
  subtle?: string;
  accent: string;
  secondaryAccent: string;
  cardBg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  previewGradient: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  cream: {
    id: "cream",
    name: "拾级奶油 (Cream)",
    nameEn: "Gradus Cream",
    tagline: "暖奶油底 · 近黑文字 · 单一点缀黄",
    bg: "#F5F2EA",
    surface: "#FFFFFF",
    soft: "#FAF8F3",
    line: "#E6E1D3",
    ink: "#111111",
    muted: "#5E5B53",
    subtle: "#6E6B62",
    accent: "#F5C518",
    secondaryAccent: "#3A3833",
    cardBg: "#FFFFFF",
    border: "#E6E1D3",
    badgeBg: "rgba(245, 197, 24, 0.16)",
    badgeText: "#7A5F00",
    previewGradient: "linear-gradient(135deg, #F5F2EA 0%, #FAF8F3 100%)",
  },
  ink: {
    id: "ink",
    name: "墨黑深色带 (Ink)",
    nameEn: "Gradus Ink",
    tagline: "深色带语言 · 黄字眉题 · 护眼专注",
    bg: "#0E0D0B",
    surface: "#17150F",
    soft: "#17150F",
    line: "#2B2924",
    ink: "#F5F2EA",
    muted: "rgba(245, 242, 234, 0.72)",
    subtle: "rgba(245, 242, 234, 0.58)",
    accent: "#F5C518",
    secondaryAccent: "#8A867C",
    cardBg: "#17150F",
    border: "#2B2924",
    badgeBg: "rgba(245, 197, 24, 0.16)",
    badgeText: "#7A5F00",
    previewGradient: "linear-gradient(135deg, #0E0D0B 0%, #17150F 100%)",
  },
};

/** 历史 4 主题 → 现 2 主题的迁移映射（含早期 Eazo/AutoTask 时期的键值） */
export function normalizeThemeId(raw: string | null | undefined): ThemeId {
  if (raw === "ink" || raw === "linear") return "ink";
  return "cream";
}
