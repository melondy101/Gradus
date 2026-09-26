"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Link2, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAuthConfig } from "@/lib/api/auth";
import { updateUserProfile } from "@/lib/api/profile";
import { updateCurrentUser } from "@/lib/auth/user-provider";
import type { User } from "@/lib/db/schema";

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

/** 资料编辑与第三方账户绑定，均只作用于当前会话用户。 */
export function ProfileSettingsModal({ open, onClose, user }: ProfileSettingsModalProps) {
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [watchaEnabled, setWatchaEnabled] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    getAuthConfig().then((result) => {
      setWatchaEnabled(result.ok ? Boolean(result.data.watchaEnabled) : false);
    }).catch(() => setWatchaEnabled(false));
  }, [open, user?.id]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("请输入显示名称");
      return;
    }

    setSaving(true);
    try {
      const result = await updateUserProfile({ name: trimmedName });
      if (!result.ok || !result.data.ok || !result.data.user) {
        toast.error((result.ok ? result.data.error : result.message) || "保存资料失败");
        return;
      }
      updateCurrentUser(result.data.user);
      toast.success("资料已保存");
    } finally {
      setSaving(false);
    }
  }

  function bindWatcha() {
    router.push("/api/auth/oauth/watcha?intent=bind");
  }

  return (
    <Modal open={open} onClose={onClose} title="资料与账号" eyebrow="PROFILE · CONNECTIONS" width={480} layer="confirm" busy={saving}>
      <div className="space-y-6">
        <form className="space-y-3" onSubmit={saveProfile}>
          <div>
            <label htmlFor="profile-name" className="text-body font-bold text-ink">显示名称</label>
            <p id="profile-name-help" className="mt-1 text-caption text-text-2">用于页面内的账户展示。</p>
          </div>
          <Input id="profile-name" name="name" value={name} onChange={(event) => setName(event.target.value)}
            autoComplete="name" maxLength={80} aria-describedby="profile-name-help" disabled={saving} />
          <Button type="submit" variant="app" size="lg" className="w-full" disabled={saving}>
            <PencilLine aria-hidden="true" />{saving ? "保存中…" : "保存资料"}
          </Button>
        </form>

        <section aria-labelledby="watcha-heading" className="rounded-card border border-bd-card bg-cream-light p-4">
          <div className="flex items-start gap-3">
            <Link2 className="mt-0.5 size-4 shrink-0 text-text-2" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 id="watcha-heading" className="text-body font-bold text-ink">观猹账号</h3>
              <p className="mt-1 text-caption leading-5 text-text-2">
                {user.watchaOpenId ? "已绑定；重新授权可更新关联。" : "绑定后可使用观猹账号快捷登录。"}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-4 w-full" onClick={bindWatcha}
            disabled={watchaEnabled === false}>
            <Link2 aria-hidden="true" />
            {user.watchaOpenId ? "重新授权观猹账号" : "绑定观猹账号"}
          </Button>
          {watchaEnabled === false ? <p className="mt-2 text-caption text-text-2">观猹 OAuth 尚未由站点管理员配置。</p> : null}
        </section>
      </div>
    </Modal>
  );
}
