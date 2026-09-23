/**
 * 一键脚本：给「没有任何任务」的用户灌入演示数据。
 *
 * 行为：
 *   1. 遍历 users 表，对每个零任务用户调用 seedDemoDataForUser（幂等，
 *      已有任务的用户自动跳过）。
 *   2. 新访客本就在建号时自动播种（src/lib/auth/temp-account.ts），
 *      本脚本用于给脚本运行前就已存在的账号补种（比如自托管演示站的
 *      老账号、本地开发账号）。
 *
 * 用法：
 *   bun run db:seed-demo
 *
 * 环境：读取 .env 的 DATABASE_URL（src/lib/db/client.ts 启动时也会加载同一份）。
 */
import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import { seedDemoDataForUser } from "../src/lib/demo/demo-data";

async function run() {
  const allUsers = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users);

  if (allUsers.length === 0) {
    console.log("✅ No users found. Nothing to do.");
    return;
  }

  let seeded = 0;
  let skipped = 0;
  for (const user of allUsers) {
    const didSeed = await seedDemoDataForUser(user.id);
    if (didSeed) {
      seeded++;
      console.log(`   ↳ seeded: ${user.name ?? "(no name)"} <${user.email}>`);
    } else {
      skipped++;
    }
  }

  console.log(
    `✅ Done. Seeded ${seeded} user(s); skipped ${skipped} (already have tasks).`,
  );
}

run().catch((err) => {
  console.error("❌ Seed failed");
  console.error(err);
  process.exit(1);
});
