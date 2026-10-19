import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiCreditGrants, paymentOrders, users } from "@/lib/db/schema";
import { COMMERCE_PRODUCTS, getProduct, type ProductSku } from "./catalog";

export async function createPaymentOrder(userId: string, sku: ProductSku, clientKey: string) {
  const product = COMMERCE_PRODUCTS[sku];
  await db.insert(paymentOrders).values({
    userId, sku, clientKey, amountCents: product.amountCents,
  }).onConflictDoNothing({ target: [paymentOrders.userId, paymentOrders.clientKey] });
  const [order] = await db.select().from(paymentOrders).where(and(
    eq(paymentOrders.userId, userId), eq(paymentOrders.clientKey, clientKey),
  )).limit(1);
  if (!order || order.sku !== sku) throw new Error("Idempotency key reused for another product");
  return order;
}

export async function listPaymentOrders(userId: string) {
  return db.select({
    id: paymentOrders.id, sku: paymentOrders.sku, amountCents: paymentOrders.amountCents,
    status: paymentOrders.status, createdAt: paymentOrders.createdAt, paidAt: paymentOrders.paidAt,
  }).from(paymentOrders).where(eq(paymentOrders.userId, userId))
    .orderBy(desc(paymentOrders.createdAt)).limit(20);
}

export async function getOwnedOrder(userId: string, orderId: string) {
  const [order] = await db.select().from(paymentOrders).where(and(
    eq(paymentOrders.id, orderId), eq(paymentOrders.userId, userId),
  )).limit(1);
  return order;
}

/** Payment status and entitlement are committed together; duplicate notifications are harmless. */
export async function fulfillPaymentOrder(orderId: string, providerTradeNo: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrders).where(eq(paymentOrders.id, orderId)).for("update");
    if (!order) throw new Error("Unknown merchant order");
    if (order.status === "paid") {
      if (order.providerTradeNo !== providerTradeNo) throw new Error("Trade number mismatch");
      return order;
    }
    if (order.status !== "pending") throw new Error("Order is not payable");
    const product = getProduct(order.sku);
    if (!product || product.amountCents !== order.amountCents) throw new Error("Order price mismatch");
    const paidAt = new Date();
    const [user] = await tx.select().from(users).where(eq(users.id, order.userId)).for("update");
    if (!user) throw new Error("Order user no longer exists");
    const base = order.sku === "pro30" && user.membershipTier === "pro" && user.membershipExpiresAt && user.membershipExpiresAt > paidAt
      ? user.membershipExpiresAt : paidAt;
    const expiresAt = new Date(base.getTime() + product.validityDays * 24 * 60 * 60_000);
    if (order.sku === "pro30" && (user.membershipTier !== "premium" || !user.membershipExpiresAt || user.membershipExpiresAt <= paidAt)) {
      await tx.update(users).set({ membershipTier: "pro", membershipExpiresAt: expiresAt, updatedAt: paidAt })
        .where(eq(users.id, order.userId));
    }
    await tx.insert(aiCreditGrants).values({
      userId: order.userId, source: order.sku === "pro30" ? "pro" : "pack",
      orderId: order.id, total: product.credits, remaining: product.credits, expiresAt,
    });
    const [paid] = await tx.update(paymentOrders).set({ status: "paid", paidAt, providerTradeNo })
      .where(eq(paymentOrders.id, orderId)).returning();
    return paid;
  });
}
