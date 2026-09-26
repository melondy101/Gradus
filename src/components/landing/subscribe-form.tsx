"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HINT = {
  idle: "每两周一封，只写更新。",
  ok: "订阅成功 —— 这个演示版没有服务端，邮箱只留在你本地。",
  error: "邮箱格式好像不太对。",
} as const;

type Status = keyof typeof HINT;

/**
 * Footer 邮件订阅 —— 演示版不接服务端：只做本地校验与状态反馈。
 * 三种状态（idle / ok / error）分别驱动提示文案颜色与输入框的抖动描边。
 * 深底输入语言由 Input 的 onDark 变体承载（签字点② 2026-09-26，替代原手写覆盖）。
 */
export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setStatus("error");
      shakeTimer.current = setTimeout(() => setStatus("idle"), 600);
      return;
    }
    setStatus("ok");
  }

  return (
    <form className="mt-[30px]" onSubmit={handleSubmit} noValidate>
      <Eyebrow kind="label" className="text-on-dark-2">
        更新提醒
      </Eyebrow>
      <div className="flex gap-2">
        <Input
          onDark
          invalid={status === "error"}
          className={cn("min-w-0 flex-1", status === "error" && "animate-shake")}
          type="email"
          name="email"
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
          aria-label="订阅更新提醒的邮箱地址"
        />
        <Button type="submit" variant="accent">
          订阅
        </Button>
      </div>
      <p
        className={cn(
          "mt-2.5 text-body-sm text-on-dark-3 transition-colors duration-200",
          status === "ok" && "text-accent",
        )}
      >
        {HINT[status]}
      </p>
    </form>
  );
}
