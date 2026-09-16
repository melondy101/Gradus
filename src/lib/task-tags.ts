/**
 * 任务标签系统辅助模块
 * 提供预设标签、标签解析、颜色映射与清理工具
 */

export const PRESET_TAGS = [
  "编程",
  "文学",
  "理科",
  "语言",
  "社科",
  "艺术",
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

// 常见标签色彩语义映射
const TAG_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  编程: {
    bg: "rgba(59, 130, 246, 0.12)",
    text: "#2563EB",
    border: "rgba(59, 130, 246, 0.28)",
    dot: "#3B82F6",
  },
  文学: {
    bg: "rgba(217, 119, 6, 0.12)",
    text: "#B45309",
    border: "rgba(217, 119, 6, 0.28)",
    dot: "#D97706",
  },
  理科: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.28)",
    dot: "#10B981",
  },
  语言: {
    bg: "rgba(139, 92, 246, 0.12)",
    text: "#7C3AED",
    border: "rgba(139, 92, 246, 0.28)",
    dot: "#8B5CF6",
  },
  社科: {
    bg: "rgba(234, 88, 12, 0.12)",
    text: "#C2410C",
    border: "rgba(234, 88, 12, 0.28)",
    dot: "#EA580C",
  },
  艺术: {
    bg: "rgba(236, 72, 153, 0.12)",
    text: "#DB2777",
    border: "rgba(236, 72, 153, 0.28)",
    dot: "#EC4899",
  },
};

const DEFAULT_COLOR_PALETTES = [
  { bg: "rgba(99, 102, 241, 0.12)", text: "#4F46E5", border: "rgba(99, 102, 241, 0.28)", dot: "#6366F1" },
  { bg: "rgba(20, 184, 166, 0.12)", text: "#0D9488", border: "rgba(20, 184, 166, 0.28)", dot: "#14B8A6" },
  { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706", border: "rgba(245, 158, 11, 0.28)", dot: "#F59E0B" },
  { bg: "rgba(168, 85, 247, 0.12)", text: "#9333EA", border: "rgba(168, 85, 247, 0.28)", dot: "#A855F7" },
];

/**
 * 校验并清理单个标签字符串
 */
export function cleanTag(tag: string): string {
  return tag.trim().replace(/[\[\]"',]/g, "").slice(0, 20);
}

/**
 * 安全解析任务标签
 * 支持 JSON 字符串、普通逗号分隔字符串、数组以及 null/undefined
 */
export function parseTaskTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .filter((x): x is string => typeof x === "string")
          .map(cleanTag)
          .filter((s) => s.length > 0)
      )
    );
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parseTaskTags(parsed);
        }
      } catch {
        // 非法 JSON 则降级为分隔符解析
      }
    }
    const parts = trimmed.split(/[,，、|\s]+/);
    return Array.from(
      new Set(parts.map(cleanTag).filter((s) => s.length > 0))
    );
  }
  return [];
}

/**
 * 序列化标签数组为存储字符串 (JSON)
 */
export function serializeTaskTags(tags: string[]): string {
  const cleanList = Array.from(
    new Set(tags.map(cleanTag).filter((s) => s.length > 0))
  );
  return JSON.stringify(cleanList);
}

/**
 * 根据标签名称获取一致的颜色样式
 */
export function getTagStyle(tag: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const trimmed = tag.trim();
  if (TAG_COLOR_MAP[trimmed]) {
    return TAG_COLOR_MAP[trimmed];
  }
  // 根据 tag 字符串计算哈希，稳定映射调色板
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DEFAULT_COLOR_PALETTES.length;
  return DEFAULT_COLOR_PALETTES[idx];
}
