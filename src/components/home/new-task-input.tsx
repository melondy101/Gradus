"use client";

/**
 * 新建学习目标对话框（屏一「标签与链接」出口 / ⌘K / N / 顶栏按钮都汇聚到这里）。
 *
 * 走 <Modal layer="newTask"> 的弹层语言（§3：45% 墨色遮罩 + radius 20 白卡 +
 * 页头 / 滚动主体 / 底栏三段），因此不再需要 globals.css 的移动端 !important 补丁。
 * ESC 由 Modal 自身与 home-page 的关闭阶梯共同处理。
 */

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Sparkles, Tag as TagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Tag } from "@/components/ui/badge";
import { Mono } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/utils/utils";
import { TagEditor } from "@/components/task/tag-badges";
import { NewTaskUrlHint } from "./new-task-url-hint";
import { detectUrlHint, extractUrlClient, EXAMPLE_GOALS } from "./new-task-url";

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

  const detectedUrl = extractUrlClient(goal);
  const urlHint = detectedUrl ? detectUrlHint(detectedUrl) : null;
  const filled = !!goal.trim();

  const handleSubmit = () => {
    if (!filled) return;
    onSubmit(goal.trim(), selectedTags);
    onClose();
  };

  const handleExample = (text: string) => {
    setGoal(text);
    setTimeout(() => ref.current?.focus(), 0);
  };

  const placeholder = detectedUrl ? t("newTask.placeholderUrl") : t("newTask.placeholderDefault");

  return (
    <Modal
      open
      onClose={onClose}
      layer="newTask"
      width={460}
      icon={
        <span className="inline-grid size-[22px] flex-none place-items-center rounded-[6px] bg-accent-soft text-accent-ink">
          <Sparkles size={12} />
        </span>
      }
      title={t("newTask.title")}
      eyebrow="GOAL → TAG → LINK"
      bodyClassName="flex flex-col gap-2.5 px-4 py-3.5 sm:px-6 sm:py-4"
      footer={
        <>
          <Mono className="hidden text-text-3 sm:block">
            Enter 创建 · Shift + Enter 换行
          </Mono>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t("newTask.cancel")}
            </Button>
            <Button size="sm" disabled={!filled} onClick={handleSubmit}>
              <Sparkles size={13} />
              <span>
                {urlHint
                  ? t("newTask.submitWithUrl", {
                      label: t(`newTask.platforms.${urlHint.type}.label`),
                    })
                  : t("newTask.submit")}
              </span>
            </Button>
          </div>
        </>
      }
    >
      {/* 示例快捷标签（输入为空时展示） */}
      {!filled && (
        <ChipRow className="gap-[5px]">
          {EXAMPLE_GOALS.map(({ key, Icon }) => (
            <Chip
              key={key}
              type="button"
              className="gap-1 rounded-[6px] px-2 py-1 text-[11px] font-medium"
              onClick={() => handleExample(t(`newTask.exampleValues.${key}`))}
            >
              <Icon size={11} />
              <span>{t(`newTask.examples.${key}`)}</span>
            </Chip>
          ))}
        </ChipRow>
      )}

      <Textarea
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
        className={cn(
          "min-h-[72px] tracking-[-.01em]",
          detectedUrl ? "border-accent" : "border-bd-card"
        )}
      />

      {urlHint && <NewTaskUrlHint hint={urlHint} />}

      {/* 折叠式标签选择器：手机上默认紧凑，不占主输入视线 */}
      <div className="border-t border-bd-card pt-2">
        <button
          type="button"
          onClick={() => setShowTagEditor((v) => !v)}
          className="flex w-full cursor-pointer select-none items-center justify-between bg-transparent py-0.5 text-left"
        >
          <span className="flex items-center gap-[5px]">
            <TagIcon
              size={11}
              className={selectedTags.length > 0 ? "text-accent-ink" : "text-text-2"}
            />
            <span
              className={cn(
                "text-[11px] font-semibold",
                selectedTags.length > 0 ? "text-ink" : "text-text-2"
              )}
            >
              标签 {selectedTags.length > 0 ? `(${selectedTags.length})` : "(可选)"}
            </span>
            {selectedTags.length > 0 && !showTagEditor && (
              <span className="ml-1 flex gap-[3px]">
                {selectedTags.slice(0, 2).map((tag) => (
                  <Tag key={tag} className="rounded-[4px] px-1 py-0 text-[9.5px]">
                    {tag}
                  </Tag>
                ))}
                {selectedTags.length > 2 && (
                  <span className="text-[9.5px] text-text-2">
                    +{selectedTags.length - 2}
                  </span>
                )}
              </span>
            )}
          </span>
          <span className="flex items-center gap-0.5 text-[11px] text-text-2">
            <span className="text-[10.5px]">{showTagEditor ? "收起" : "展开"}</span>
            {showTagEditor ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </button>

        {showTagEditor && (
          <div className="mt-1.5">
            <TagEditor tags={selectedTags} onChange={setSelectedTags} label="" />
          </div>
        )}
      </div>
    </Modal>
  );
}
