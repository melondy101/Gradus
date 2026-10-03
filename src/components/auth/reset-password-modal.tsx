"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationCodeField } from "./verification-code-field";
import { sendPasswordResetCode, resetAccountPassword } from "@/lib/api/account";
import { accountFeedback } from "@/components/user-profile/account-feedback";

export function ResetPasswordModal({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { toast.error("两次输入的密码不一致"); return; }
    setBusy(true);
    try { if (accountFeedback(await resetAccountPassword(email, code, password), "密码已重置，请使用新密码登录")) onBack(); }
    finally { setBusy(false); }
  }
  return <Modal open onClose={onClose} title="找回密码" eyebrow="ACCOUNT · RECOVERY" width={480} layer="confirm" busy={busy}>
    <form className="space-y-3" onSubmit={save}>
      <p className="text-caption text-text-2">通过登录邮箱验证身份。重置后，之前的登录会话会失效。</p>
      <label htmlFor="reset-email" className="block text-caption font-bold text-ink">登录邮箱</label>
      <Input id="reset-email" type="email" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setCode(""); }} required disabled={busy} />
      <VerificationCodeField key={email} value={code} onChange={setCode} send={() => sendPasswordResetCode(email)} disabled={busy || !email} />
      <label htmlFor="reset-password" className="block text-caption font-bold text-ink">新密码</label>
      <Input id="reset-password" type="password" autoComplete="new-password" minLength={6} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
      <label htmlFor="reset-confirm" className="block text-caption font-bold text-ink">确认新密码</label>
      <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={busy} />
      <Button type="submit" variant="app" className="w-full" disabled={busy}>验证并重置密码</Button>
      <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={onBack}>返回登录</Button>
    </form>
  </Modal>;
}
