import { describe, expect, it } from "bun:test";
import { createSign, createVerify, generateKeyPairSync } from "node:crypto";
import { amountYuan, canonicalParams, merchantTradeNo, orderIdFromTradeNo, parseYuanCents,
  paymentUrl, queryTrade, verifyNotify, type AlipayConfig } from "./alipay";
import { COMMERCE_PRODUCTS } from "./catalog";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const config: AlipayConfig = {
  appId: "2026000000000000", sellerId: "2088000000000000",
  origin: "https://talk-task.vercel.app", gateway: "https://openapi.alipay.com/gateway.do",
  privateKey, publicKey,
};

describe("Alipay web payment contract", () => {
  it("uses server catalog prices and a stable merchant trade number", () => {
    expect(COMMERCE_PRODUCTS.pack10.amountCents).toBe(990);
    expect(COMMERCE_PRODUCTS.pack30.amountCents).toBe(2490);
    expect(COMMERCE_PRODUCTS.pro30.amountCents).toBe(3990);
    const id = "d6d41310-c63e-4f18-97e0-031307983019";
    expect(orderIdFromTradeNo(merchantTradeNo(id))).toBe(id);
    expect(orderIdFromTradeNo("G../../etc/passwd")).toBeNull();
    expect(amountYuan(990)).toBe("9.90");
    expect(parseYuanCents("9.9")).toBe(990);
    expect(parseYuanCents("9.9e0")).toBeNull();
  });

  it("signs the exact checkout amount and callback URL", () => {
    const url = new URL(paymentUrl({
      id: "d6d41310-c63e-4f18-97e0-031307983019", amountCents: 990,
      name: "AI 规划 10 次包",
    }, config));
    const params = Object.fromEntries(url.searchParams.entries());
    const verifier = createVerify("RSA-SHA256");
    verifier.update(canonicalParams(params), "utf8");
    expect(verifier.verify(publicKey, params.sign, "base64")).toBe(true);
    expect(JSON.parse(params.biz_content).total_amount).toBe("9.90");
    expect(params.notify_url).toBe("https://talk-task.vercel.app/api/payments/alipay/notify");
    const tampered = { ...params, biz_content: params.biz_content.replace("9.90", "0.01") };
    const bad = createVerify("RSA-SHA256");
    bad.update(canonicalParams(tampered), "utf8");
    expect(bad.verify(publicKey, params.sign, "base64")).toBe(false);
  });

  it("accepts only valid RSA2 notification signatures", () => {
    const notification: Record<string, string> = {
      app_id: config.appId, seller_id: config.sellerId, sign_type: "RSA2",
      out_trade_no: "Gd6d41310c63e4f1897e0031307983019",
      total_amount: "9.90", trade_status: "TRADE_SUCCESS",
    };
    const signer = createSign("RSA-SHA256");
    signer.update(canonicalParams(notification, true), "utf8");
    notification.sign = signer.sign(privateKey, "base64");
    expect(verifyNotify(notification, publicKey)).toBe(true);
    expect(verifyNotify({ ...notification, total_amount: "0.01" }, publicKey)).toBe(false);
    expect(verifyNotify({ ...notification, sign_type: "RSA" }, publicKey)).toBe(false);
  });

  it("verifies the signed trade query body before accepting its status", async () => {
    const orderId = "d6d41310-c63e-4f18-97e0-031307983019";
    const body = { code: "10000", out_trade_no: merchantTradeNo(orderId),
      trade_no: "20260000000000000001", trade_status: "TRADE_SUCCESS", total_amount: "9.90" };
    const signature = createSign("RSA-SHA256").update(JSON.stringify(body)).sign(privateKey, "base64");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ alipay_trade_query_response: body, sign: signature }));
    try {
      expect((await queryTrade(orderId, config))?.trade_status).toBe("TRADE_SUCCESS");
      globalThis.fetch = async () => new Response(JSON.stringify({
        alipay_trade_query_response: { ...body, total_amount: "0.01" }, sign: signature,
      }));
      await expect(queryTrade(orderId, config)).rejects.toThrow("signature invalid");
    } finally { globalThis.fetch = originalFetch; }
  });
});
