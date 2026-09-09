import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications, type Notification } from "@/lib/db/schema";
import { memStore } from "../memory-store";

export async function createNotification(data: {
  userId: string;
  title: string;
  content: string;
  type?: "system" | "task" | "membership" | "achievement";
  link?: string;
}): Promise<Notification> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: Notification = {
    id,
    userId: data.userId,
    title: data.title,
    content: data.content,
    type: data.type || "system",
    link: data.link || null,
    isRead: false,
    createdAt: new Date(),
  };

  try {
    const inserted = await db
      .insert(notifications)
      .values(record)
      .returning();
    if (inserted[0]) return inserted[0];
  } catch {
    // fallback
  }

  memStore.notifications.set(id, record);
  return record;
}

export async function getNotificationsByUser(userId: string, limit = 50): Promise<Notification[]> {
  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    if (list) return list;
  } catch {
    // fallback
  }

  return Array.from(memStore.notifications.values())
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function markNotificationAsRead(id: string, userId: string): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  } catch {
    // fallback
  }

  const notif = memStore.notifications.get(id);
  if (notif && notif.userId === userId) {
    notif.isRead = true;
    memStore.notifications.set(id, notif);
  }
  return true;
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  } catch {
    // fallback
  }

  for (const notif of memStore.notifications.values()) {
    if (notif.userId === userId) {
      notif.isRead = true;
      memStore.notifications.set(notif.id, notif);
    }
  }
  return true;
}

export async function clearAllNotifications(userId: string): Promise<boolean> {
  try {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  } catch {
    // fallback
  }

  for (const [id, notif] of memStore.notifications.entries()) {
    if (notif.userId === userId) {
      memStore.notifications.delete(id);
    }
  }
  return true;
}
