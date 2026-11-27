"use client";

import { motion } from "framer-motion";

import { TOUR_Z, type TourMaskRect } from "./tour-position";

interface TourSpotlightProps {
  maskRects: TourMaskRect[];
  targetRect: DOMRect | null;
  onVeilClick: () => void;
}

/**
 * 引导遮罩与聚焦环 —— 与 Modal 浮层同一套视觉语言：
 * 45% 墨遮罩 + 2px 模糊；聚焦环用暖纸底强调朱红（FB-19）。
 */
export function TourSpotlight({ maskRects, targetRect, onVeilClick }: TourSpotlightProps) {
  return (
    <>
      {maskRects.map((rect, index) => (
        <motion.div
          key={`tour-mask-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="fixed bg-ink/45 backdrop-blur-[2px]"
          style={{ zIndex: TOUR_Z.veil, pointerEvents: "auto", ...rect }}
          onClick={onVeilClick}
        />
      ))}

      {targetRect && (
        <motion.div
          key="tour-spotlight-ring"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{
            opacity: 1,
            scale: 1,
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="pointer-events-none fixed rounded-field border-2 border-error shadow-[0_0_24px_var(--error-soft)]"
          style={{ zIndex: TOUR_Z.ring }}
        />
      )}
    </>
  );
}
