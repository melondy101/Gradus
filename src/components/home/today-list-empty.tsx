"use client";

/**
 * 今日路线空态：与列表同一套边框语言，不另起白卡。
 * 三种来源：标签筛选无结果 / 仅待完成已清空 / 今天本来就没有排期。
 */

import { useTranslation } from "react-i18next";
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
    <div className="border-b border-bd-card py-10 text-center">
      <Eyebrow kind="label">
        {selectedTag ? "NO MATCH" : showOnlyPending ? "ALL CLEAR" : "EMPTY"}
      </Eyebrow>
      <p className="mt-1.5 text-body-lg font-bold text-ink">
        {selectedTag
          ? `暂无属于「${selectedTag}」的任务`
          : showOnlyPending
          ? t("home.todayAllClear", "待完成任务已全部清空")
          : t("home.todayEmpty", "今天没有排期任务")}
      </p>
      <p className="mt-1 text-body-sm leading-[1.6] text-text-2">
        {selectedTag
          ? t("home.todayEmptyTag", "当前标签下没有符合条件的任务，可清除筛选查看全部。")
          : t("home.todayEmptyHint", "切换筛选可查看已完成的任务，或去左侧输入新的学习目标。")}
      </p>
      <div className="mt-3 flex justify-center">
        {selectedTag ? (
          <button
            type="button"
            onClick={onClearTag}
            className="border border-ink px-3 py-1.5 text-body-sm text-ink transition-transform duration-[.16s] ease-out hover:-translate-y-px"
          >
            {t("home.clearTagFilter", "清除标签筛选")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onShowAll}
            className="border border-ink px-3 py-1.5 text-body-sm text-ink transition-transform duration-[.16s] ease-out hover:-translate-y-px"
          >
            {t("home.showAllTasks", "展示所有任务")}
          </button>
        )}
      </div>
    </div>
  );
}
