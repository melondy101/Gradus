import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import postgres from "postgres";
import { ensureSchema } from "./ensure-schema";

config({ path: ".env" });

export const runMigrate = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL environment variable is not defined.");
    process.exit(1);
  }

  // 打印脱敏连接信息（便于核对连接的目标是 neondb、postgres 还是其他库）
  try {
    const parsed = new URL(dbUrl);
    console.log(`[db] Target Host: ${parsed.hostname}:${parsed.port || 5432}, Database: ${parsed.pathname.replace(/^\//, "")}, User: ${parsed.username}`);
  } catch {
    console.log("[db] Target: [Custom or complex connection string]");
  }

  const client = postgres(dbUrl, { max: 1, connect_timeout: 15 });
  const db = drizzle(client);

  console.log("⏳ Running Drizzle migrations from migrations folder...");
  const start = Date.now();

  try {
    const migrationsFolder = path.join(process.cwd(), "src/lib/db/migrations");
    await migrate(db, { migrationsFolder });
    console.log(`✅ File migrations completed in ${Date.now() - start} ms`);
  } catch (migErr) {
    console.warn("⚠️ Migrator encountered an issue, running DDL schema self-heal fallback...", migErr);
  }

  // 紧接着运行幂等 schema ensure，确保所有业务表与列均已就位
  try {
    await ensureSchema();
    console.log("✅ Schema validation & self-heal succeeded.");
  } catch (schemaErr) {
    console.error("❌ Schema ensure failed:", schemaErr);
    throw schemaErr;
  }

  await client.end();
  console.log(`🎉 Database ready in ${Date.now() - start} ms`);
};

if (require.main === module || process.argv[1]?.endsWith("migrate.ts")) {
  runMigrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Migration failed with fatal error:", err);
      process.exit(1);
    });
}
