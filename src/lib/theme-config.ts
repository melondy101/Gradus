// 拾级 Gradus 主题配置 —— 奶油浅色、深色带与三套低饱和学习配色。
// 色值真源在 src/app/globals.css 的 :root / .dark；这里仅用于风格预览与
// 文案展示，不再向 <html> 写内联变量（避免与样式表打架）。

export type ThemeId = "cream" | "ink" | "forest" | "ocean" | "rose";

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
  forest: {
    id: "forest",
    name: "林间青绿 (Forest)",
    nameEn: "Forest",
    tagline: "浅雾森林 · 青绿重点 · 平静沉浸",
    bg: "#F0F5F1",
    surface: "#FFFFFF",
    soft: "#E6F0E8",
    line: "#CADBCF",
    ink: "#17352A",
    muted: "#557064",
    subtle: "#6D8579",
    accent: "#3E8A63",
    secondaryAccent: "#245C43",
    cardBg: "#FFFFFF",
    border: "#CADBCF",
    badgeBg: "rgba(62, 138, 99, 0.14)",
    badgeText: "#245C43",
    previewGradient: "linear-gradient(135deg, #F0F5F1 0%, #E6F0E8 100%)",
  },
  ocean: {
    id: "ocean",
    name: "静海蓝 (Ocean)",
    nameEn: "Ocean",
    tagline: "雾蓝纸张 · 深海重点 · 清晰专注",
    bg: "#EFF5F8",
    surface: "#FFFFFF",
    soft: "#E4EFF5",
    line: "#C8DAE5",
    ink: "#17364B",
    muted: "#557286",
    subtle: "#6E899A",
    accent: "#287CA8",
    secondaryAccent: "#1F5F82",
    cardBg: "#FFFFFF",
    border: "#C8DAE5",
    badgeBg: "rgba(40, 124, 168, 0.14)",
    badgeText: "#1F5F82",
    previewGradient: "linear-gradient(135deg, #EFF5F8 0%, #E4EFF5 100%)",
  },
  rose: {
    id: "rose",
    name: "晨雾玫瑰 (Rose)",
    nameEn: "Rose",
    tagline: "柔雾粉纸 · 莓果重点 · 温和陪伴",
    bg: "#F8F1F3",
    surface: "#FFFFFF",
    soft: "#F4E7EB",
    line: "#E6CBD3",
    ink: "#482435",
    muted: "#7A5867",
    subtle: "#927080",
    accent: "#B74C70",
    secondaryAccent: "#8E3655",
    cardBg: "#FFFFFF",
    border: "#E6CBD3",
    badgeBg: "rgba(183, 76, 112, 0.14)",
    badgeText: "#8E3655",
    previewGradient: "linear-gradient(135deg, #F8F1F3 0%, #F4E7EB 100%)",
  },
};

/** 历史 4 主题 → 现 2 主题的迁移映射（含早期版本的键值） */
export function normalizeThemeId(raw: string | null | undefined): ThemeId {
  if (raw === "ink" || raw === "linear") return "ink";
  if (raw === "forest" || raw === "ocean" || raw === "rose") return raw;
  return "cream";
}
