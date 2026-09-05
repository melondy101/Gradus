import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";

async function main() {
  const client = postgres(url, { max: 1 });
  await client`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS raw_input TEXT`;
  console.log("✓ raw_input column added to tasks");
  await client.end();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
