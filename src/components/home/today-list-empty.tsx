"use client";

/**
 * 列表空态（《品牌与产品设计说明》§3 屏一，原 app.css `.card.list` 内部）。
 * 黄色让位给墨色：只在按钮描边上出现，符合「稀有=重要」。
 */

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

interface Props {
  selectedTag: string | null;
  showOnlyPending: boolean;
  onClearTag: () => void;
  onShowAll: () => void;
}

export function TodayListEmpty({ selectedTag, showOnlyPending, onClearTag, onShowAll }: Props) {
  const { t } = useTranslation();
  return (
    <div className="px-2 pt-[28px] pb-[26px] text-center">
      <Eyebrow kind="label">
        {selectedTag ? "NO MATCH" : showOnlyPending ? "ALL CLEAR" : "EMPTY"}
      </Eyebrow>
      <p className="mt-1.5 text-[14px] font-bold text-ink">
        {selectedTag
          ? `暂无属于「${selectedTag}」的任务`
          : showOnlyPending
          ? t("home.todayAllClear", "待完成任务已全部清空")
          : t("home.todayEmpty", "今天没有排期任务")}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.6] text-text-2">
        {selectedTag
          ? t("home.todayEmptyTag", "当前标签下没有符合条件的任务，可清除筛选查看全部。")
          : t("home.todayEmptyHint", "切换筛选可查看已完成的任务，或去上方输入新的学习目标。")}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        {selectedTag ? (
          <Button variant="outline" size="xs" onClick={onClearTag}>
            {t("home.clearTagFilter", "清除标签筛选")}
          </Button>
        ) : (
          <Button variant="outline" size="xs" onClick={onShowAll}>
            {t("home.showAllTasks", "展示所有任务")}
          </Button>
        )}
      </div>
    </div>
  );
}
