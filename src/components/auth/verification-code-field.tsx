"use client";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ApiResult } from "@/lib/api/result";
import type { AccountResult } from "@/lib/api/account";

export function VerificationCodeField({ value, onChange, send, disabled }: {
  value: string; onChange: (value: string) => void;
  send: () => Promise<ApiResult<AccountResult>>; disabled?: boolean;
}) {
  const id = useId();
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  async function sendCode() {
    if (sending || seconds) return;
    setSending(true);
    try {
      const result = await send();
      if (!result.ok || !result.data.ok) {
        toast.error(result.ok ? result.data.error ?? "发送失败" : result.message);
        const data = result.ok ? result.data : result.data as AccountResult | undefined;
        if (data?.waitSeconds) setSeconds(data.waitSeconds);
        return;
      }
      setSeconds(60);
      toast.success(result.data.message ?? "验证码已发送，请查收邮箱");
      if (result.data.devCode) toast.info(`本地测试验证码：${result.data.devCode}`);
    } finally { setSending(false); }
  }
  return <div className="space-y-2">
    <label htmlFor={id} className="text-body font-bold text-ink">邮箱验证码</label>
    <div className="flex gap-2">
      <Input id={id} value={value} onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required disabled={disabled} placeholder="6 位验证码" />
      <Button type="button" variant="outline" onClick={sendCode} disabled={disabled || sending || seconds > 0}>
        {sending ? "发送中…" : seconds ? `${seconds} 秒后重发` : "发送验证码"}
      </Button>
    </div>
  </div>;
}
