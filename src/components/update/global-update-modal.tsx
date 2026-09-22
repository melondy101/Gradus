"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { UpdateModal } from "./update-modal";
import type { UpdateResponseData } from "@/app/api/app/check-update/route";

type OpenUpdateHandler = (options?: { manual?: boolean }) => void;
let openUpdateHandler: OpenUpdateHandler | null = null;

export function registerOpenUpdate(handler: OpenUpdateHandler | null): void {
  openUpdateHandler = handler;
}

/**
 * 触发版本更新检查弹窗
 * @param options.manual 是否为用户主动点击（手动触发会显示 Toast 提示结果）
 */
export function openAppUpdateModal(options?: { manual?: boolean }): void {
  if (openUpdateHandler) {
    openUpdateHandler(options);
  } else {
    console.warn("[update] Update modal handler not registered yet");
  }
}

export function GlobalUpdateModal() {
  const isNativeApp = Capacitor.isNativePlatform();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateResponseData | null>(null);

  const fetchUpdate = useCallback(async (manual: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/app/check-update", { cache: "no-store" });
      const data: UpdateResponseData = await res.json();
      setUpdateData(data);

      if (data.hasUpdate) {
        // 如果有新版本，无论手动还是自动均弹出更新提示
        setOpen(true);
        if (manual) {
          toast.success(`发现新版本 v${data.latestVersion}！`);
        }
      } else {
        if (manual) {
          toast.success(data.message || `当前已是最新版本 (v${data.currentVersion})`);
          setOpen(true);
        }
      }
    } catch (err) {
      console.error("[update] Check update error:", err);
      if (manual) {
        toast.error("检查更新失败，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;

    registerOpenUpdate((options) => {
      const manual = options?.manual ?? true;
      if (manual) {
        setOpen(true);
      }
      fetchUpdate(manual);
    });

    // 应用启动 4 秒后执行静默检测（仅在发现新版本时弹窗提示）
    const timer = setTimeout(() => {
      // 避免每次刷新都打扰用户，检查 localStorage 记录的今日忽略时间
      try {
        const lastCheckKey = "gradus_last_silent_update_check";
        const lastCheck = localStorage.getItem(lastCheckKey);
        const now = Date.now();
        // 每天最多静默提示一次
        if (!lastCheck || now - parseInt(lastCheck, 10) > 24 * 60 * 60 * 1000) {
          localStorage.setItem(lastCheckKey, now.toString());
          fetchUpdate(false);
        }
      } catch {
        // 静默检查异常忽略
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      registerOpenUpdate(null);
    };
  }, [fetchUpdate, isNativeApp]);

  if (!isNativeApp) return null;

  return (
    <UpdateModal
      open={open}
      onClose={() => setOpen(false)}
      updateData={updateData}
      loading={loading}
    />
  );
}
