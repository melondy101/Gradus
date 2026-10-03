"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationCodeField } from "@/components/auth/verification-code-field";
import { changeAccountPassword, sendAccountVerification } from "@/lib/api/account";
import { loginEmail } from "@/lib/auth/account-validation";
import { accountFeedback } from "./account-feedback";
import type { CurrentUserView } from "@/lib/auth/current-user";

export function PasswordSettingsForm({ user, busy, onBusy }: { user: CurrentUserView; busy: boolean; onBusy: (busy: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const email = loginEmail(user.email);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { toast.error("两次输入的密码不一致"); return; }
    onBusy(true);
    try {
      if (accountFeedback(await changeAccountPassword(password, current, code), "密码已保存，其他登录会话已失效")) { setCurrent(""); setPassword(""); setConfirm(""); setCode(""); }
    } finally { onBusy(false); }
  }
  return <form className="space-y-3 border-t border-bd-card pt-4" onSubmit={save}>
    <h3 className="text-body font-bold text-ink">{user.passwordSet ? "修改密码" : "设置密码"}</h3>
    <p className="text-caption text-text-2">{email ? "设置后可使用邮箱和密码登录；观猹登录仍可使用。" : "请先在上方绑定邮箱。"}</p>
    {user.passwordSet ? <div className="space-y-2">
      <label htmlFor="password-current" className="text-caption font-bold text-ink">当前密码</label>
      <Input id="password-current" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} disabled={busy} required />
    </div> : email ? <VerificationCodeField value={code} onChange={setCode} send={() => sendAccountVerification(email, "password")} disabled={busy} /> : null}
    <label htmlFor="password-new" className="block text-caption font-bold text-ink">新密码</label>
    <Input id="password-new" type="password" autoComplete="new-password" minLength={6} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !email} required />
    <label htmlFor="password-confirm" className="block text-caption font-bold text-ink">确认新密码</label>
    <Input id="password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy || !email} required />
    <Button type="submit" variant="app" className="w-full" disabled={busy || !email}>保存密码</Button>
  </form>;
}
