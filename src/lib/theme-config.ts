export type ThemeId = "sage" | "linear" | "paper" | "nordic";

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
  sage: {
    id: "sage",
    name: "温润竹青 (Sage Warm)",
    nameEn: "Calm Sage",
    tagline: "极简温润 · 竹青素雅 · 专注心流",
    bg: "#FAFAF8",
    surface: "#FFFFFF",
    soft: "#F4F3EF",
    line: "#EDECEA",
    ink: "#1A1A1A",
    muted: "#6B6B6B",
    subtle: "#9CA3AF",
    accent: "#4A7C6F", // Sage Green
    secondaryAccent: "#C4841D", // Warm Amber
    cardBg: "#FFFFFF",
    border: "#EDECEA",
    badgeBg: "#EBF3F0",
    badgeText: "#3D6B5F",
    previewGradient: "linear-gradient(135deg, #FAFAF8 0%, #F4F3EF 100%)",
  },
  linear: {
    id: "linear",
    name: "深邃夜幕 (Linear Dark)",
    nameEn: "Linear Focus",
    tagline: "极客夜空 · 熏衣草蓝 · 护眼专注",
    bg: "#0F1114",
    surface: "#171920",
    soft: "#1E2028",
    line: "#2D2F38",
    ink: "#F1F2F4",
    muted: "#8B8F9A",
    subtle: "#5C6070",
    accent: "#7C8CF5", // Lavender-Blue
    secondaryAccent: "#FBBF24", // Golden Amber
    cardBg: "#171920",
    border: "#2D2F38",
    badgeBg: "#222738",
    badgeText: "#9AA4F7",
    previewGradient: "linear-gradient(135deg, #0F1114 0%, #1E2028 100%)",
  },
  paper: {
    id: "paper",
    name: "和纸素墨 (Paper Minimal)",
    nameEn: "Wabi-Sabi Paper",
    tagline: "质感和纸 · 赭墨相映 · 诗性学习",
    bg: "#FBF9F4",
    surface: "#FFFFFF",
    soft: "#F4F0E6",
    line: "#E6E2D8",
    ink: "#1C1B1A",
    muted: "#7A7771",
    subtle: "#9C9890",
    accent: "#2F5D50",
    secondaryAccent: "#D96B43",
    cardBg: "#FFFFFF",
    border: "#E8E4DA",
    badgeBg: "#F0ECE2",
    badgeText: "#2F5D50",
    previewGradient: "linear-gradient(135deg, #FBF9F4 0%, #F4F0E6 100%)",
  },
  nordic: {
    id: "nordic",
    name: "极简纯白 (Nordic Studio)",
    nameEn: "Nordic Daylight",
    tagline: "清爽白调 · 钴蓝点缀 · 明快利落",
    bg: "#F8F9FA",
    surface: "#FFFFFF",
    soft: "#F1F3F5",
    line: "#E4E7EB",
    ink: "#09090B",
    muted: "#64748B",
    subtle: "#94A3B8",
    accent: "#2563EB",
    secondaryAccent: "#059669",
    cardBg: "#FFFFFF",
    border: "#E2E8F0",
    badgeBg: "#EFF6FF",
    badgeText: "#1D4ED8",
    previewGradient: "linear-gradient(135deg, #F8F9FA 0%, #E2E8F0 100%)",
  },
};
