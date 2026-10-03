"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/lib/api/profile";
import { updateCurrentUser } from "@/lib/auth/user-provider";
import { prepareAvatar } from "@/lib/avatar-image";
import type { CurrentUserView } from "@/lib/auth/current-user";

export function ProfileDetailsForm({ user, busy, onBusy }: { user: CurrentUserView; busy: boolean; onBusy: (busy: boolean) => void }) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatarUrl ?? null);
  async function upload(file?: File) {
    if (!file) return;
    onBusy(true);
    try { setAvatar(await prepareAvatar(file)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "图片处理失败"); }
    finally { onBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); onBusy(true);
    try {
      const result = await updateUserProfile({ name, avatarUrl: avatar });
      if (!result.ok || !result.data.user) { toast.error(result.ok ? result.data.error ?? "保存失败" : result.message); return; }
      updateCurrentUser(result.data.user); toast.success("资料已保存");
    } finally { onBusy(false); }
  }
  return <form className="space-y-3" onSubmit={save}>
    <h3 className="text-body font-bold text-ink">个人资料</h3>
    <div className="flex items-center gap-3">
      <Avatar name={name} src={avatar} size={56} />
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="profile-avatar" className="text-caption font-bold text-ink">更换头像</label>
        <Input id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void upload(e.target.files?.[0]); }} disabled={busy} />
        <p className="text-caption text-text-2">JPEG、PNG 或 WebP，最多 5 MB；自动裁成方形。</p>
      </div>
    </div>
    {avatar ? <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setAvatar(null)}>移除头像</Button> : null}
    <label htmlFor="profile-name" className="block text-body font-bold text-ink">昵称</label>
    <Input id="profile-name" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} maxLength={80} required disabled={busy} />
    <Button type="submit" variant="app" className="w-full" disabled={busy}>保存资料</Button>
  </form>;
}
