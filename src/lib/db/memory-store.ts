import type { Task, Subtask, User, RedemptionCode, RedemptionRecord, EmailVerification } from "./schema";

export interface AuthAttemptRecord {
  id: string;
  ip: string;
  kind: "register" | "login";
  attemptedAt: Date;
}

export interface MemoryStore {
  users: Map<string, User>;
  tasks: Map<string, Task>;
  subtasks: Map<string, Subtask>;
  authAttempts: AuthAttemptRecord[];
  redemptionCodes: Map<string, RedemptionCode>;
  redemptionRecords: Map<string, RedemptionRecord>;
  emailVerifications: Map<string, EmailVerification>;
}

const globalForStore = globalThis as unknown as {
  __memStore?: MemoryStore;
};

function createInitialRedemptionCodes(): Map<string, RedemptionCode> {
  const map = new Map<string, RedemptionCode>();
  const initialCodes: RedemptionCode[] = [
    {
      id: "code-vip888",
      code: "VIP888",
      tier: "pro",
      durationDays: 30,
      maxUses: 1000,
      usedCount: 0,
      description: "专业版 Pro 体验月卡（30天）",
      expiresAt: null,
      createdAt: new Date(),
    },
    {
      id: "code-pro30",
      code: "PRO30",
      tier: "pro",
      durationDays: 30,
      maxUses: 1000,
      usedCount: 0,
      description: "专业版 Pro 30天成长卡",
      expiresAt: null,
      createdAt: new Date(),
    },
    {
      id: "code-gradus2026",
      code: "GRADUS2026",
      tier: "pro",
      durationDays: 90,
      maxUses: 1000,
      usedCount: 0,
      description: "拾级 Gradus 90天进阶季度卡",
      expiresAt: null,
      createdAt: new Date(),
    },
    {
      id: "code-premium-super",
      code: "PREMIUM-SUPER",
      tier: "premium",
      durationDays: 365,
      maxUses: 500,
      usedCount: 0,
      description: "尊享版 Premium 年度旗舰卡（365天）",
      expiresAt: null,
      createdAt: new Date(),
    },
    {
      id: "code-talktask-vip",
      code: "TALKTASK-VIP",
      tier: "pro",
      durationDays: 30,
      maxUses: 1000,
      usedCount: 0,
      description: "TalkTask 专属体验卡（30天）",
      expiresAt: null,
      createdAt: new Date(),
    },
  ];

  for (const c of initialCodes) {
    map.set(c.code.toUpperCase(), c);
  }
  return map;
}

export const memStore: MemoryStore =
  globalForStore.__memStore ?? {
    users: new Map<string, User>(),
    tasks: new Map<string, Task>(),
    subtasks: new Map<string, Subtask>(),
    authAttempts: [],
    redemptionCodes: createInitialRedemptionCodes(),
    redemptionRecords: new Map<string, RedemptionRecord>(),
    emailVerifications: new Map<string, EmailVerification>(),
  };

if (process.env.NODE_ENV !== "production") {
  globalForStore.__memStore = memStore;
}

