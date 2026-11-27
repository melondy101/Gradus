import type { TourStep } from "./tour-steps";

export interface TourMaskRect {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  width?: number;
  height?: number;
  inset?: number;
}

export interface TourCardRect {
  top: number;
  left: number;
  width: number;
  /** 小屏/找不到目标时居中（用 CSS translate 属性居中，避免与 motion 的 transform 动画打架） */
  centered: boolean;
}

const CARD_WIDTH = 380;
const EDGE_PADDING = 20;
/** z 阶：落在 Modal 阶梯（100→400）之上，引导进行时压住一切弹层 */
export const TOUR_Z = { veil: 500, ring: 501, card: 502 } as const;

function clampToViewport(posLeft: number, viewportWidth: number): number {
  return Math.max(EDGE_PADDING, Math.min(posLeft, viewportWidth - CARD_WIDTH - EDGE_PADDING));
}

/** 气泡卡片落点：贴 prefers  Placement，越界回折；小屏或找不到目标时居中 */
export function getTourCardRect(
  targetRect: DOMRect | null,
  step: TourStep,
  viewportWidth: number,
  viewportHeight: number
): TourCardRect {
  if (!targetRect || viewportWidth < 640) {
    return {
      top: Math.round(viewportHeight / 2),
      left: Math.round(viewportWidth / 2),
      width: Math.min(viewportWidth - 32, 400),
      centered: true,
    };
  }

  const { top, bottom, left, right, width, height } = targetRect;
  const placement = step.preferredPlacement || "bottom";
  let posTop = 0;
  let posLeft = 0;

  if (placement === "bottom") {
    posTop = bottom + 16;
    posLeft = clampToViewport(left + width / 2 - CARD_WIDTH / 2, viewportWidth);
    if (posTop + 260 > viewportHeight) {
      posTop = Math.max(EDGE_PADDING, top - 270);
    }
  } else if (placement === "right") {
    posTop = Math.max(EDGE_PADDING, top + height / 2 - 130);
    posLeft = right + 16;
    if (posLeft + CARD_WIDTH > viewportWidth) {
      posLeft = Math.max(EDGE_PADDING, left - CARD_WIDTH - 16);
    }
  } else if (placement === "left") {
    posTop = Math.max(EDGE_PADDING, top + height / 2 - 130);
    posLeft = Math.max(EDGE_PADDING, left - CARD_WIDTH - 16);
    if (posLeft <= EDGE_PADDING) {
      // 目标贴左缘，左侧放不下：翻到右侧并夹取回视口内
      posLeft = Math.min(right + 16, viewportWidth - CARD_WIDTH - EDGE_PADDING);
    }
  } else {
    posTop = Math.max(EDGE_PADDING, top - 270);
    posLeft = clampToViewport(left + width / 2 - CARD_WIDTH / 2, viewportWidth);
  }

  return { top: Math.round(posTop), left: Math.round(posLeft), width: CARD_WIDTH, centered: false };
}

/** 四块窗帘：只覆盖目标外部，聚焦内容保持清晰 */
export function getTourMaskRects(
  targetRect: DOMRect | null,
  viewportWidth: number,
  viewportHeight: number
): TourMaskRect[] {
  if (!targetRect) return [{ inset: 0 }];

  const pad = 8;
  const spotTop = Math.max(0, targetRect.top - pad);
  const spotBottom = Math.min(viewportHeight, targetRect.bottom + pad);
  const spotLeft = Math.max(0, targetRect.left - pad);
  const spotRight = Math.min(viewportWidth, targetRect.right + pad);

  return [
    { top: 0, right: 0, left: 0, height: spotTop },
    { top: spotBottom, right: 0, bottom: 0, left: 0 },
    { top: spotTop, left: 0, width: spotLeft, height: spotBottom - spotTop },
    { top: spotTop, right: 0, width: viewportWidth - spotRight, height: spotBottom - spotTop },
  ];
}
