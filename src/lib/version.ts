/**
 * 拾级（Gradus）版本管理与比对工具
 *
 * 三条版本轴，互不相干，改动前先看清自己在动哪一条：
 *
 * 1. 产品版本 PRODUCT_VERSION —— Web 端产品版本，落地页徽章 / 页脚 / 分享卡显示它。
 *    真源是 package.json 的 version，两者必须相等，由 src/lib/version.test.ts 守卫。
 *    每次发版都要改（package.json + 本文件）。
 * 2. 客户端版本 CURRENT_APP_VERSION —— Android / 全平台客户端的 GitHub Releases
 *    更新通道版本，用于「发现新版本」提示。
 *    ⚠️ 只在发布客户端安装包时 +1。误改会让所有客户端弹更新提示。
 * 3. 文档版本 —— docs/PRD.md 顶部版本行，PRD 实质改版时才动。
 */

/** 产品版本（唯一真源与 package.json 的 version 保持一致） */
export const PRODUCT_VERSION = "2.1.0";

/** 客户端（Android / 全平台）更新通道版本 —— 只在发客户端包时 +1 */
export const CURRENT_APP_VERSION = "1.0.0";

/**
 * 清洗版本字符串，移除前导 'v'、空格及预发布后缀
 */
export function cleanVersion(v?: string): string {
  if (!v) return "0.0.0";
  return v.trim().replace(/^v/i, "").split("-")[0];
}

/**
 * 比较两个语义化版本号
 * @returns 1 如果 v2 > v1 (表示有新版本), -1 如果 v1 > v2, 0 如果相等
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = cleanVersion(v1).split(".").map((n) => parseInt(n, 10) || 0);
  const parts2 = cleanVersion(v2).split(".").map((n) => parseInt(n, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p2 > p1) return 1;
    if (p2 < p1) return -1;
  }
  return 0;
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * 格式化发布日期
 */
export function formatReleaseDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}
