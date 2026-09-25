/**
 * 上线前实机测试账号种子脚本（幂等，可重复执行）。
 *
 * 行为：
 *   1. upsert 4 个测试账号（免费 / Pro / Premium / 当日配额耗尽）；
 *   2. upsert 3 个兑换码（Pro 有效 / Premium 有效 / 已过期）用于测兑换链路；
 *   3. 清空并重建这 4 个账号名下的 tasks/subtasks，保证每次跑出来数据一致，
 *      四个视图（今日 / 任务 / 天梯 / 甘特）都不会是空态。
 *
 * 用法：
 *   npx tsx scripts/seed-test-accounts.ts
 *
 * 设计取舍：
 *   - 直接写库而不是走注册接口：注册要邮箱验证码，测配额/会员边界时
 *     需要在库里精确置 aiGenerateCount 与 lastUsageDate，走接口做不到。
 *   - 只动 qa-*@gradus.test 这 4 个账号和 QA-* 兑换码，不碰其他数据。
 */

import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, tasks, subtasks, redemptionCodes } from "../src/lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

const PASSWORD = "Gradus@QA2026";

/** 东八区当日 YYYY-MM-DD，与 quota.ts 的 getBeijingDateString 对齐 */
function beijingToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86400 * 1000);
}

interface SeedUser {
  id: string;
  email: string;
  name: string;
  tier: "free" | "pro" | "premium";
  membershipDays: number | null;
  aiGenerateCount: number;
  /** 任务数；每个任务带 4 个子任务，分布在 startDay 0/1/3/6 */
  taskCount: number;
}

const SEED_USERS: SeedUser[] = [
  {
    id: "qa-free",
    email: "qa-free@gradus.test",
    name: "QA 免费号",
    tier: "free",
    membershipDays: null,
    aiGenerateCount: 0,
    taskCount: 1,
  },
  {
    id: "qa-pro",
    email: "qa-pro@gradus.test",
    name: "QA 专业版",
    tier: "pro",
    membershipDays: 90,
    aiGenerateCount: 0,
    taskCount: 4,
  },
  {
    id: "qa-premium",
    email: "qa-premium@gradus.test",
    name: "QA 尊享版",
    tier: "premium",
    membershipDays: 365,
    aiGenerateCount: 0,
    taskCount: 8,
  },
  {
    id: "qa-exhausted",
    email: "qa-exhausted@gradus.test",
    name: "QA 配额耗尽号",
    tier: "free",
    membershipDays: null,
    // free 档 dailyAiGenerateLimit = 5，置满即触发 AI_GENERATE_LIMIT_REACHED
    aiGenerateCount: 5,
    taskCount: 1,
  },
];

const SEED_CODES = [
  {
    code: "QA-PRO-TRIAL",
    tier: "pro",
    durationDays: 30,
    maxUses: 5,
    description: "QA 测试：Pro 有效兑换码",
    expiresAt: daysFromNow(90),
  },
  {
    code: "QA-PREM-TRIAL",
    tier: "premium",
    durationDays: 30,
    maxUses: 5,
    description: "QA 测试：Premium 有效兑换码",
    expiresAt: daysFromNow(90),
  },
  {
    code: "QA-EXPIRED-CODE",
    tier: "pro",
    durationDays: 30,
    maxUses: 5,
    description: "QA 测试：已过期兑换码",
    expiresAt: daysFromNow(-30),
  },
];

const BLOOM_LABELS = ["记忆", "理解", "应用", "分析", "评价", "创造"];

