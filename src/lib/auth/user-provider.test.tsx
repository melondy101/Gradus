import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { UserProvider, useCurrentUser } from "./user-provider";

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
  test("uses the RSC user snapshot during server rendering", () => {
    const markup = renderToStaticMarkup(
      <UserProvider user={serverUser}>
        <CurrentUserProbe />
      </UserProvider>,
    );

    expect(markup).toBe("<span>拾级用户</span>");
  });
});
