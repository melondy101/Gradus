"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { MembershipModal } from "./membership-modal";
import {
  openMembershipModal,
  registerOpenMembership,
  type MembershipModalTab,
} from "./membership-modal-registry";

export { openMembershipModal, type MembershipModalTab };

/**
 * 全局会员中心弹层。
 *
 * FB-10：入口未就绪时不再静默失败 —— 记下意图并在注册后自动打开，
 * 同时给用户一句可见提示（原来只有 console.warn，第一次点击像坏了）。
 */
export function GlobalMembershipModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MembershipModalTab>("overview");

  useEffect(() => {
    registerOpenMembership((initialTab) => {
      if (initialTab) setTab(initialTab);
      setOpen(true);
    });
    return () => registerOpenMembership(null);
  }, []);

  return (
    <MembershipModal
      open={open}
      initialTab={tab}
      onClose={() => setOpen(false)}
    />
  );
}

/** 带可见反馈的打开入口：入口未就绪时提示一次，而不是静默失败 */
export function openMembershipModalWithFeedback(tab?: MembershipModalTab): void {
  const opened = openMembershipModal(tab);
  if (!opened) toast.info("会员中心正在加载，请稍候再试一次");
}
