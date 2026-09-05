import type { Task, Subtask, User } from "./schema";

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
  };

if (process.env.NODE_ENV !== "production") {
  globalForStore.__memStore = memStore;
}
