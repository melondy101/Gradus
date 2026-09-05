import bcrypt from "bcryptjs";

/**
 * bcryptjs cost=10：演示场景在 Vercel Serverless 单次 < 200ms，
 * 既不会拖慢 register/login，也不会显著放大算力成本。
 */
const COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}