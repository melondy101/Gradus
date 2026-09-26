"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Sparkles,
  Ticket,
  CheckCircle2,
  Clock,
  Layers,
  Bot,
  Sliders,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Zap,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/auth-shim";
import {
  fetchUserMembership,
  redeemCode,
  type MembershipResponse,
} from "@/lib/api/membership";
import { TIER_CONFIGS, type MembershipTier } from "@/lib/membership/tiers";
import { CodeManagerTab } from "./code-manager-tab";
import { useSessionUser } from "@/lib/auth-shim";
import { isAdminUser } from "@/lib/auth/admin-shared";
import { Modal } from "@/components/ui/modal";

export type MembershipModalTab = "overview" | "redeem" | "tiers" | "manage";

interface Props {
  open: boolean;
  initialTab?: MembershipModalTab;
  onClose: () => void;
}

export function MembershipModal({
  open,
  initialTab = "overview",
  onClose,
}: Props) {
  const user = useSessionUser((s) => s.auth.user);
  const isAdmin = isAdminUser(user);

  const [activeTab, setActiveTab] = useState<MembershipModalTab>(
    initialTab === "manage" && !isAdmin ? "overview" : initialTab,
  );
  const [data, setData] = useState<MembershipResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      const targetTab =
        initialTab === "manage" && !isAdmin ? "overview" : initialTab;
      setActiveTab(targetTab);
      /* eslint-enable react-hooks/set-state-in-effect */
      loadMembership();
    }
  }, [open, initialTab, isAdmin]);

  async function loadMembership() {
    setLoading(true);
    setLoadError(false);
    // fetchUserMembership 失败时返回 null（不抛异常），null 即为加载失败信号
    const res = await fetchUserMembership();
    setData(res);
    setLoadError(res === null);
    setLoading(false);
  }

  async function handleRedeem(codeToUse?: string) {
    const code = (codeToUse || redeemInput).trim();
    if (!code) {
      toast.error("请输入兑换码");
      return;
    }

    setRedeeming(true);
    try {
      const res = await redeemCode(code);
      if (!res.ok) {
        toast.error(res.error || "兑换失败，请检查兑换码");
        return;
      }

      toast.success(res.message || "恭喜！会员兑换成功");
      setRedeemInput("");
      // 刷新用户 auth 态和会员数据
      await auth.refresh();
      await loadMembership();
      setActiveTab("overview");
    } catch {
      toast.error("网络异常，请稍后再试");
    } finally {
      setRedeeming(false);
    }
  }

  if (!open) return null;

  const currentTier = data?.membership.tier || "free";
  const currentConfig =
    TIER_CONFIGS[currentTier as MembershipTier] || TIER_CONFIGS.free;
  const isExpired = data?.membership.isExpired ?? false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      layer="detail"
      busy={redeeming}
      width={720}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      icon={
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl shadow-xs"
          style={{
            background:
              currentTier === "premium"
                ? "linear-gradient(135deg, var(--accent), var(--accent-deep))"
                : currentTier === "pro"
                  ? "linear-gradient(135deg, var(--ink), var(--bloom-5))"
                  : "linear-gradient(135deg, var(--bd-check), var(--text-3))",
            color: currentTier === "premium" ? "var(--ink)" : "var(--cream)",
          }}
        >
          <Crown className="h-5 w-5" />
        </div>
      }
      title={
        <span className="inline-flex items-center gap-2">
          会员中心 · 配额管理
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
            style={{
              backgroundColor:
                currentTier === "premium"
                  ? "rgba(245, 158, 11, 0.15)"
                  : currentTier === "pro"
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(107, 114, 128, 0.15)",
              color: currentConfig.color,
            }}
          >
            {currentConfig.badge}
          </span>
        </span>
      }
      eyebrow={`${currentConfig.name} · ${currentConfig.tagline}`}
    >
      {/* Navigation Tabs */}
      <div className="flex flex-none border-b border-border bg-muted/10 px-5 pt-2 gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>我的权益 & 用量</span>
        </button>

        <button
          onClick={() => setActiveTab("redeem")}
          className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
            activeTab === "redeem"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ticket className="h-4 w-4" />
          <span>兑换码激活</span>
          <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.2 font-mono font-bold">
            福利
          </span>
        </button>

        <button
          onClick={() => setActiveTab("tiers")}
          className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
            activeTab === "tiers"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>会员等级对比</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === "manage"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>管理员 · 激活码管理</span>
          </button>
        )}
      </div>

      {/* Scrollable Content Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-6 [scrollbar-width:thin]">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin mb-2 text-primary" />
            <p className="text-xs">加载会员权益信息中…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5"
              >
                {/* Status Banner — 无真实数据（加载中/失败）时不展示猜测身份 */}
                {data && (
                  <div className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          当前身份：
                        </span>
                        <span
                          className="font-bold text-sm"
                          style={{ color: currentConfig.color }}
                        >
                          {currentConfig.name}
                        </span>
                        {isExpired && (
                          <span className="text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-medium">
                            已到期
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {data?.membership.membershipExpiresAt ? (
                          <span>
                            有效期至：
                            <strong className="font-mono text-foreground font-semibold">
                              {new Date(
                                data.membership.membershipExpiresAt,
                              ).toLocaleDateString()}
                            </strong>
                          </span>
                        ) : (
                          <span>永久免费，随心起步</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("redeem")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>使用兑换码升级</span>
                    </button>
                  </div>
                )}

                {/* Quota Progress Cards — 仅在有真实数据时渲染；失败给明确错误与重试，不展示猜测额度 */}
                {loadError && !data ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 space-y-3 text-center">
                    <h3 className="text-sm font-bold text-foreground">
                      配额信息加载失败
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      网络异常或服务暂不可用，未能获取你的真实额度。为避免误导，这里不做任何猜测展示。
                    </p>
                    <button
                      onClick={loadMembership}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? "重试中…" : "重试"}
                    </button>
                  </div>
                ) : !data ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-5 text-center text-xs text-muted-foreground">
                    正在加载配额信息…
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        今日使用量与配额进度
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Tasks Limit */}
                        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Layers className="h-4 w-4 text-primary" />
                              <span>同时拥有任务容量</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {data.membership.tasks.current} /{" "}
                              {data.membership.tasks.limit}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (data.membership.tasks.current /
                                    data.membership.tasks.limit) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {currentTier === "free"
                                ? `普通用户最多 ${data.membership.tasks.limit} 个`
                                : "支持多任务同时进行"}
                            </span>
                            <span>
                              剩余容量 {data.membership.tasks.remaining}
                            </span>
                          </div>
                        </div>

                        {/* 2. Daily Task Actions (New + Delete) */}
                        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span>今日新建+删除操作</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {data.membership.taskOps.todayCurrent} /{" "}
                              {data.membership.taskOps.dailyLimit}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (data.membership.taskOps.todayCurrent /
                                    data.membership.taskOps.dailyLimit) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>每日 24:00 (东八区) 刷新</span>
                            <span>
                              剩余 {data.membership.taskOps.remaining} 次
                            </span>
                          </div>
                        </div>

                        {/* 3. AI Adjust / Fine-Tuning Limit */}
                        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              <span>今日提示词微调修改</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {data.membership.aiAdjust.todayCurrent} /{" "}
                              {data.membership.aiAdjust.dailyLimit}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (data.membership.aiAdjust.todayCurrent /
                                    data.membership.aiAdjust.dailyLimit) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>每日 24:00 (东八区) 刷新</span>
                            <span>
                              剩余 {data.membership.aiAdjust.remaining} 次
                            </span>
                          </div>
                        </div>

                        {/* 4. AI Generate Limit */}
                        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <span>今日 AI 规划生成</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {data.membership.aiGenerate.todayCurrent} /{" "}
                              {data.membership.aiGenerate.dailyLimit}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (data.membership.aiGenerate.todayCurrent /
                                    data.membership.aiGenerate.dailyLimit) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>每日 24:00 (东八区) 刷新</span>
                            <span>
                              剩余 {data.membership.aiGenerate.remaining} 次
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Included Features List */}
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>当前已享特权清单 ({currentConfig.name})</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {currentConfig.features.map((feat, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-muted-foreground"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === "redeem" && (
              <motion.div
                key="redeem"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5"
              >
                {/* Redeem Form */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span>输入会员兑换码</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      兑换成功后将立即解锁对应等级的任务容量与更多每日 AI
                      生成/调整配额。
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRedeem();
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      type="text"
                      value={redeemInput}
                      onChange={(e) =>
                        setRedeemInput(e.target.value.toUpperCase())
                      }
                      placeholder="请输入管理员发放的兑换码"
                      disabled={redeeming}
                      className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-mono font-semibold tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary uppercase"
                    />
                    <button
                      type="submit"
                      disabled={redeeming || !redeemInput.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {redeeming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>验证兑换中…</span>
                        </>
                      ) : (
                        <>
                          <span>立即兑换</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Redemption History */}
                {data?.history && data.history.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h4 className="text-xs font-bold text-muted-foreground">
                      我的兑换历史
                    </h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {data.history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/20 text-muted-foreground"
                        >
                          <span className="font-mono font-medium text-foreground">
                            {h.code}
                          </span>
                          <span>
                            {h.tier.toUpperCase()} · {h.durationDays} 天 (
                            {new Date(h.redeemedAt).toLocaleDateString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "tiers" && (
              <motion.div
                key="tiers"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Free Tier */}
                  <div
                    className={`rounded-2xl border p-4 space-y-3.5 flex flex-col justify-between ${
                      currentTier === "free"
                        ? "border-primary/50 bg-primary/5 shadow-xs"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          免费版
                        </span>
                        {currentTier === "free" && (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            当前使用中
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xl font-extrabold text-foreground">
                        ¥0{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          永久
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        满足个人起步学习需求，体验 Bloom 阶梯拆解。
                      </p>
                      <div className="space-y-2 pt-2 border-t border-border text-xs">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          <span>最多同时拥有 2 个任务</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Bot className="h-3.5 w-3.5 text-emerald-500" />
                          <span>每日 5 次 AI 规划全案拆解</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Sliders className="h-3.5 w-3.5 text-amber-500" />
                          <span>每日 10 次提示词微调</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pro Tier (Recommended) */}
                  <div
                    className={`relative rounded-2xl border p-4 space-y-3.5 flex flex-col justify-between ${
                      currentTier === "pro"
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md"
                        : "border-emerald-500/40 bg-card shadow-xs"
                    }`}
                  >
                    <div className="absolute -top-2.5 right-4 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      深度推荐
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          专业版 Pro
                        </span>
                        {currentTier === "pro" && (
                          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
                            当前使用中
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xl font-extrabold text-foreground">
                        兑换码{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          / 畅享
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        为深度自主学习者打造，多任务交错排期与多轮深度修订。
                      </p>
                      <div className="space-y-2 pt-2 border-t border-border text-xs">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Layers className="h-3.5 w-3.5 text-emerald-500" />
                          <span>最多同时拥有 5 个任务</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Bot className="h-3.5 w-3.5 text-emerald-500" />
                          <span>每日 20 次 AI 规划全案拆解</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Sliders className="h-3.5 w-3.5 text-amber-500" />
                          <span>每日 100 次提示词微调</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("redeem")}
                      className="w-full mt-2 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      输入 Pro 兑换码
                    </button>
                  </div>

                  {/* Premium Tier */}
                  <div
                    className={`rounded-2xl border p-4 space-y-3.5 flex flex-col justify-between ${
                      currentTier === "premium"
                        ? "border-amber-500 bg-amber-500/5 shadow-md"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                          尊享版 Premium
                        </span>
                        {currentTier === "premium" && (
                          <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full">
                            当前使用中
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xl font-extrabold text-foreground">
                        旗舰{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          / 年度
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        极致无拘体验，多任务容量与优先算力通道。
                      </p>
                      <div className="space-y-2 pt-2 border-t border-border text-xs">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Layers className="h-3.5 w-3.5 text-amber-500" />
                          <span>最多同时拥有 10 个任务</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Bot className="h-3.5 w-3.5 text-amber-500" />
                          <span>每日 100 次 AI 规划全案拆解</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Sliders className="h-3.5 w-3.5 text-amber-500" />
                          <span>每日 500 次深度提示词微调</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("redeem")}
                      className="w-full mt-2 rounded-lg bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                    >
                      输入 Premium 兑换码
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "manage" && (
              <motion.div
                key="manage"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {isAdmin ? (
                  <CodeManagerTab
                    onUseCodeInRedeemTab={(code) => {
                      setRedeemInput(code);
                      setActiveTab("redeem");
                    }}
                  />
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-bold text-foreground">
                      无权访问管理员后台
                    </p>
                    <p>激活码生成与管理仅限系统管理员账号访问</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
}
