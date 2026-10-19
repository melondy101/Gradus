import { createPrivateKey, createPublicKey, createSign, createVerify } from "node:crypto";
import { commerceEnabled } from "./catalog";

export interface AlipayConfig {
  appId: string;
  sellerId: string;
  origin: string;
  gateway: string;
  privateKey: string;
  publicKey: string;
}

function pem(value: string, label: "PRIVATE KEY" | "PUBLIC KEY") {
  const normalized = value.replace(/\\n/g, "\n").trim();
  return normalized.includes("-----BEGIN")
    ? normalized
    : `-----BEGIN ${label}-----\n${normalized.match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END ${label}-----`;
}

export function getAlipayConfig(): AlipayConfig | null {
  if (!commerceEnabled()) return null;
  const appId = process.env.ALIPAY_APP_ID?.trim();
  const sellerId = process.env.ALIPAY_SELLER_ID?.trim();
  const origin = process.env.GRADUS_PUBLIC_ORIGIN?.trim();
  const privateKey = process.env.ALIPAY_PRIVATE_KEY?.trim();
  const publicKey = process.env.ALIPAY_PUBLIC_KEY?.trim();
  const sandbox = process.env.ALIPAY_ENV === "sandbox";
  if (!appId || !sellerId || !origin || !privateKey || !publicKey) return null;
  if (!/^https:\/\/[^/]+$/.test(origin)) return null;
  const normalizedPrivate = pem(privateKey, "PRIVATE KEY");
  const normalizedPublic = pem(publicKey, "PUBLIC KEY");
  try { createPrivateKey(normalizedPrivate); createPublicKey(normalizedPublic); }
  catch { return null; }
  return {
    appId, sellerId, origin,
    gateway: sandbox ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do" : "https://openapi.alipay.com/gateway.do",
    privateKey: normalizedPrivate, publicKey: normalizedPublic,
  };
}

export function merchantTradeNo(orderId: string) { return `G${orderId.replaceAll("-", "")}`; }

export function orderIdFromTradeNo(tradeNo: string): string | null {
  if (!/^G[0-9a-f]{32}$/.test(tradeNo)) return null;
  const value = tradeNo.slice(1);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function amountYuan(cents: number) { return (cents / 100).toFixed(2); }

export function parseYuanCents(value: string) {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) return null;
  const [yuan, fraction = ""] = value.split(".");
  return Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
}

function timestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(new Date()).replace("T", " ");
}

export function canonicalParams(params: Record<string, string>, excludeSignType = false) {
  return Object.keys(params).filter((key) => key !== "sign" && (!excludeSignType || key !== "sign_type") && params[key] !== "")
    .sort().map((key) => `${key}=${params[key]}`).join("&");
}

export function signParams(params: Record<string, string>, privateKey: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(canonicalParams(params), "utf8");
  return signer.sign(privateKey, "base64");
}

export function verifyNotify(params: Record<string, string>, publicKey: string) {
  if (!params.sign || params.sign_type !== "RSA2") return false;
  return [true, false].some((excludeSignType) => {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(canonicalParams(params, excludeSignType), "utf8");
    return verifier.verify(publicKey, params.sign, "base64");
  });
}

function requestParams(method: string, bizContent: Record<string, unknown>, config: AlipayConfig) {
  const params: Record<string, string> = {
    app_id: config.appId, method, format: "json", charset: "utf-8",
    sign_type: "RSA2", timestamp: timestamp(), version: "1.0",
    biz_content: JSON.stringify(bizContent),
  };
  params.sign = signParams(params, config.privateKey);
  return params;
}

export function paymentUrl(order: { id: string; amountCents: number; name: string }, config: AlipayConfig) {
  const params = requestParams("alipay.trade.page.pay", {
    out_trade_no: merchantTradeNo(order.id), total_amount: amountYuan(order.amountCents),
    subject: order.name, product_code: "FAST_INSTANT_TRADE_PAY",
  }, config);
  params.notify_url = `${config.origin}/api/payments/alipay/notify`;
  params.return_url = `${config.origin}/payment/return?order=${order.id}`;
  // Callback URLs are common parameters and must be included in the signature.
  params.sign = signParams(params, config.privateKey);
  return `${config.gateway}?${new URLSearchParams(params).toString()}`;
}

function signedResponseBody(raw: string, field: string): string | null {
  const marker = new RegExp(`"${field}"\\s*:`).exec(raw);
  const start = marker?.index ?? -1;
  if (start < 0) return null;
  const open = raw.indexOf("{", start + marker![0].length);
  if (open < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = open; i < raw.length; i++) {
    const char = raw[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\" && quoted) { escaped = true; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (char === "{") depth++;
    if (char === "}" && --depth === 0) return raw.slice(open, i + 1);
  }
  return null;
}

export async function queryTrade(orderId: string, config: AlipayConfig) {
  const params = requestParams("alipay.trade.query", { out_trade_no: merchantTradeNo(orderId) }, config);
  const response = await fetch(config.gateway, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params), signal: AbortSignal.timeout(10_000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Alipay query unavailable");
  const raw = await response.text();
  const data = JSON.parse(raw) as { alipay_trade_query_response?: Record<string, string>; sign?: string };
  const signed = signedResponseBody(raw, "alipay_trade_query_response");
  if (!signed || !data.sign) throw new Error("Alipay query missing signature");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signed, "utf8");
  if (!verifier.verify(config.publicKey, data.sign, "base64")) throw new Error("Alipay query signature invalid");
  return data.alipay_trade_query_response;
}
