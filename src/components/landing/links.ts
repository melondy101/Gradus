// ─── Landing 共用链接常量 ──────────────────────────────────────────────
// 落地页里所有「进产品」的入口都指向 /app（App 外壳在 src/app/app/page.tsx）；
// 外链仓库地址出自《品牌与产品设计说明》§2.3，替换正式仓库只需改这一处。

/** 产品应用入口：落地页 → /app */
export const APP_URL = "/app";

export function appViewUrl(view: "plans" | "timeline"): string {
  return `${APP_URL}?view=${view}`;
}

/** GitHub 仓库（设计稿占位地址） */
export const REPO_URL = "https://github.com/melondy101/Gradus";

/** 仓库地址的展示文案 */
export const REPO_LABEL = "github.com/melondy101/Gradus";
