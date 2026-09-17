"use client";

import React, { useId } from "react";

interface GradusLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

/**
 * 拾级 Gradus 品牌 Logo
 * 设计语言：
 * 1. 梯形与平行四边形构建的等距三维「拾级而上」认知阶梯 (Bloom's Staircase)
 * 2. 现代 Indigo-to-Cyan 渐变质感，搭配阶梯顶端的 Golden Apex（创造之光）
 * 3. 几何结构兼具稳固的基底与向上的动势
 */
export function GradusLogo({
  size = 32,
  className = "",
  showText = false,
  textClassName = "",
}: GradusLogoProps) {
  const rawId = useId();
  // 清理 ID 中的非法字符，确保在 SVG URL 引用中合法稳定
  const idPrefix = `gradus-${rawId.replace(/[^a-zA-Z0-9-_]/g, "")}`;

  const bgId = `${idPrefix}-bg`;
  const step1Id = `${idPrefix}-s1`;
  const step2Id = `${idPrefix}-s2`;
  const step3Id = `${idPrefix}-s3`;
  const sparkId = `${idPrefix}-spark`;
  const glowId = `${idPrefix}-glow`;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-label="拾级 Gradus Logo"
        style={{ shapeRendering: "geometricPrecision" }}
      >
        <defs>
          {/* 背景微渐变 */}
          <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>

          {/* 第一层阶梯 (Foundation - 基础/理解) */}
          <linearGradient id={step1Id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          {/* 第二层阶梯 (Application - 应用/分析) */}
          <linearGradient id={step2Id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* 第三层阶梯 (Mastery - 评价/创造) */}
          <linearGradient id={step3Id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* 顶端光芒 (Apex Spark) */}
          <linearGradient id={sparkId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* 阴影效果：优化模糊半径与清晰度 */}
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.32" />
          </filter>
        </defs>

        {/* Logo 背景圆角外框 */}
        <rect
          width="48"
          height="48"
          rx="12"
          fill={`url(#${bgId})`}
          className="transition-colors duration-200"
        />

        {/* 阶梯投影 */}
        <g filter={`url(#${glowId})`}>
          {/* Step 1: 底部阶梯 (左侧起始) */}
          <path
            d="M8 36L18 36L18 30L8 30Z"
            fill={`url(#${step1Id})`}
            opacity="0.95"
          />
          <path
            d="M8 30L14 26L24 26L18 30Z"
            fill="#A5B4FC"
            opacity="0.92"
          />
          <path
            d="M18 36L24 32L24 26L18 30Z"
            fill="#4338CA"
            opacity="0.85"
          />

          {/* Step 2: 中间阶梯 */}
          <path
            d="M17 30L27 30L27 22L17 22Z"
            fill={`url(#${step2Id})`}
          />
          <path
            d="M17 22L23 18L33 18L27 22Z"
            fill="#7DD3FC"
            opacity="0.95"
          />
          <path
            d="M27 30L33 26L33 18L27 22Z"
            fill="#0369A1"
            opacity="0.85"
          />

          {/* Step 3: 顶峰阶梯 */}
          <path
            d="M26 22L36 22L36 14L26 14Z"
            fill={`url(#${step3Id})`}
          />
          <path
            d="M26 14L32 10L42 10L36 14Z"
            fill="#6EE7B7"
            opacity="0.95"
          />
          <path
            d="M36 22L42 18L42 10L36 14Z"
            fill="#047857"
            opacity="0.85"
          />

          {/* 顶端智慧星芒 / 突破点 (Apex Beacon) */}
          <circle cx="37" cy="9" r="2.5" fill={`url(#${sparkId})`} />
          <path
            d="M37 4.5L38 8L41.5 9L38 10L37 13.5L36 10L32.5 9L36 8Z"
            fill="#FEF08A"
            opacity="0.95"
          />
        </g>
      </svg>

      {showText && (
        <div className={`flex flex-col min-w-0 ${textClassName}`}>
          <div className="text-[15px] font-bold tracking-tight leading-none text-foreground font-sans flex items-center gap-1.5">
            <span>拾级</span>
            <span className="text-[11px] font-mono font-medium text-accent opacity-90 uppercase tracking-wider">
              Gradus
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5 tracking-tight">
            AI 学习任务与排期
          </span>
        </div>
      )}
    </div>
  );
}
