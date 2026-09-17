"use client";

import React from "react";
import { Download, X, Sparkles, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import type { UpdateResponseData } from "@/app/api/app/check-update/route";

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  updateData: UpdateResponseData | null;
  loading: boolean;
}

export function UpdateModal({ open, onClose, updateData, loading }: UpdateModalProps) {
  if (!open) return null;

  const hasUpdate = updateData?.hasUpdate;
  const isDirectApk = updateData?.isApkDirect;

  const handleDownload = () => {
    if (!updateData?.downloadUrl) return;
    // 在移动端或浏览器唤起下载
    window.open(updateData.downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* 顶部彩色装饰条与标题栏 */}
        <div className="relative px-5 pt-5 pb-4 border-b border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs flex-shrink-0">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                拾级版本检查
                {hasUpdate ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    发现新版本
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    客户端状态
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                移动端与全平台客户端版本更新管理
              </p>
            </div>
          </div>
        </div>

        {/* 内容滚动区域 */}
        <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">正在连接 GitHub Releases 检查最新版本...</p>
            </div>
          ) : !updateData ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              暂无可用更新信息
            </div>
          ) : (
            <>
              {/* 版本对比展示卡 */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/70 text-center">
                <div className="flex flex-col items-center justify-center border-r border-border/70 pr-2">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">当前运行版本</span>
                  <span className="text-sm font-bold font-mono text-foreground mt-0.5">
                    v{updateData.currentVersion}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center pl-2">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">远端最新版本</span>
                  <span
                    className={`text-sm font-bold font-mono mt-0.5 ${
                      hasUpdate ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    }`}
                  >
                    v{updateData.latestVersion}
                  </span>
                </div>
              </div>

              {hasUpdate ? (
                <>
                  {/* 新版本信息元数据 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    {updateData.publishedAt && <span>发布时间：{updateData.publishedAt}</span>}
                    {updateData.apkSize && <span>安装包大小：{updateData.apkSize}</span>}
                  </div>

                  {/* 更新日志详情 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>更新内容摘要</span>
                    </label>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground/90 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {updateData.releaseNotes}
                    </div>
                  </div>

                  {/* 覆盖更新安装指导 */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold mb-0.5">安卓端更新指南：</p>
                      <p>
                        点击下方按钮将开始下载 {isDirectApk ? "APK 安装包" : "新版本"}。下载完成后，点击手机下拉通知栏或打开「文件管理」中的安装包，即可直接
                        <strong className="font-bold underline ml-1 mr-1">覆盖安装升级</strong>
                        ，您的任务、学习排期与账号数据将完全保留！
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                  <h4 className="text-sm font-semibold text-foreground">
                    您已在使用最新版本
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    当前客户端（v{updateData.currentVersion}）已是远端仓库最新编译版本，您可以在有新 Release 发布时随时来此一键升级。
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between gap-2.5">
          {updateData?.releaseUrl ? (
            <a
              href={updateData.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg transition-colors"
            >
              <span>GitHub Release</span>
              <ArrowUpRight size={13} />
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {hasUpdate ? "稍后再说" : "确定"}
            </button>

            {hasUpdate && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all active:scale-95"
              >
                <Download size={14} />
                <span>{isDirectApk ? "下载最新 APK" : "前往 Release 下载"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
