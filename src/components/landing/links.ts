// ─── Landing 共用链接常量 ──────────────────────────────────────────────
// 落地页里所有「进产品」的入口都指向 /app（App 外壳在 src/app/app/page.tsx）；
// 外链仓库地址出自《品牌与产品设计说明》§2.3，替换正式仓库只需改这一处。

/** 产品应用入口：落地页 → /app */
export const APP_URL = "/app";

/** GitHub 仓库（设计稿占位地址） */
export const REPO_URL = "https://github.com/huang-yi-dae/TalkTask";

/** 仓库地址的展示文案 */
export const REPO_LABEL = "github.com/huang-yi-dae/TalkTask";

/** What's New 深色卡「复制部署命令」写入剪贴板的内容 */
export const DEPLOY_COMMAND =
  "git clone https://github.com/huang-yi-dae/TalkTask.git && cd TalkTask && bun install && bun run db:migrate && bun run dev";
