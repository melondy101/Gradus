"use client";

import { useEffect, useState } from "react";

export interface ResponsiveState {
  /** <= 640px */
  isMobile: boolean;
  /** <= 1024px */
  isTablet: boolean;
}

/**
 * 屏幕尺寸响应式判定（Mobile <=640px，Tablet <=1024px）。
 *
 * 品牌样式表（src/styles/app.css）里的 `.stats` / `.cols` 是未分层的普通 CSS，
 * 优先级高于 Tailwind 的 `md:` 工具类，所以断点切换必须由 JS 驱动内联样式，
 * 不能靠 className 覆盖。
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({ isMobile: false, isTablet: false });
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const tabletQuery = window.matchMedia("(max-width: 1024px)");
    const update = () => {
      setState({ isMobile: mobileQuery.matches, isTablet: tabletQuery.matches });
    };
    update();
    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);
  return state;
}
