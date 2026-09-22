"use client";

import React, { useState } from "react";
import { useAppTheme } from "./theme-provider";
import { THEMES, type ThemeId } from "@/lib/theme-config";
import { Palette, Check, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemePreviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeId, setThemeId } = useAppTheme();

  return (
    <>
      {/* 浮动切换按钮 */}
      {/* 浮动入口：设计稿把右下角留给悬浮 AI pill（§3 屏二 right 26 / bottom 22），
          所以这里靠左下角放，并在移动端隐藏以免压住底部标签栏。 */}
      <button
        id="theme-switcher-trigger"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 left-5 z-40 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full border transition-[transform,border-color] duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "var(--card)",
          borderColor: "var(--bd-card)",
          color: "var(--ink)",
          boxShadow: "var(--shadow-md)",
        }}
        title="预览并切换设计风格 (Theme Preview)"
      >
        <Palette className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold tracking-wide">
          风格预览 ({THEMES[themeId]?.nameEn || "Theme"})
        </span>
      </button>

      {/* 预览弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* 弹窗容器 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 md:p-8"
              style={{
                background: "var(--card)",
                borderColor: "var(--bd-card)",
                color: "var(--ink)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      选择设计风格 / UI Style Preview
                    </h2>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    点击任意风格即可实时生效，在实际页面中体验真实的色彩、排版与视觉节奏。
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--color-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 风格卡片网格 (4 款) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                  const t = THEMES[id];
                  const isSelected = themeId === id;

                  return (
                    <div
                      key={id}
                      onClick={() => setThemeId(id)}
                      className={`group relative cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                        isSelected
                          ? "ring-2 ring-offset-2 ring-offset-background shadow-md scale-[1.01]"
                          : "hover:border-neutral-400 hover:shadow-sm"
                      }`}
                      style={{
                        background: t.surface,
                        borderColor: isSelected ? t.accent : t.border,
                        outlineColor: t.accent,
                      }}
                    >
                      {/* 选中学号角标 */}
                      {isSelected && (
                        <div
                          className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-sm"
                          style={{ background: t.accent }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>当前应用</span>
                        </div>
                      )}

                      {/* 标题 & 标签 */}
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ background: t.accent }}
                        />
                        <h3
                          className="text-base font-bold"
                          style={{ color: t.ink }}
                        >
                          {t.name}
                        </h3>
                      </div>
                      <p
                        className="text-xs mt-1 font-medium"
                        style={{ color: t.muted }}
                      >
                        {t.tagline}
                      </p>

                      {/* 交互式微型 UI Mockup 预览 */}
                      <div
                        className="mt-4 rounded-lg p-3 border overflow-hidden"
                        style={{
                          background: t.bg,
                          borderColor: t.line,
                        }}
                      >
                        {/* 模拟顶栏 */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: t.line }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: t.accent }} />
                            <span className="text-[11px] font-bold" style={{ color: t.ink }}>拾级 Gradus</span>
                          </div>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                            style={{ background: t.badgeBg, color: t.badgeText }}
                          >
                            {t.nameEn}
                          </span>
                        </div>

                        {/* 模拟任务卡片 */}
                        <div className="space-y-2">
                          {/* 子任务 1 */}
                          <div
                            className="flex items-center justify-between p-2 rounded border"
                            style={{
                              background: t.cardBg,
                              borderColor: t.border,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] text-white"
                                style={{ background: t.accent }}
                              >
                                ✓
                              </div>
                              <span className="text-xs font-medium" style={{ color: t.ink }}>
                                掌握基础概念与核心架构
                              </span>
                            </div>
                            <span className="text-[10px]" style={{ color: t.muted }}>
                              Day 1 · 2h
                            </span>
                          </div>

                          {/* 子任务 2（带甘特进度条条） */}
                          <div
                            className="p-2 rounded border"
                            style={{
                              background: t.cardBg,
                              borderColor: t.border,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3.5 h-3.5 rounded border"
                                  style={{ borderColor: t.muted }}
                                />
                                <span className="text-xs font-medium" style={{ color: t.ink }}>
                                  动手搭建实战原型项目
                                </span>
                              </div>
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded"
                                style={{
                                  background: t.soft,
                                  color: t.secondaryAccent,
                                  fontWeight: 600,
                                }}
                              >
                                进阶阶段
                              </span>
                            </div>

                            {/* 模拟进度条 */}
                            <div
                              className="mt-2 h-1.5 rounded-full overflow-hidden"
                              style={{ background: t.soft }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: "65%", background: t.accent }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* 调色板色块展示 */}
                        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t" style={{ borderColor: t.line }}>
                          <span className="text-[10px]" style={{ color: t.muted }}>调色盘:</span>
                          <div className="flex items-center gap-1">
                            {[t.bg, t.surface, t.soft, t.accent, t.secondaryAccent, t.ink].map((color, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full border shadow-2xs"
                                style={{ background: color, borderColor: t.line }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 切换按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setThemeId(id);
                        }}
                        className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1"
                        style={{
                          background: isSelected ? t.accent : t.soft,
                          // 点缀黄上永远压墨字：--accent-foreground 在两套主题里都是 #111111
                          color: isSelected ? "var(--accent-foreground)" : t.ink,
                          borderColor: isSelected ? t.accent : t.border,
                        }}
                      >
                        {isSelected ? "当前正在使用此风格" : "切换为本风格"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold shadow transition-all hover:opacity-90"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  完成体验并关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
