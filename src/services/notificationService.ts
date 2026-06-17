import { supabase } from "../lib/supabase";
import { NotificationRecord } from "../types/multiEntity";

function mapNotification(row: any): NotificationRecord {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    title: String(row.title ?? "Notification"),
    message: String(row.message ?? ""),
    read: Boolean(row.read),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function loadNotifications(participantId: string): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("notifications fetch failed", error.message);
    return [];
  }

  return (data ?? []).map(mapNotification);
}

export async function getUnreadNotificationCount(participantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", participantId)
    .eq("read", false);

  if (error) {
    console.warn("notifications unread count failed", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function markAllNotificationsRead(participantId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("participant_id", participantId)
    .eq("read", false);

  if (error) {
    console.warn("notifications mark read failed", error.message);
  }
}
