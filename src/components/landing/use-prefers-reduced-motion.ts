"use client";

import { useEffect, useState } from "react";

/**
 * 停表开关：命中「减少动态效果」时，Hero 的流水线轮播与视图轮播都不跑，
 * 固定停在设计说明 §2.2 的静态稿那一帧。
 *
 * 首次取值必须放在 effect 里：`matchMedia` 只在浏览器存在，SSR 阶段读不到，
 * 直接写在 useState 初值里会让服务端与客户端首帧不一致。
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
