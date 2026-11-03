import { api } from "./client";

export type Notification = {
  id: string;
  organizationId?: string;
  organization_id?: string;
  kind: string;
  title: string;
  body: string;
  actorUserId?: string | null;
  actor_user_id?: string | null;
  createdAt?: string;
  created_at?: string;
  unread: boolean;
};

export function listNotifications() {
  return api<Notification[]>("/v1/notifications");
}

export function markNotificationRead(id: string) {
  return api<void>(`/v1/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return api<void>("/v1/notifications/read-all", { method: "POST" });
}
