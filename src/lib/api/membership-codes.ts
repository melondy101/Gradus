import { randomInt } from "node:crypto";
import { createRedemptionCode } from "@/lib/db/queries/membership";

type CreateCodesInput = {
  customCode?: string;
  prefix?: string;
  tier?: string;
  durationDays?: number;
  maxUses?: number;
  count?: number;
  description?: string;
  expiresInDays?: number;
};

export type CreateCodesResponse =
  | { ok: true; message: string; codes: Awaited<ReturnType<typeof createRedemptionCode>>[] }
  | { ok: false; error: string; status: number };

export async function createMembershipCodes(body: unknown): Promise<CreateCodesResponse> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "无效的请求参数", status: 400 };
  }

  const input = body as CreateCodesInput;
  const tier = input.tier === "premium" ? "premium" : "pro";
  const durationDays = clamp(input.durationDays, 30, 1, 3650);
  const maxUses = clamp(input.maxUses, 1, 1, 100000);
  const count = clamp(input.count, 1, 1, 50);
  const expiresAt = input.expiresInDays && Number(input.expiresInDays) > 0
    ? new Date(Date.now() + Number(input.expiresInDays) * 24 * 60 * 60 * 1000)
    : null;

  if (typeof input.customCode === "string" && input.customCode.trim()) {
    try {
      const created = await createRedemptionCode({
        code: input.customCode.trim().toUpperCase().slice(0, 32),
        tier,
        durationDays,
        maxUses,
        description: input.description || `自定义 ${tier.toUpperCase()} 激活码`,
        expiresAt,
      });
      return { ok: true, message: `成功生成激活码：${created.code}`, codes: [created] };
    } catch {
      return { ok: false, error: "该兑换码已存在或格式不符", status: 400 };
    }
  }

  const codes = [];
  for (let index = 0; index < count; index++) {
    const created = await createUniqueCode({ tier, durationDays, maxUses, expiresAt, description: input.description, prefix: input.prefix });
    if (!created) return { ok: false, error: "生成激活码失败，请重试", status: 500 };
    codes.push(created);
  }

  return { ok: true, message: `成功生成 ${codes.length} 个激活码`, codes };
}

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(value) || fallback));
}

async function createUniqueCode(input: {
  tier: string;
  durationDays: number;
  maxUses: number;
  expiresAt: Date | null;
  description?: string;
  prefix?: string;
}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await createRedemptionCode({
        code: generateRandomCode(input.prefix),
        tier: input.tier,
        durationDays: input.durationDays,
        maxUses: input.maxUses,
        description: input.description || `批量生成 ${input.tier.toUpperCase()} ${input.durationDays}天卡`,
        expiresAt: input.expiresAt,
      });
    } catch {
      // A uniqueness collision is retried with a fresh cryptographic code.
    }
  }
  return null;
}

function generateRandomCode(prefix = "PRO", length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let index = 0; index < length; index++) randomPart += chars.charAt(randomInt(chars.length));
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
  return cleanPrefix ? `${cleanPrefix}-${randomPart}` : randomPart;
}
