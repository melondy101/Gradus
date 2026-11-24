import { expect, test } from "bun:test";

import {
  openMembershipModal,
  registerOpenMembership,
  resetMembershipRegistry,
} from "@/components/membership/membership-modal-registry";

/** FB-10：入口未就绪时记下意图，注册后自动打开 */
test("handler 未注册时记下意图，注册后自动打开", () => {
  resetMembershipRegistry();
  const opened: (string | undefined)[] = [];
  expect(openMembershipModal("redeem")).toBe(false);

  registerOpenMembership((tab) => { opened.push(tab); });
  expect(opened).toEqual(["redeem"]);
  resetMembershipRegistry();
});

test("handler 已注册时立即打开", () => {
  resetMembershipRegistry();
  const opened: (string | undefined)[] = [];
  registerOpenMembership((tab) => { opened.push(tab); });
  expect(openMembershipModal("tiers")).toBe(true);
  expect(opened).toEqual(["tiers"]);
  resetMembershipRegistry();
});

test("注册后再次打开不会重复执行待处理意图", () => {
  resetMembershipRegistry();
  const opened: (string | undefined)[] = [];
  openMembershipModal("overview");
  registerOpenMembership((tab) => { opened.push(tab); });
  openMembershipModal("manage");
  expect(opened).toEqual(["overview", "manage"]);
  resetMembershipRegistry();
});
