/**
 * 会员中心全局入口注册表（FB-10）
 *
 * 之前用模块级 handler：handler 在 useEffect 里注册，**注册之前**的点击会被
 * `console.warn` 吞掉，界面毫无反应 —— 用户第一次点「会员与容量」以为按钮坏了。
 *
 * 现在改成「先记下意图，注册时补开」：
 *   · 未注册时把目标页签存进 pendingTab
 *   · 注册时立刻把 pendingTab 执行掉
 *
 * 纯逻辑，不含 React，便于单测。
 */

export type MembershipModalTab = "overview" | "redeem" | "tiers" | "manage";

type OpenMembershipHandler = (tab?: MembershipModalTab) => void;

let handler: OpenMembershipHandler | null = null;
let pendingTab: MembershipModalTab | null = null;
let pendingRequested = false;

export function registerOpenMembership(next: OpenMembershipHandler | null): void {
  handler = next;
  if (!handler) return;
  if (pendingRequested) {
    pendingRequested = false;
    const tab = pendingTab;
    pendingTab = null;
    handler(tab ?? undefined);
  }
}

/**
 * 打开会员中心。
 * @returns true = 已立即打开；false = 入口尚未就绪，已记下意图（注册后会自动打开）
 */
export function openMembershipModal(tab?: MembershipModalTab): boolean {
  if (handler) {
    handler(tab);
    return true;
  }
  pendingTab = tab ?? null;
  pendingRequested = true;
  return false;
}

/** 测试用：重置注册表 */
export function resetMembershipRegistry(): void {
  handler = null;
  pendingTab = null;
  pendingRequested = false;
}
