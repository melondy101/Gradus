import type { Task, Subtask, User, RedemptionCode, RedemptionRecord, EmailVerification, Notification } from "./schema";

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
  notifications: Map<string, Notification>;
}

const globalForStore = globalThis as unknown as {
  __memStore?: MemoryStore;
};

export const memStore: MemoryStore =
  globalForStore.__memStore ?? {
    users: new Map<string, User>(),
    tasks: new Map<string, Task>(),
    subtasks: new Map<string, Subtask>(),
    authAttempts: [],
    redemptionCodes: new Map<string, RedemptionCode>(),
    redemptionRecords: new Map<string, RedemptionRecord>(),
    emailVerifications: new Map<string, EmailVerification>(),
    notifications: new Map<string, Notification>(),
  };

if (process.env.NODE_ENV !== "production") {
  globalForStore.__memStore = memStore;
}

