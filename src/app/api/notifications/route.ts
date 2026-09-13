import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const list = await getNotificationsByUser(auth.user.id);
    const unreadCount = list.filter((n) => !n.isRead).length;

    return NextResponse.json({
      ok: true,
      notifications: list,
      unreadCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "获取通知失败";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.all) {
      await markAllNotificationsAsRead(auth.user.id);
    } else if (body.id) {
      await markNotificationAsRead(body.id, auth.user.id);
    }

    const list = await getNotificationsByUser(auth.user.id);
    const unreadCount = list.filter((n) => !n.isRead).length;

    return NextResponse.json({
      ok: true,
      notifications: list,
      unreadCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "标记通知失败";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    await clearAllNotifications(auth.user.id);
    return NextResponse.json({
      ok: true,
      notifications: [],
      unreadCount: 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "清除通知失败";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
