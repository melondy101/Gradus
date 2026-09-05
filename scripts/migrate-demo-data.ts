/**
 * 一键脚本：清理 demo 用户痕迹。
 *
 * 行为：
 *   1. 把 `users.email = 'demo@autotask.app'` 的行上所有任务的 `user_id`
 *      改到一个新的"保留账号"下（`preserved@local`），这样 demo 账号下
 *      的任务不会随 demo 账号删除而 CASCADE 丢失。
 *   2. 删除 `email = 'demo@autotask.app'` 的 users 行（连带 CASCADE 清掉没
 *      迁移的子任务）。
 *   3. 幂等：跑第二次不会报错（没有可清理的 demo 行时跳过即可）。
 *
 * 用法：
 *   bun run scripts/migrate-demo-data.ts
 *
 * 设计取舍：
 *   - 保留 demo 账号下的任务而不是直接清，是因为自托管演示版可能
 *     已经积累了一些学习记录；清空对体验太重。
 *   - 默认保留账号命名"保留数据"，作为"这是迁移前的 demo 数据"
 *     的视觉提示。
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, tasks } from "../src/lib/db/schema";

config({ path: ".env" });

const PRESERVED_ID = "preserved-account";
const PRESERVED_EMAIL = "preserved@local";
const PRESERVED_NAME = "保留数据";
const DEMO_EMAIL = "demo@autotask.app";

async function run() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/myapp";
  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("⏳ Cleaning demo user rows…");

  // 1) 找 demo 行
  const demoRows = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_EMAIL));
  if (demoRows.length === 0) {
    console.log("✅ No demo rows found. Nothing to do.");
    await client.end();
    return;
  }

  // 2) 确保"保留账号"存在
  await db
    .insert(users)
    .values({
      id: PRESERVED_ID,
      email: PRESERVED_EMAIL,
      emailLower: PRESERVED_EMAIL,
      name: PRESERVED_NAME,
      passwordHash: "",
      avatarUrl: null,
    })
    .onConflictDoNothing();

  // 3) 把 demo 行下所有任务的 user_id 改成 preserved 账号
  const demoIds: string[] = demoRows.map((r: { id: string }) => r.id);
  let moved = 0;
  for (const demoId of demoIds) {
    const res = await db
      .update(tasks)
      .set({ userId: PRESERVED_ID, updatedAt: new Date() })
      .where(eq(tasks.userId, demoId))
      .returning({ id: tasks.id });
    moved += res.length;
  }

  // 4) 删 demo 行（CASCADE 会兜底子任务）
  for (const demoId of demoIds) {
    await db.delete(users).where(eq(users.id, demoId));
  }

  console.log(
    `✅ Done. Removed ${demoRows.length} demo user(s); migrated ${moved} task(s) to "${PRESERVED_NAME}" (${PRESERVED_ID}).`,
  );
  await client.end();
}

run().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});