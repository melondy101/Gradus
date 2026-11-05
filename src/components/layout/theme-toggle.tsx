"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { useAppTheme } from "@/components/theme/theme-provider";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/utils/utils";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { themeId, setThemeId } = useAppTheme();
  const isDocDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = themeId === "ink" || isDocDark;

  const toggle = () => {
    setThemeId(isDark ? "cream" : "ink");
  };

  return (
    <IconButton
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "切换至浅色模式" : "切换至深色模式"}
      className={cn("size-9 rounded-icon border-border bg-secondary text-foreground", className)}
    >
      {isDark ? (
        <Sun size={17} className="text-warning" />
      ) : (
        <Moon size={17} className="text-muted-foreground" />
      )}
    </IconButton>
  );
}
