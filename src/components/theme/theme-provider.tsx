"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  THEMES,
  normalizeThemeId,
  type ThemeId,
  type ThemeConfig,
} from "@/lib/theme-config";

// 早期版本用 applyCssTheme 往 <html> 写内联变量，会与 globals.css 打架。
// 这里在挂载时一次性清掉，之后令牌只由样式表决定。
const LEGACY_INLINE_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover",
  "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
  "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
  "--border", "--input", "--ring", "--color-bg", "--color-surface",
  "--color-soft", "--color-line", "--color-ink", "--color-muted",
  "--color-subtle", "--color-accent", "--color-accent-hover",
  "--color-secondary-accent", "--color-paper", "--color-sage",
];

const STORAGE_KEY = "gradus_theme_id";
const LEGACY_STORAGE_KEY = "talktask_theme_id";

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: "cream",
  theme: THEMES.cream,
  setThemeId: () => {},
});

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "cream";
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && !current) localStorage.setItem(LEGACY_STORAGE_KEY, "");
    return normalizeThemeId(current ?? legacy);
  } catch {
    return "cream";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 服务端与客户端首帧统一为默认主题，避免 localStorage 造成 hydration 不一致。
  const [themeId, setThemeIdState] = useState<ThemeId>("cream");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setThemeIdState(readStoredTheme()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    for (const v of LEGACY_INLINE_VARS) root.style.removeProperty(v);
    root.classList.toggle("dark", themeId === "ink");
    root.dataset.theme = themeId === "cream" || themeId === "ink" ? "" : themeId;
    root.style.colorScheme = themeId === "ink" ? "dark" : "light";
    root.style.removeProperty("background-color");
  }, [themeId]);

  const setThemeId = useCallback((id: ThemeId) => {
    if (!THEMES[id]) return;
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  const theme = THEMES[themeId] ?? THEMES.cream;

  return (
    <ThemeContext.Provider value={{ themeId, theme, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
