"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Tag, ChevronDown, ChevronUp, X } from "lucide-react";

import { T } from "@/lib/design-tokens";
import { TagEditor } from "@/components/task/tag-badges";

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
  onSubmit: (goal: string, tags?: string[]) => void;
}

export function NewTaskInput({ onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [goal, setGoal] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const detectedUrl = extractUrlClient(goal);
  const urlHint = detectedUrl ? detectUrlHint(detectedUrl) : null;

  const handleSubmit = () => {
    if (!goal.trim()) return;
    onSubmit(goal.trim(), selectedTags);
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
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17,17,17,0.35)",
          zIndex: 100,
          backdropFilter: "blur(3px)",
        }}
      />
      {/* Dialog */}
      <div
        id="new-task-dialog"
        className="new-task-dialog"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 16,
          padding: "16px 16px 14px",
          width: "min(460px, 92vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          zIndex: 101,
          boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* 标题栏 */}
        <div className="new-task-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "var(--accent-soft, rgba(74,124,111,0.12))",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.accent,
              }}
            >
              <Sparkles size={12} />
            </span>
            <span style={{ color: T.ink, fontWeight: 700, fontSize: 14.5, letterSpacing: "-0.02em" }}>
              {t("newTask.title")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            style={{
              color: T.muted,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 示例快捷标签（输入为空时展示，紧凑单行/微卡片） */}
        {!goal.trim() && (
          <div className="new-task-examples" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.key}
                type="button"
                className="new-task-example-chip"
                onClick={() => handleExample(t(`newTask.exampleValues.${ex.key}`))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  background: T.soft,
                  border: `1px solid ${T.line}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  color: T.muted,
                  fontWeight: 500,
                  transition: "all 0.15s ease-out",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 11 }}>{ex.icon}</span>
                <span>{t(`newTask.examples.${ex.key}`)}</span>
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <textarea
          ref={ref}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          rows={3}
          className="new-task-textarea"
          style={{
            width: "100%",
            background: T.soft,
            border: `1.5px solid ${detectedUrl ? T.accent : T.line}`,
            borderRadius: 9,
            padding: "9px 11px",
            color: T.ink,
            fontSize: 13.5,
            fontWeight: 500,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
            letterSpacing: "-0.01em",
            lineHeight: 1.5,
            transition: "border-color 0.2s",
            minHeight: 72,
          }}
        />

        {/* URL 检测提示卡 */}
        {urlHint && (
          <div
            className="new-task-url-hint"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "7px 10px",
              background: "rgba(59,122,255,0.05)",
              border: "1px solid rgba(59,122,255,0.2)",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.2 }}>{urlHint.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: T.accent,
                    background: "rgba(59,122,255,0.12)",
                    border: "1px solid rgba(59,122,255,0.25)",
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  {t(`newTask.platforms.${urlHint.type}.label`)}
                </span>
                <span style={{ fontSize: 9.5, color: urlHint.canFetch ? T.green : T.orange, fontWeight: 600 }}>
                  {urlHint.canFetch ? t("newTask.willFetch") : t("newTask.needDesc")}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.35 }}>
                {t(`newTask.platforms.${urlHint.type}.tip`)}
              </div>
            </div>
          </div>
        )}

        {/* 折叠式标签选择器：手机上默认紧凑，不占主输入视线 */}
        <div className="new-task-tag-section" style={{ borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => setShowTagEditor((v) => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Tag size={11} style={{ color: selectedTags.length > 0 ? T.accent : T.muted }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: selectedTags.length > 0 ? T.ink : T.muted }}>
                标签 {selectedTags.length > 0 ? `(${selectedTags.length})` : "(可选)"}
              </span>
              {selectedTags.length > 0 && !showTagEditor && (
                <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
                  {selectedTags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 9.5,
                        background: T.soft,
                        border: `1px solid ${T.line}`,
                        borderRadius: 4,
                        padding: "0 4px",
                        color: T.ink,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  {selectedTags.length > 2 && (
                    <span style={{ fontSize: 9.5, color: T.muted }}>+{selectedTags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, color: T.muted, fontSize: 11 }}>
              <span style={{ fontSize: 10.5 }}>{showTagEditor ? "收起" : "展开"}</span>
              {showTagEditor ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
          </div>

          {showTagEditor && (
            <div style={{ marginTop: 6 }}>
              <TagEditor
                tags={selectedTags}
                onChange={setSelectedTags}
                label=""
              />
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="new-task-actions" style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button
            type="button"
            className="new-task-btn-submit"
            onClick={handleSubmit}
            disabled={!goal.trim()}
            style={{
              flex: 1,
              background: T.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 0",
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              cursor: goal.trim() ? "pointer" : "not-allowed",
              opacity: goal.trim() ? 1 : 0.45,
              transition: "opacity 0.15s",
              boxShadow: goal.trim() ? "0 2px 8px var(--accent-glow)" : "none",
            }}
          >
            {urlHint
              ? t("newTask.submitWithUrl", { label: t(`newTask.platforms.${urlHint.type}.label`) })
              : t("newTask.submit")}
          </button>
          <button
            type="button"
            className="new-task-btn-cancel"
            onClick={onClose}
            style={{
              background: T.soft,
              color: T.muted,
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {t("newTask.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
