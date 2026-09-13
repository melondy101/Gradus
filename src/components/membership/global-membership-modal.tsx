"use client";

import React, { useEffect, useState } from "react";
import { MembershipModal, type MembershipModalTab } from "./membership-modal";

type OpenMembershipHandler = (tab?: MembershipModalTab) => void;
let openMembershipHandler: OpenMembershipHandler | null = null;

export function registerOpenMembership(handler: OpenMembershipHandler | null): void {
  openMembershipHandler = handler;
}

export function openMembershipModal(tab?: MembershipModalTab): void {
  if (openMembershipHandler) {
    openMembershipHandler(tab);
  } else {
    console.warn("[membership] modal handler not registered yet");
  }
}

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
