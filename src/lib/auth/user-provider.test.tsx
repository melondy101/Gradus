import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { UserProvider, useCurrentUser, updateCurrentUser, getCurrentUserSnapshot } from "./user-provider";

const serverUser = {
  id: "user-1",
  name: "拾级用户",
  email: "user@example.com",
};

function CurrentUserProbe() {
  const user = useCurrentUser();
  return <span>{user?.name ?? "访客"}</span>;
}

describe("UserProvider", () => {
  test("refreshes binding and membership even when the account identity is unchanged", () => {
    updateCurrentUser({ ...serverUser, watchaBound: false, membershipTier: "free" });
    updateCurrentUser({ ...serverUser, watchaBound: true, membershipTier: "pro" });
    expect(getCurrentUserSnapshot()?.watchaBound).toBe(true);
    expect(getCurrentUserSnapshot()?.membershipTier).toBe("pro");
    updateCurrentUser(null);
  });
  test("uses the RSC user snapshot during server rendering", () => {
    const markup = renderToStaticMarkup(
      <UserProvider user={serverUser}>
        <CurrentUserProbe />
      </UserProvider>,
    );

    expect(markup).toBe("<span>拾级用户</span>");
  });
});
