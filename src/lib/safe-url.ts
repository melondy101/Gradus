/**
 * safe-url.ts（客户端）
 *
 * 打开外部链接前的协议白名单校验，防止 DOM-based XSS。
 *
 * 资源链接来自 AI 生成 / 外部检索，不完全可信。若某条 url 是
 * `javascript:...` / `data:...` / `vbscript:...`，直接 window.open 会
 * 在当前源执行脚本。这里只放行 http/https，其余一律拒绝。
 */

/** 判断是否是可安全在新标签打开的外部链接（仅 http/https） */
export function isSafeExternalUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  if (rawUrl.trim() === "") return false;
  try {
    const u = new URL(rawUrl, window.location.origin);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 安全地在新标签打开外部链接。
 * - 仅当 url 通过 http/https 白名单时才打开
 * - 强制 noopener,noreferrer,避免被打开页反向操控 opener
 * @returns 是否实际打开
 */
export function openExternalUrl(rawUrl: string | null | undefined): boolean {
  if (!isSafeExternalUrl(rawUrl)) return false;
  window.open(rawUrl as string, "_blank", "noopener,noreferrer");
  return true;
}