async function seedUser(db: ReturnType<typeof drizzle>, seed: SeedUser, passwordHash: string) {
  await db
    .insert(users)
    .values({
      id: seed.id,
      email: seed.email,
      emailLower: seed.email.toLowerCase(),
      passwordHash,
      name: seed.name,
      membershipTier: seed.tier,
      membershipExpiresAt:
        seed.membershipDays === null ? null : daysFromNow(seed.membershipDays),
      aiGenerateCount: seed.aiGenerateCount,
      aiAdjustCount: 0,
      taskOpsCount: 0,
      lastUsageDate: beijingToday(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: seed.email,
        emailLower: seed.email.toLowerCase(),
        passwordHash,
        name: seed.name,
        membershipTier: seed.tier,
        membershipExpiresAt:
          seed.membershipDays === null ? null : daysFromNow(seed.membershipDays),
        aiGenerateCount: seed.aiGenerateCount,
        aiAdjustCount: 0,
        taskOpsCount: 0,
        lastUsageDate: beijingToday(),
        updatedAt: new Date(),
      },
    });

  // 重建任务树：先删该账号全部 task（subtasks 走 CASCADE）
  await db.delete(tasks).where(eq(tasks.userId, seed.id));

  for (let t = 0; t < seed.taskCount; t++) {
    const [task] = await db
      .insert(tasks)
      .values({
        userId: seed.id,
        title: `QA 任务 ${t + 1}：TypeScript 类型体操进阶`,
        rawInput: `我想系统掌握 TypeScript 高级类型，能独立写出工具类型（QA 任务 ${t + 1}）`,
        tags: JSON.stringify(["编程", "前端"]),
        startDate: daysFromNow(-1),
        status: "active",
        totalDays: 7,
      })
      .returning({ id: tasks.id });

    const startDays = [0, 1, 3, 6];
    for (let s = 0; s < startDays.length; s++) {
      const isDone = s < 2; // 前两个子任务已完成，供 streak / 统计用
      await db.insert(subtasks).values({
        taskId: task.id,
        title: `${BLOOM_LABELS[s]} 阶段：条件类型与 infer`,
        description: `第 ${startDays[s]} 天启动，预计 1 天完成。QA 种子数据。`,
        durationDays: 1,
        startDay: startDays[s],
        completed: isDone,
        sortOrder: s,
        resources: JSON.stringify([
          { type: "article", title: "TypeScript 官方手册 · 条件类型", url: "https://www.typescriptlang.org/docs/handbook/2/conditional-types.html" },
          { type: "video", title: "类型体操入门", searchQuery: "typescript 类型体操 教程" },
        ]),
        topic: "编程",
        urgency: 3,
        importance: 4,
        keywords: JSON.stringify(["typescript", "conditional-types", "infer"]),
        completedAt: isDone ? daysFromNow(-1 + startDays[s]) : null,
        bloomLevel: s + 1,
        deepWorkHours: 1.5,
      });
    }
  }
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL 未设置。请先在 .env.local 或 .env 中配置。");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("⏳ 哈希测试密码…");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const seed of SEED_USERS) {
    await seedUser(db, seed, passwordHash);
    console.log(`  ✅ ${seed.email} (${seed.tier}, ${seed.taskCount} 任务)`);
  }

  console.log("⏳ 写入兑换码…");
  for (const c of SEED_CODES) {
    await db
      .insert(redemptionCodes)
      .values({
        code: c.code,
        tier: c.tier,
        durationDays: c.durationDays,
        maxUses: c.maxUses,
        usedCount: 0,
        description: c.description,
        expiresAt: c.expiresAt,
      })
      .onConflictDoUpdate({
        target: redemptionCodes.code,
        set: {
          tier: c.tier,
          durationDays: c.durationDays,
          maxUses: c.maxUses,
          usedCount: 0,
          description: c.description,
          expiresAt: c.expiresAt,
        },
      });
    console.log(`  ✅ ${c.code} (${c.tier}, ${c.durationDays} 天)`);
  }

  // 自检：把刚写入的行读回来，确认配额边界真的置上了
  const exhausted = await db
    .select()
    .from(users)
    .where(eq(users.id, "qa-exhausted"));
  const row = exhausted[0];
  const ok =
    row?.aiGenerateCount === 5 && row?.lastUsageDate === beijingToday();
  console.log(
    ok
      ? `  ✅ 配额耗尽号校验通过（aiGenerateCount=${row?.aiGenerateCount}, lastUsageDate=${row?.lastUsageDate}）`
      : `  ❌ 配额耗尽号校验失败：aiGenerateCount=${row?.aiGenerateCount}, lastUsageDate=${row?.lastUsageDate}`
  );

  const leftover = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, SEED_USERS.map((u) => u.id)));
  console.log(`\n🎉 完成：${leftover.length}/${SEED_USERS.length} 个账号在位，密码统一为 ${PASSWORD}`);

  await client.end();
}

run().catch((err) => {
  console.error("❌ 种子脚本失败：", err);
  process.exit(1);
});
