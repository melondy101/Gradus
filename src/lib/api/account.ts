"use client";
import { apiFetch } from "./result";
import type { CurrentUserView } from "@/lib/auth/current-user";

export type AccountResult = { ok?: boolean; error?: string; user?: CurrentUserView; message?: string; waitSeconds?: number; devCode?: string };
function post(path: string, body: unknown) {
  return apiFetch<AccountResult>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export const sendAccountVerification = (email: string, purpose: "email" | "password") => post("/api/user/account/code", { email, purpose });
export const changeAccountEmail = (email: string, code: string, currentPassword: string) => post("/api/user/account/email", { email, code, currentPassword });
export const changeAccountPassword = (password: string, currentPassword: string, code: string) => post("/api/user/account/password", { password, currentPassword, code });
export const bindExistingAccount = (email: string, password: string, confirm: boolean) => post("/api/user/account/merge", { email, password, confirm });
export const sendPasswordResetCode = (email: string) => post("/api/auth/reset-password/code", { email });
export const resetAccountPassword = (email: string, code: string, password: string) => post("/api/auth/reset-password", { email, code, password });
