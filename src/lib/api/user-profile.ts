import type { User } from "@/lib/eazo-shim";
import { request } from "./request";

export async function fetchUserProfile(): Promise<User | null> {
  try {
    const res = await request("/api/user/profile");
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; user: User };
    return json.ok ? json.user : null;
  } catch {
    return null;
  }
}
