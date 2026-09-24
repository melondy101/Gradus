import { describe, expect, test } from "bun:test";

import { cn } from "@/utils/utils";

/**
 * @theme 里新增的 --text-* / --radius-* 档位必须同步注册进 cn() 的
 * tailwind-merge 配置，否则 text-body 这类类会被贪婪的 text-color 组裁掉
 * （实测默认配置下 cn("text-body","text-text-2") 丢失 text-body，整元素回落 16px）。
 */
describe("cn() 设计令牌档位注册", () => {
  test("字号档位与文字颜色共存，不互相裁掉", () => {
    expect(cn("text-body", "text-text-2")).toBe("text-body text-text-2");
    expect(cn("text-caption font-bold", "text-ink")).toBe("text-caption font-bold text-ink");
    expect(cn("text-body-lg", "bg-cream")).toBe("text-body-lg bg-cream");
  });

  test("字号档位之间按后写覆盖", () => {
    expect(cn("text-title", "text-title-sm")).toBe("text-title-sm");
    expect(cn("text-body", "text-xs")).toBe("text-xs");
    expect(cn("text-xs", "text-body")).toBe("text-body");
    expect(cn("text-body", "text-[13px]")).toBe("text-[13px]");
  });

  test("小圆角档位与内置标度、其他类共存/覆盖", () => {
    expect(cn("rounded-tile", "border-bd-card")).toBe("rounded-tile border-bd-card");
    expect(cn("rounded-tile", "rounded-md")).toBe("rounded-md");
    expect(cn("rounded-popover", "bg-card")).toBe("rounded-popover bg-card");
  });
});
