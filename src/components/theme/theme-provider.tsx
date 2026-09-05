"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { THEMES, type ThemeId, type ThemeConfig } from "@/lib/theme-config";

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: "sage",
  theme: THEMES.sage,
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("talktask_theme_id") as ThemeId;
        if (saved && THEMES[saved]) return saved;
      } catch {}
    }
    return "sage";
  });

  useEffect(() => {
    const currentTheme = THEMES[themeId] || THEMES.sage;
    applyCssTheme(currentTheme);
  }, [themeId]);

  const setThemeId = (id: ThemeId) => {
    if (!THEMES[id]) return;
    setThemeIdState(id);
    try {
      localStorage.setItem("talktask_theme_id", id);
    } catch {}
  };

  const theme = THEMES[themeId] || THEMES.sage;

  return (
    <ThemeContext.Provider value={{ themeId, theme, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyCssTheme(t: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  
  // Shadcn & Standard tokens
  root.style.setProperty("--background", t.bg);
  root.style.setProperty("--foreground", t.ink);
  root.style.setProperty("--card", t.cardBg);
  root.style.setProperty("--card-foreground", t.ink);
  root.style.setProperty("--popover", t.surface);
  root.style.setProperty("--popover-foreground", t.ink);
  root.style.setProperty("--primary", t.ink);
  root.style.setProperty("--primary-foreground", t.bg);
  root.style.setProperty("--secondary", t.soft);
  root.style.setProperty("--secondary-foreground", t.ink);
  root.style.setProperty("--muted", t.soft);
  root.style.setProperty("--muted-foreground", t.muted);
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--border", t.border);
  root.style.setProperty("--input", t.border);
  root.style.setProperty("--ring", t.accent);

  // Gradus Custom Theme tokens
  root.style.setProperty("--color-bg", t.bg);
  root.style.setProperty("--color-surface", t.surface);
  root.style.setProperty("--color-soft", t.soft);
  root.style.setProperty("--color-line", t.line);
  root.style.setProperty("--color-ink", t.ink);
  root.style.setProperty("--color-muted", t.muted);
  root.style.setProperty("--color-subtle", t.subtle || (t.id === "linear" ? "#5C6070" : "#9CA3AF"));
  root.style.setProperty("--color-accent", t.accent);
  root.style.setProperty("--color-accent-hover", t.id === "linear" ? "#9AA4F7" : "#3D6B5F");
  root.style.setProperty("--color-secondary-accent", t.secondaryAccent);
  root.style.setProperty("--color-paper", t.soft);
  root.style.setProperty("--color-sage", t.accent);

  if (t.id === "linear") {
    root.classList.add("dark");
    document.body.style.backgroundColor = t.bg;
    document.body.style.color = t.ink;
  } else {
    root.classList.remove("dark");
    document.body.style.backgroundColor = t.bg;
    document.body.style.color = t.ink;
  }
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
