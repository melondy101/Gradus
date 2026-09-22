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

// 标签取色（《品牌与产品设计说明》§1.4）：标签本身是中性奶油药丸，
// 唯一的色彩区分交给左侧小圆点，圆点复用 Bloom 暖灰阶梯（越高越深、
// 顶点为品牌黄），避免为标签另起一套外来色相。
// 只用 bloom-3 以上的深色阶：bloom-1/2 在 cream 底上几乎看不见。
const TAG_DOTS: Record<string, string> = {
  编程: "var(--bloom-5)",
  文学: "var(--accent-deep)",
  理科: "var(--bloom-3)",
  语言: "var(--bloom-4)",
  社科: "var(--text-3)",
  艺术: "var(--bloom-6)",
};

const FALLBACK_DOTS = ["var(--bloom-3)", "var(--bloom-4)", "var(--bloom-5)", "var(--bloom-6)"];

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
 * 根据标签名称获取稳定的小圆点颜色
 */
export function getTagColor(tag: string): string {
  const trimmed = tag.trim();
  if (TAG_DOTS[trimmed]) {
    return TAG_DOTS[trimmed];
  }
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_DOTS[Math.abs(hash) % FALLBACK_DOTS.length];
}
