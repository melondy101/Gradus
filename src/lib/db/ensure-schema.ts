import { sql } from "drizzle-orm";
import { db } from "./client";

let schemaEnsuredPromise: Promise<void> | null = null;

/**
 * 运行时数据库 Schema 幂等保障（自愈机制）
 * 解决生产环境（如 Neon / Vercel）在未手动执行 migration 或部署新分支时的 schema drift 问题。
 * 所有语句均为 CREATE TABLE IF NOT EXISTS 或 ALTER TABLE ... ADD COLUMN IF NOT EXISTS，
 * 毫秒级执行，全局仅执行一次。
 */
export async function ensureSchema(): Promise<void> {
  if (!schemaEnsuredPromise) {
    schemaEnsuredPromise = (async () => {
      try {
        await db.execute(sql`
          -- 1. users 表及其所有列
          CREATE TABLE IF NOT EXISTS users (
            id varchar(128) PRIMARY KEY NOT NULL,
            email varchar(256) UNIQUE,
            email_lower varchar(256) UNIQUE,
            password_hash text DEFAULT '' NOT NULL,
            name text,
            avatar_url text,
            watcha_openid varchar(128) UNIQUE,
            membership_tier varchar(32) DEFAULT 'free' NOT NULL,
            membership_expires_at timestamp,
            ai_generate_count integer DEFAULT 0 NOT NULL,
            ai_adjust_count integer DEFAULT 0 NOT NULL,
            task_ops_count integer DEFAULT 0 NOT NULL,
            last_usage_date varchar(10),
            created_at timestamp DEFAULT now() NOT NULL,
            updated_at timestamp DEFAULT now() NOT NULL
          );

          ALTER TABLE users ADD COLUMN IF NOT EXISTS email varchar(256);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS email_lower varchar(256);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text DEFAULT '' NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS watcha_openid varchar(128);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier varchar(32) DEFAULT 'free' NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_expires_at timestamp;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_generate_count integer DEFAULT 0 NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_adjust_count integer DEFAULT 0 NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS task_ops_count integer DEFAULT 0 NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_usage_date varchar(10);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now() NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;

          -- 2. tasks 表
          CREATE TABLE IF NOT EXISTS tasks (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            user_id varchar(128) NOT NULL,
            title text NOT NULL,
            raw_input text,
            start_date timestamp with time zone,
            status text DEFAULT 'active' NOT NULL,
            total_days integer DEFAULT 0 NOT NULL,
            created_at timestamp with time zone DEFAULT now() NOT NULL,
            updated_at timestamp with time zone DEFAULT now() NOT NULL
          );

          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS raw_input text;
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_days integer DEFAULT 0 NOT NULL;

          -- 3. subtasks 表
          CREATE TABLE IF NOT EXISTS subtasks (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            task_id uuid NOT NULL,
            title text NOT NULL,
            description text,
            duration_days integer DEFAULT 1 NOT NULL,
            start_day integer DEFAULT 0 NOT NULL,
            completed boolean DEFAULT false NOT NULL,
            sort_order integer DEFAULT 0 NOT NULL,
            resources text,
            topic text,
            urgency integer,
            importance integer,
            keywords text,
            completed_at timestamp with time zone,
            bloom_level integer,
            deep_work_hours real,
            created_at timestamp with time zone DEFAULT now() NOT NULL
          );

          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS resources text;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS topic text;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS urgency integer;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS importance integer;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS keywords text;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS bloom_level integer;
          ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS deep_work_hours real;

          -- 4. notifications 表
          CREATE TABLE IF NOT EXISTS notifications (
            id varchar(128) PRIMARY KEY NOT NULL,
            user_id varchar(128) NOT NULL,
            title text NOT NULL,
            content text NOT NULL,
            type varchar(32) DEFAULT 'system' NOT NULL,
            link text,
            is_read boolean DEFAULT false NOT NULL,
            created_at timestamp DEFAULT now() NOT NULL
          );

          -- 5. auth_attempts 表
          CREATE TABLE IF NOT EXISTS auth_attempts (
            id text PRIMARY KEY NOT NULL,
            ip text NOT NULL,
            kind text NOT NULL,
            attempted_at timestamp with time zone DEFAULT now() NOT NULL
          );

          -- 6. 会员与兑换码相关表
          CREATE TABLE IF NOT EXISTS redemption_codes (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            code varchar(64) NOT NULL UNIQUE,
            tier varchar(32) DEFAULT 'pro' NOT NULL,
            duration_days integer DEFAULT 30 NOT NULL,
            max_uses integer DEFAULT 100 NOT NULL,
            used_count integer DEFAULT 0 NOT NULL,
            description text,
            expires_at timestamp,
            created_at timestamp DEFAULT now() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS redemption_records (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            user_id varchar(128) NOT NULL,
            code_id uuid,
            code varchar(64) NOT NULL,
            tier varchar(32) NOT NULL,
            duration_days integer NOT NULL,
            redeemed_at timestamp DEFAULT now() NOT NULL
          );

          -- 7. 邮箱验证码表
          CREATE TABLE IF NOT EXISTS email_verifications (
            id varchar(36) PRIMARY KEY NOT NULL,
            email varchar(256) NOT NULL,
            email_lower varchar(256) NOT NULL,
            code varchar(6) NOT NULL,
            attempts integer DEFAULT 0 NOT NULL,
            expires_at timestamp NOT NULL,
            created_at timestamp DEFAULT now() NOT NULL
          );

          -- 索引补齐
          CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
          CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (email_lower);
          CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks (user_id);
          CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON subtasks (task_id);
          CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
        `);
        console.log("[db] Database schema verified and ensured successfully.");
      } catch (err) {
        // 如果这里出错，重置 Promise 以便下次重试，并向上抛出
        schemaEnsuredPromise = null;
        console.error("[db] Error ensuring database schema:", err);
        throw err;
      }
    })();
  }
  return schemaEnsuredPromise;
}
