"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getAuthConfig } from "@/lib/api/auth";
import { useCurrentUser } from "@/lib/auth/user-provider";
import type { User } from "@/lib/db/schema";
import { ProfileDetailsForm } from "./profile-details-form";
import { EmailSettingsForm } from "./email-settings-form";
import { PasswordSettingsForm } from "./password-settings-form";
import { MergeAccountForm } from "./merge-account-form";

export function ProfileSettingsModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: User }) {
  const current = useCurrentUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [watchaEnabled, setWatchaEnabled] = useState(false);
  useEffect(() => {
    if (open) getAuthConfig().then(result => setWatchaEnabled(result.ok && Boolean(result.data.watchaEnabled)));
  }, [open, user?.id]);
  const profile = current ?? { id: user.id, name: user.name ?? "", email: user.email ?? "", avatarUrl: user.avatarUrl, watchaBound: Boolean(user.watchaOpenId), passwordSet: false };
  const shared = { user: profile, busy, onBusy: setBusy };
  return <Modal open={open} onClose={onClose} title="资料与账号" eyebrow="PROFILE · ACCOUNT" width={560} layer="confirm" busy={busy}>
    <div className="space-y-6">
      <ProfileDetailsForm key={profile.id} {...shared} />
      <EmailSettingsForm key={`${profile.id}-${profile.email}`} {...shared} />
      <PasswordSettingsForm key={`${profile.id}-${profile.passwordSet}`} {...shared} />
      <section className="space-y-3 border-t border-bd-card pt-4" aria-labelledby="watcha-heading">
        <h3 id="watcha-heading" className="text-body font-bold text-ink">观猹账号</h3>
        <p className="text-caption text-text-2">{profile.watchaBound ? "已绑定，可以使用观猹快捷登录。" : "绑定后，邮箱和观猹均可登录同一账号。"}</p>
        {!profile.watchaBound ? <Button type="button" variant="outline" className="w-full" disabled={busy || !watchaEnabled}
          onClick={() => router.push("/api/auth/oauth/watcha?intent=bind")}>绑定观猹账号</Button> : null}
        {!watchaEnabled ? <p className="text-caption text-text-2">站点尚未启用观猹登录。</p> : null}
      </section>
      {profile.watchaBound ? <MergeAccountForm key={profile.id} busy={busy} onBusy={setBusy} /> : null}
    </div>
  </Modal>;
}
