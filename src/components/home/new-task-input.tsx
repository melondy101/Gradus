"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { T } from "@/lib/design-tokens";

// 客户端轻量 URL 检测（不引入 url-fetcher，避免服务端依赖）
function extractUrlClient(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
  return match ? match[0].replace(/[.,;!?)]+$/, "") : null;
}

type UrlHint = {
  type: string;
  icon: string;
  /** 是否可以完整抓取内容（false = 仅推断主题，建议补充描述）*/
  canFetch: boolean;
};

function detectUrlHint(url: string): UrlHint {
  const u = url.toLowerCase();

  // GitHub
  if (u.includes("github.com") || u.includes("raw.githubusercontent.com")) {
    if (u.includes("/blob/") || u.includes("/gist")) {
      return { type: "github_file", icon: "📄", canFetch: true };
    }
    return { type: "github_repo", icon: "📦", canFetch: true };
  }

  // arXiv 论文
  if (u.includes("arxiv.org") || u.includes("ar5iv.org")) {
    return { type: "arxiv", icon: "🎓", canFetch: true };
  }

  // PDF 直链
  if (u.endsWith(".pdf") || u.includes(".pdf?") || u.includes(".pdf#")) {
    return { type: "pdf", icon: "📑", canFetch: true };
  }

  // 视频平台
  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    return { type: "youtube", icon: "🎬", canFetch: false };
  }
  if (u.includes("bilibili.com") || u.includes("b23.tv")) {
    return { type: "bilibili", icon: "📺", canFetch: true };
  }

  // 课程平台
  if (u.includes("coursera.org")) {
    return { type: "coursera", icon: "🎓", canFetch: true };
  }
  if (u.includes("edx.org")) {
    return { type: "edx", icon: "📚", canFetch: true };
  }

  // 包管理
  if (u.includes("npmjs.com/package/")) {
    return { type: "npm", icon: "📦", canFetch: true };
  }
  if (u.includes("pypi.org/project/")) {
    return { type: "pypi", icon: "🐍", canFetch: true };
  }

  // 中文技术社区
  if (u.includes("juejin.cn")) {
    return { type: "juejin", icon: "🔶", canFetch: true };
  }
  if (u.includes("zhihu.com")) {
    return { type: "zhihu", icon: "🔵", canFetch: true };
  }
  if (u.match(/\bmedium\.com\b/) || u.match(/\w+\.medium\.com/)) {
    return { type: "medium", icon: "🟢", canFetch: true };
  }

  // 文档协作平台
  if (u.includes("notion.so") || u.includes("notion.site")) {
    return { type: "notion", icon: "⬜", canFetch: false };
  }
  if (u.includes("yuque.com")) {
    return { type: "yuque", icon: "📝", canFetch: true };
  }
  if (u.includes("feishu.cn") || u.includes("larkoffice.com")) {
    return { type: "feishu", icon: "📋", canFetch: true };
  }

  // 技术文档
  if (u.includes("docs.") || u.includes("/docs/") || u.includes("developer.mozilla") || u.includes("readthedocs")) {
    return { type: "docs", icon: "📖", canFetch: true };
  }

  return { type: "article", icon: "🌐", canFetch: true };
}

interface Props {
  onClose: () => void;
  onSubmit: (goal: string) => void;
}

