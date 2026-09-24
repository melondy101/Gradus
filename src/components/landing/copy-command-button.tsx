"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DEPLOY_COMMAND } from "./links";

/**
 * What's New 深色卡里的「复制部署命令」—— 纯前端写剪贴板，
 * 非安全上下文（http://局域网 IP）下 navigator.clipboard 不可用时静默失败。
 * 深色卡内按钮铺满卡宽（原 `.gh-card .btn{width:100%}`）。
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
    <Button variant="onDark" className="w-full" type="button" onClick={handleClick}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "部署命令已复制" : "复制部署命令"}
    </Button>
  );
}
