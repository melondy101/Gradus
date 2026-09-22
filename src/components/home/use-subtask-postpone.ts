import { useCallback } from "react";
import { postponeSubtask, unpostponeSubtask } from "@/lib/api/tasks";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface Options {
  setRows: React.Dispatch<React.SetStateAction<SubtaskWithTask[]>>;
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  undoLabel: string;
}

export function useSubtaskPostpone({ setRows, showToast, undoLabel }: Options) {
  return useCallback(async (row: SubtaskWithTask, done: string, failed: string, undoFailed: string) => {
    setRows((rows) => rows.map((item) => item.id === row.id ? { ...item, startDay: item.startDay + 1 } : item));
    const startDay = await postponeSubtask(row.taskId, row.id).catch(() => null);
    if (startDay === null) {
      setRows((rows) => rows.map((item) => item.id === row.id ? { ...item, startDay: item.startDay - 1 } : item));
      showToast(failed);
      return;
    }
    showToast(done, undoLabel, () => {
      setRows((rows) => rows.map((item) => item.id === row.id ? { ...item, startDay: Math.max(0, item.startDay - 1) } : item));
      unpostponeSubtask(row.taskId, row.id).catch(() => {
        setRows((rows) => rows.map((item) => item.id === row.id ? { ...item, startDay: item.startDay + 1 } : item));
        showToast(undoFailed);
      });
    });
  }, [setRows, showToast, undoLabel]);
}
