"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DEPLOY_COMMAND } from "./links";

/**
 * 开源卡里的「复制部署命令」—— 纯前端写剪贴板，
 * 非安全上下文（http://局域网 IP）下 navigator.clipboard 不可用时静默失败。
 * 按钮铺满卡宽（原 `.gh-card .btn{width:100%}`）；卡片已从深色改成暖纸白卡，
 * 因此按钮也跟着从深底反白换成描边墨色。
 */
export function CopyCommandButton() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(DEPLOY_COMMAND);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" type="button" onClick={handleClick}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "部署命令已复制" : "复制部署命令"}
    </Button>
  );
}
