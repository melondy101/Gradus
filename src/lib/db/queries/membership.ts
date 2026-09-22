import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../client";
import {
  redemptionCodes,
  redemptionRecords,
  type RedemptionCode,
  type RedemptionRecord,
} from "../schema/membership";
import { memStore } from "../memory-store";

export async function getRedemptionCodeByCode(code: string): Promise<RedemptionCode | undefined> {
  const normalized = code.trim().toUpperCase();
  try {
    const rows = await db
      .select()
      .from(redemptionCodes)
      .where(sql`UPPER(${redemptionCodes.code}) = ${normalized}`)
      .limit(1);
    if (rows[0]) return rows[0];
  } catch {
    // DB offline, fallback to memory
  }
  return memStore.redemptionCodes.get(normalized);
}

export async function hasUserRedeemedCode(userId: string, code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  try {
    const rows = await db
      .select()
      .from(redemptionRecords)
      .where(sql`${redemptionRecords.userId} = ${userId} AND UPPER(${redemptionRecords.code}) = ${normalized}`)
      .limit(1);
    if (rows.length > 0) return true;
  } catch {
    // DB offline, fallback to memory
  }

  for (const r of memStore.redemptionRecords.values()) {
    if (r.userId === userId && r.code.toUpperCase() === normalized) {
      return true;
    }
  }
  return false;
}

export async function recordRedemption(data: {
  userId: string;
  codeId?: string;
  code: string;
  tier: string;
  durationDays: number;
}): Promise<RedemptionRecord> {
  const normalized = data.code.trim().toUpperCase();
  const newRecord: RedemptionRecord = {
    id: randomUUID(),
    userId: data.userId,
    codeId: data.codeId ?? null,
    code: normalized,
    tier: data.tier,
    durationDays: data.durationDays,
    redeemedAt: new Date(),
  };

  try {
    const rows = await db.insert(redemptionRecords).values(newRecord).returning();
    if (rows[0]) {
      // Increment usedCount on code
      await db
        .update(redemptionCodes)
        .set({ usedCount: sql`${redemptionCodes.usedCount} + 1` })
        .where(sql`UPPER(${redemptionCodes.code}) = ${normalized}`);
      memStore.redemptionRecords.set(rows[0].id, rows[0]);
      return rows[0];
    }
  } catch {
    // DB offline, fallback to memory
  }

  memStore.redemptionRecords.set(newRecord.id, newRecord);
  const codeObj = memStore.redemptionCodes.get(normalized);
  if (codeObj) {
    codeObj.usedCount += 1;
  }
  return newRecord;
}

export async function getUserRedemptionHistory(userId: string): Promise<RedemptionRecord[]> {
  try {
    const rows = await db
      .select()
      .from(redemptionRecords)
      .where(eq(redemptionRecords.userId, userId))
      .orderBy(sql`${redemptionRecords.redeemedAt} DESC`);
    if (rows.length > 0) return rows;
  } catch {
    // DB offline, fallback to memory
  }

  const list: RedemptionRecord[] = [];
  for (const r of memStore.redemptionRecords.values()) {
    if (r.userId === userId) {
      list.push(r);
    }
  }
  return list.sort((a, b) => b.redeemedAt.getTime() - a.redeemedAt.getTime());
}

export async function getAllRedemptionCodes(): Promise<RedemptionCode[]> {
  try {
    const rows = await db
      .select()
      .from(redemptionCodes)
      .orderBy(sql`${redemptionCodes.createdAt} DESC`);
    if (rows.length > 0) return rows;
  } catch {
    // DB offline, fallback to memory
  }

  const list = Array.from(memStore.redemptionCodes.values());
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createRedemptionCode(data: {
  code: string;
  tier: string;
  durationDays: number;
  maxUses?: number;
  description?: string;
  expiresAt?: Date | null;
}): Promise<RedemptionCode> {
  const normalized = data.code.trim().toUpperCase();
  const newCode: RedemptionCode = {
    id: randomUUID(),
    code: normalized,
    tier: data.tier || "pro",
    durationDays: data.durationDays || 30,
    maxUses: data.maxUses ?? 100,
    usedCount: 0,
    description: data.description || "",
    expiresAt: data.expiresAt ?? null,
    createdAt: new Date(),
  };

  try {
    const rows = await db.insert(redemptionCodes).values(newCode).returning();
    if (rows[0]) {
      memStore.redemptionCodes.set(normalized, rows[0]);
      return rows[0];
    }
  } catch (error) {
    throw new Error("Failed to create redemption code", { cause: error });
  }

  throw new Error("Failed to create redemption code");
}

export async function batchCreateRedemptionCodes(
  items: Array<{
    code: string;
    tier: string;
    durationDays: number;
    maxUses?: number;
    description?: string;
    expiresAt?: Date | null;
  }>
): Promise<RedemptionCode[]> {
  const created: RedemptionCode[] = [];
  for (const item of items) {
    const res = await createRedemptionCode(item);
    created.push(res);
  }
  return created;
}

export async function deleteRedemptionCode(codeOrId: string): Promise<boolean> {
  const normalized = codeOrId.trim().toUpperCase();
  try {
    const rows = await db
      .delete(redemptionCodes)
      .where(sql`UPPER(${redemptionCodes.code}) = ${normalized} OR ${redemptionCodes.id}::text = ${codeOrId}`)
      .returning({ id: redemptionCodes.id });
    if (!rows[0]) return false;
  } catch (error) {
    throw new Error("Failed to delete redemption code", { cause: error });
  }

  memStore.redemptionCodes.delete(normalized);
  for (const [key, val] of memStore.redemptionCodes.entries()) {
    if (val.id === codeOrId || val.code.toUpperCase() === normalized) {
      memStore.redemptionCodes.delete(key);
    }
  }
  return true;
}

export async function getAllRedemptionRecords(): Promise<RedemptionRecord[]> {
  try {
    const rows = await db
      .select()
      .from(redemptionRecords)
      .orderBy(sql`${redemptionRecords.redeemedAt} DESC`);
    if (rows.length > 0) return rows;
  } catch {
    // DB offline, fallback to memory
  }

  const list = Array.from(memStore.redemptionRecords.values());
  return list.sort((a, b) => b.redeemedAt.getTime() - a.redeemedAt.getTime());
}

