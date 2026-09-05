"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { useAppTheme } from "@/components/theme/theme-provider";

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

export function ThemeToggle() {
  const { themeId, setThemeId } = useAppTheme();
  const isDocDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = themeId === "linear" || isDocDark;

  const toggle = () => {
    if (isDark) {
      setThemeId("sage");
      document.documentElement.classList.remove("dark");
    } else {
      setThemeId("linear");
      document.documentElement.classList.add("dark");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "切换至浅色模式" : "切换至深色模式"}
      style={{
        background: "var(--secondary)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
        borderRadius: 10,
        width: 36,
        height: 36,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
      }}
    >
      {isDark ? (
        <Sun size={17} style={{ color: "var(--warning)" }} />
      ) : (
        <Moon size={17} style={{ color: "var(--muted-foreground)" }} />
      )}
    </button>
  );
}
