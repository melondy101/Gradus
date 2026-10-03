"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckBox } from "@/components/ui/check-box";
import { bindExistingAccount } from "@/lib/api/account";
import { accountFeedback } from "./account-feedback";

export function MergeAccountForm({ busy, onBusy }: { busy: boolean; onBusy: (busy: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  async function save(event: FormEvent) {
    event.preventDefault(); onBusy(true);
    try {
      if (accountFeedback(await bindExistingAccount(email, password, confirm), "账号已合并，两种登录方式均可使用")) router.refresh();
    } finally { onBusy(false); }
  }
  return <form className="space-y-3 border-t border-bd-card pt-4" onSubmit={save}>
    <h3 className="text-body font-bold text-ink">绑定已有账号</h3>
    <p className="text-caption leading-5 text-text-2">已有拾级账号？验证旧账号后，将当前任务、通知和会员记录合并到旧账号，保留旧账号的昵称和密码。相同兑换码记录去重，保留较高的有效会员等级。当前账号将并入旧账号，此操作不能撤销。</p>
    <label htmlFor="merge-email" className="block text-caption font-bold text-ink">旧账号邮箱</label>
    <Input id="merge-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy} />
    <label htmlFor="merge-password" className="block text-caption font-bold text-ink">旧账号密码</label>
    <Input id="merge-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
    <label htmlFor="merge-confirm-control" className="flex items-start gap-2 text-caption text-text-2">
      <CheckBox id="merge-confirm-control" state={confirm ? "done" : "todo"} onClick={() => setConfirm(value => !value)} aria-label="确认合并账号数据" aria-describedby="merge-confirm-help" disabled={busy} />
      <span id="merge-confirm-help">我确认将两个账号的数据合并到旧账号</span>
    </label>
    <Button type="submit" variant="outline" className="w-full" disabled={busy || !confirm}>验证旧账号并合并</Button>
  </form>;
}