export function NewTaskInput({ onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [goal, setGoal] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const detectedUrl = extractUrlClient(goal);
  const urlHint = detectedUrl ? detectUrlHint(detectedUrl) : null;

  const handleSubmit = () => {
    if (!goal.trim()) return;
    onSubmit(goal.trim());
    onClose();
  };

  // 一键填入示例
  const handleExample = (text: string) => {
    setGoal(text);
    setTimeout(() => ref.current?.focus(), 0);
  };

  const EXAMPLES = [
    { icon: "🐍", key: "python" },
    { icon: "📐", key: "math" },
    { icon: "🗣", key: "english" },
    { icon: "⚛️", key: "react" },
  ] as const;

  const placeholder = detectedUrl
    ? t("newTask.placeholderUrl")
    : t("newTask.placeholderDefault");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.25)", zIndex: 100, backdropFilter: "blur(2px)" }}
      />
      {/* Dialog */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18,
        padding: "22px 22px 18px", width: "min(500px, 93vw)",
        zIndex: 101, boxShadow: "0 20px 60px rgba(17,17,17,0.1)",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {/* 标题栏 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 15, letterSpacing: "-0.03em" }}>{t("newTask.title")}</div>
          <button onClick={onClose} style={{ color: T.muted, background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* 示例卡片（输入为空时展示） */}
        {!goal.trim() && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.key}
                onClick={() => handleExample(t(`newTask.exampleValues.${ex.key}`))}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 10px",
                  background: T.soft, border: `1px solid ${T.line}`,
                  borderRadius: 8, cursor: "pointer",
                  fontSize: 12, color: T.muted, fontWeight: 500,
                  transition: "background-color 0.15s ease-out, border-color 0.15s ease-out",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,122,255,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,122,255,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.color = T.accent;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = T.soft;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = T.line;
                  (e.currentTarget as HTMLButtonElement).style.color = T.muted;
                }}
              >
                <span style={{ fontSize: 13 }}>{ex.icon}</span>
                {t(`newTask.examples.${ex.key}`)}
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <textarea
          ref={ref}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder={placeholder}
          rows={4}
          style={{
            width: "100%", background: T.soft,
            border: `1.5px solid ${detectedUrl ? T.accent : T.line}`,
            borderRadius: 10, padding: "11px 13px",
            color: T.ink, fontSize: 14, fontWeight: 500,
            outline: "none", resize: "vertical", fontFamily: "inherit",
            boxSizing: "border-box", letterSpacing: "-0.02em",
            lineHeight: 1.6,
            transition: "border-color 0.2s",
          }}
        />

        {/* URL 检测提示卡 */}
        {urlHint && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px",
            background: "rgba(59,122,255,0.05)",
            border: "1px solid rgba(59,122,255,0.2)",
            borderRadius: 10,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>{urlHint.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: T.accent,
                  background: "rgba(59,122,255,0.12)", border: "1px solid rgba(59,122,255,0.25)",
                  borderRadius: 4, padding: "1px 7px",
                }}>
                  {t(`newTask.platforms.${urlHint.type}.label`)}
                </span>
                <span style={{ fontSize: 10, color: urlHint.canFetch ? T.green : T.orange, fontWeight: 600 }}>
                  {urlHint.canFetch ? t("newTask.willFetch") : t("newTask.needDesc")}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45 }}>
                {t(`newTask.platforms.${urlHint.type}.tip`)}
              </div>
              <div style={{
                fontSize: 10, color: T.muted, marginTop: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "var(--font-geist-mono), monospace",
                opacity: 0.7,
              }}>
                {detectedUrl}
              </div>
            </div>
          </div>
        )}

        {/* 提示文字 */}
        {!urlHint && (
          <p style={{ color: T.muted, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            {t("newTask.enterHint")}
          </p>
        )}

        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!goal.trim()}
            style={{
              flex: 1, background: T.accent, color: "#fff", border: "none", borderRadius: 10,
              padding: "11px 0", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em",
              cursor: goal.trim() ? "pointer" : "not-allowed",
              opacity: goal.trim() ? 1 : 0.45,
              transition: "opacity 0.15s",
            }}
          >
          {urlHint ? t("newTask.submitWithUrl", { label: t(`newTask.platforms.${urlHint.type}.label`) }) : t("newTask.submit")}
          </button>
          <button
            onClick={onClose}
            style={{ background: T.soft, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 10, padding: "11px 16px", fontSize: 13, cursor: "pointer" }}
          >
            {t("newTask.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
