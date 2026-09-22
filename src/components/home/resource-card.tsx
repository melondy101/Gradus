"use client";

import React from "react";
import { T } from "@/lib/design-tokens";

export interface ResourceItem {
  title?: string;
  url?: string;
  snippet?: string;
  sourceType?: string;
  verified?: boolean;
  authorityScore?: number; // 1-5
  freshness?: string;
  intent?: string;
}

interface ResourceCardProps {
  resource: ResourceItem;
  onClick?: () => void;
}

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const {
    title = "未命名学习资源",
    url,
    snippet,
    sourceType = "Documentation",
    verified = true,
    authorityScore = 5,
    freshness = "2025/2026",
    intent,
  } = resource;

  const domain = url
    ? (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return url;
        }
      })()
    : "Verified Source";

  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "all 0.15s ease",
        cursor: url ? "pointer" : "default",
        boxShadow: "0 1px 3px var(--cream)",
      }}
      onMouseEnter={(e) => {
        if (url) {
          e.currentTarget.style.borderColor = T.accent;
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 3px 8px var(--cream)";
        }
      }}
      onMouseLeave={(e) => {
        if (url) {
          e.currentTarget.style.borderColor = T.line;
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 1px 3px var(--cream)";
        }
      }}
    >
      {/* 头部：来源类型 + 可信度徽标 + 权威分 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: T.soft,
              color: T.muted,
              fontFamily: "var(--mono)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {sourceType}
          </span>
          <span
            style={{
              fontSize: 11,
              color: T.muted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {domain}
          </span>
        </div>

        {/* 3D 权威度指示器 */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {verified && (
            <span
              title="三维可信度验证通过"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--success)",
                background: "var(--success-soft)",
                border: "1px solid var(--success-soft)",
                borderRadius: 4,
                padding: "1px 5px",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              已核验
            </span>
          )}
          {/* 权威度点阵 */}
          <div
            title={`权威度评分: ${authorityScore}/5`}
            style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 2 }}
          >
            {[1, 2, 3, 4, 5].map((dot) => (
              <span
                key={dot}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: dot <= authorityScore ? T.accent : T.line,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 资源标题 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <a
          href={url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => !url && e.preventDefault()}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            lineHeight: 1.4,
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            if (url) e.currentTarget.style.color = T.accent;
          }}
          onMouseLeave={(e) => {
            if (url) e.currentTarget.style.color = T.ink;
          }}
        >
          {title}
        </a>
      </div>

      {/* 摘要说明 */}
      {snippet && (
        <div
          style={{
            fontSize: 12,
            color: T.muted,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {snippet}
        </div>
      )}

      {/* 底部信息：搜索意图 / 新鲜度 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          color: T.muted,
          paddingTop: 4,
          borderTop: `1px dashed ${T.line}`,
        }}
      >
        {intent ? (
          <span style={{ fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {intent}
          </span>
        ) : (
          <span />
        )}
        {freshness && (
          <span style={{ flexShrink: 0, fontFamily: "var(--mono)" }}>
            {freshness}
          </span>
        )}
      </div>
    </div>
  );
}
