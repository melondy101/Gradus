"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Search,
  KeyRound,
  ShieldCheck,
  Clock,
  CheckCircle2,
  HelpCircle,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchManagedCodes,
  generateNewCodes,
  deleteManagedCode,
  type ManagedCodeItem,
} from "@/lib/api/membership";

interface Props {
  onUseCodeInRedeemTab?: (code: string) => void;
}

export function CodeManagerTab({ onUseCodeInRedeemTab }: Props) {
  const [codes, setCodes] = useState<ManagedCodeItem[]>([]);
  const [stats, setStats] = useState({
    totalCodes: 0,
    activeCodes: 0,
    totalRedeemedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generator form state
  const [showGenerator, setShowGenerator] = useState(false);
  const [genMode, setGenMode] = useState<"batch" | "custom">("batch");
  const [tier, setTier] = useState<"pro" | "premium">("pro");
  const [durationPreset, setDurationPreset] = useState<number>(30);
  const [maxUsesPreset, setMaxUsesPreset] = useState<number>(1);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [prefix, setPrefix] = useState<string>("PRO");
  const [customCodeInput, setCustomCodeInput] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [newlyGenerated, setNewlyGenerated] = useState<ManagedCodeItem[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    setLoading(true);
    try {
      const res = await fetchManagedCodes();
      if (res && res.ok) {
        setCodes(res.codes);
        setStats(res.stats);
      }
    } catch {
      toast.error("加载激活码列表失败");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    toast.success(`已复制激活码：${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleCopyBatch(items: ManagedCodeItem[]) {
    if (!items.length) return;
    const text = items
      .map(
        (c) =>
          `【拾级 Gradus ${c.tier.toUpperCase()} ${c.durationDays}天会员】激活码: ${c.code}${
            c.description ? ` (${c.description})` : ""
          }`
      )
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success(`已复制 ${items.length} 个激活码到剪贴板！`);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);

    try {
      const res = await generateNewCodes({
        customCode: genMode === "custom" ? customCodeInput.trim().toUpperCase() : undefined,
        prefix: genMode === "batch" ? prefix.trim().toUpperCase() : undefined,
        tier,
        durationDays: durationPreset,
        maxUses: maxUsesPreset,
        count: genMode === "batch" ? batchCount : 1,
        description: description.trim() || undefined,
      });

      if (!res.ok || !res.codes) {
        toast.error(res.error || "生成激活码失败");
        return;
      }

      toast.success(res.message || "激活码已成功生成！");
      setNewlyGenerated(res.codes);
      if (genMode === "custom") {
        setCustomCodeInput("");
      }
      await loadCodes();
    } catch {
      toast.error("网络异常，生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(code: string) {
    if (!confirm(`确定要删除/作废激活码「${code}」吗？已兑换的用户权益不受影响。`)) {
      return;
    }

    setDeletingCode(code);
    try {
      const res = await deleteManagedCode(code);
      if (res.ok) {
        toast.success(`激活码「${code}」已删除`);
        setCodes((prev) => prev.filter((c) => c.code !== code));
      } else {
        toast.error(res.error || "删除失败");
      }
    } catch {
      toast.error("网络异常，删除失败");
    } finally {
      setDeletingCode(null);
    }
  }

  // Filtered list
  const filteredCodes = codes.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCode = item.code.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchCode && !matchDesc) return false;
    }
    if (filterTier !== "all" && item.tier !== filterTier) return false;
    if (filterStatus === "active" && !item.isActive) return false;
    if (filterStatus === "exhausted" && !item.isExhausted) return false;
    if (filterStatus === "expired" && !item.isExpired) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Header Overview & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">总激活码数</div>
            <div className="text-xl font-mono font-extrabold text-foreground mt-0.5">
              {stats.totalCodes}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <KeyRound size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">有效可用码</div>
            <div className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.activeCodes}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">总兑换使用人次</div>
            <div className="text-xl font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.totalRedeemedCount}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles size={16} />
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              showGenerator
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            <Plus size={14} />
            <span>{showGenerator ? "收起生成器" : "⚡ 快速生成激活码"}</span>
          </button>

          <button
            onClick={() => handleCopyBatch(codes.filter((c) => c.isActive))}
            disabled={!codes.some((c) => c.isActive)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Copy size={13} />
            <span>复制所有有效码</span>
          </button>
        </div>

        <button
          onClick={loadCodes}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>刷新列表</span>
        </button>
      </div>

      {/* 3. Generator Form (Collapsible) */}
      <AnimatePresence>
        {showGenerator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-primary/15 pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Zap size={16} className="text-primary" />
                  <span>激活码配置与生成</span>
                </div>
                <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setGenMode("batch")}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      genMode === "batch"
                        ? "bg-card text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    批量随机码
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenMode("custom")}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      genMode === "custom"
                        ? "bg-card text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    自定义指定码
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* 1. 会员等级 */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">1. 会员权益等级</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTier("pro")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 font-medium transition-all ${
                        tier === "pro"
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>专业版 Pro (20任务)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTier("premium")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 font-medium transition-all ${
                        tier === "premium"
                          ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>尊享版 Premium (无限)</span>
                    </button>
                  </div>
                </div>

                {/* 2. 特权天数 */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">2. 赠送时长 (天数)</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "7天", val: 7 },
                      { label: "30天", val: 30 },
                      { label: "90天", val: 90 },
                      { label: "365天", val: 365 },
                    ].map((d) => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => {
                          setDurationPreset(d.val);
                        }}
                        className={`rounded-lg border py-1.5 text-center font-medium transition-all ${
                          durationPreset === d.val
                            ? "border-primary bg-primary text-primary-foreground font-bold"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 使用次数限制 */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">3. 可兑换人次上限</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "1人 (独享专属)", val: 1 },
                      { label: "10人 (小群组)", val: 10 },
                      { label: "100人 (公开活动)", val: 100 },
                    ].map((u) => (
                      <button
                        key={u.val}
                        type="button"
                        onClick={() => setMaxUsesPreset(u.val)}
                        className={`rounded-lg border py-1.5 text-center font-medium transition-all ${
                          maxUsesPreset === u.val
                            ? "border-primary bg-primary text-primary-foreground font-bold"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. 码形式 */}
                {genMode === "batch" ? (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">4. 生成数量与前缀</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                        placeholder="前缀如 VIP"
                        className="w-1/2 rounded-lg border border-border bg-background px-3 py-1.5 font-mono uppercase text-foreground focus:ring-1 focus:ring-primary"
                      />
                      <select
                        value={batchCount}
                        onChange={(e) => setBatchCount(Number(e.target.value))}
                        className="w-1/2 rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value={1}>生成 1 个</option>
                        <option value={5}>生成 5 个</option>
                        <option value={10}>生成 10 个</option>
                        <option value={20}>生成 20 个</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">4. 指定自定义兑换码</label>
                    <input
                      type="text"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                      placeholder="例如：VIP2026-SUPER"
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono uppercase font-semibold text-foreground focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* 5. 备注说明 */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-semibold text-foreground">5. 备注/活动名称 (可选)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="例如：微信社群学习打卡赠送、新用户内测福利"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={generating || (genMode === "custom" && !customCodeInput.trim())}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{generating ? "正在生成中…" : "立即创建激活码"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Newly Generated Highlight Banner */}
      <AnimatePresence>
        {newlyGenerated.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>本次成功生成 {newlyGenerated.length} 个激活码：</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyBatch(newlyGenerated)}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  <Copy size={12} />
                  <span>一键复制全部</span>
                </button>
                <button
                  onClick={() => setNewlyGenerated([])}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  关闭提示
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {newlyGenerated.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-background/80 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{item.code}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-sans font-semibold">
                      {item.tier.toUpperCase()} · {item.durationDays}天
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(item.code)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="复制"
                  >
                    {copiedCode === item.code ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Codes Table & Search Filter */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Filter bar */}
        <div className="p-3 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索兑换码 / 备注…"
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
            >
              <option value="all">所有等级</option>
              <option value="pro">Pro 专业版</option>
              <option value="premium">Premium 尊享版</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
            >
              <option value="all">所有状态</option>
              <option value="active">有效可用</option>
              <option value="exhausted">已领完</option>
              <option value="expired">已过期</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        {loading && codes.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
            <span>正在加载激活码数据…</span>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">没有找到匹配的激活码</p>
            <p>可点击上方「⚡ 快速生成激活码」立即创建新的激活码</p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-x-auto">
            {filteredCodes.map((item) => (
              <div
                key={item.id}
                className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Code info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm tracking-wider text-foreground">
                      {item.code}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.tier === "premium"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {item.tier === "premium" ? "尊享版 Premium" : "专业版 Pro"}
                    </span>

                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {item.durationDays} 天特权
                    </span>

                    {item.isActive && (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-md text-[10px] font-medium">
                        有效可用
                      </span>
                    )}
                    {item.isExhausted && (
                      <span className="bg-destructive/10 text-destructive px-1.5 py-0.2 rounded-md text-[10px] font-medium">
                        已领完
                      </span>
                    )}
                    {item.isExpired && (
                      <span className="bg-muted text-muted-foreground px-1.5 py-0.2 rounded-md text-[10px] font-medium">
                        已过期
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span>
                      已用 <strong>{item.usedCount}</strong> / 上限{" "}
                      <strong>{item.maxUses >= 99999 ? "无限制" : item.maxUses}</strong> 次
                    </span>
                    {item.description && <span>· 备注：{item.description}</span>}
                    <span>· 创建于 {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(item.code)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="复制激活码"
                  >
                    {copiedCode === item.code ? (
                      <Check size={13} className="text-emerald-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>{copiedCode === item.code ? "已复制" : "复制"}</span>
                  </button>

                  {onUseCodeInRedeemTab && item.isActive && (
                    <button
                      onClick={() => onUseCodeInRedeemTab(item.code)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                      title="立即前往兑换"
                    >
                      <ArrowRight size={13} />
                      <span>去兑换</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.code)}
                    disabled={deletingCode === item.code}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="删除/作废此激活码"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. FAQ & Tips */}
      <div className="rounded-xl border border-border bg-muted/15 p-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <HelpCircle size={14} className="text-primary" />
          <span>激活码使用与发放指南</span>
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>顺延叠加机制</strong>：若用户当前已有相同等级会员，兑换新码将在现有到期日基础上顺延天数，不会丢失已有剩余时长。
          </li>
          <li>
            <strong>独享 vs 公开码</strong>：将“兑换上限”设为 1 时即为一人独享码（兑换后自动作废）；设为 100+ 时可作为群内公开发放的福利码（每位用户限领一次）。
          </li>
          <li>
            <strong>即时生效</strong>：用户在【兑换码激活】输入后即刻解锁任务容量与每日 AI 配额，无需刷新重登。
          </li>
        </ul>
      </div>
    </div>
  );
}
