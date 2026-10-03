"use client";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationCodeField } from "@/components/auth/verification-code-field";
import { changeAccountEmail, sendAccountVerification } from "@/lib/api/account";
import { loginEmail } from "@/lib/auth/account-validation";
import { accountFeedback } from "./account-feedback";
import type { CurrentUserView } from "@/lib/auth/current-user";

export function EmailSettingsForm({ user, busy, onBusy }: { user: CurrentUserView; busy: boolean; onBusy: (busy: boolean) => void }) {
  const currentEmail = loginEmail(user.email);
  const [email, setEmail] = useState(currentEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); onBusy(true);
    try {
      if (accountFeedback(await changeAccountEmail(email, code, password), "登录邮箱已更新")) { setCode(""); setPassword(""); }
    } finally { onBusy(false); }
  }
  return <form className="space-y-3 border-t border-bd-card pt-4" onSubmit={save}>
    <h3 className="text-body font-bold text-ink">登录邮箱</h3>
    <p className="text-caption text-text-2">{currentEmail ? `当前邮箱：${currentEmail}` : "尚未绑定邮箱。绑定后可设置密码，也可通过邮件找回账号。"}</p>
    <label htmlFor="account-email" className="block text-caption font-bold text-ink">{currentEmail ? "新邮箱" : "邮箱"}</label>
    <Input id="account-email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setCode(""); }} maxLength={256} required disabled={busy} />
    {user.passwordSet ? <div className="space-y-2">
      <label htmlFor="email-current-password" className="text-caption font-bold text-ink">当前密码</label>
      <Input id="email-current-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
    </div> : null}
    <VerificationCodeField key={email} value={code} onChange={setCode} send={() => sendAccountVerification(email, "email")} disabled={busy || !loginEmail(email)} />
    <Button variant="app" type="submit" className="w-full" disabled={busy}>{currentEmail ? "验证并更换邮箱" : "验证并绑定邮箱"}</Button>
  </form>;
}
