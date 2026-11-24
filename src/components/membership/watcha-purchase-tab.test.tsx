import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { WatchaPurchaseTab } from "./watcha-purchase-tab";

/** FB-11：次数包价格直接显示在卡片上，不用点进付款页才知道 */
test("观猹购买页签直接显示价格", () => {
  const markup = renderToStaticMarkup(
    <WatchaPurchaseTab
      balance={3}
      balanceVerified
      paymentReady
      canPurchase
      availableSkus={["pack10", "pack30"]}
    />,
  );
  expect(markup).toContain("¥9.90");
  expect(markup).toContain("¥24.90");
  expect(markup).toContain("AI 规划 10 次包");
  expect(markup).toContain("AI 规划 30 次包");
});

test("未就绪时按钮给出明确状态而不是静默", () => {
  const notLoggedIn = renderToStaticMarkup(
    <WatchaPurchaseTab
      balance={0}
      balanceVerified={false}
      paymentReady={false}
      canPurchase={false}
      availableSkus={["pack10"]}
    />,
  );
  expect(notLoggedIn).toContain("请先注册登录");
  expect(notLoggedIn).toContain("暂未查全");

  const notReady = renderToStaticMarkup(
    <WatchaPurchaseTab
      balance={0}
      balanceVerified={false}
      paymentReady={false}
      canPurchase
      availableSkus={["pack10"]}
    />,
  );
  expect(notReady).toContain("尚未开放");
});
