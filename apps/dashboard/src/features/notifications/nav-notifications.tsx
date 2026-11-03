import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import Bell from "@react-spectrum/s2/icons/Bell";
import { DialogTrigger, Popover } from "@react-spectrum/s2/Popover";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useIsDesktop } from "#/features/shell/sidebar-motion";
import { ApiError } from "#/lib/api/client";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "#/lib/api/notifications";

const panel = style({
  display: "flex",
  flexDirection: "column",
  width: "full",
  maxWidth: "full",
  padding: 8,
  gap: 4,
  boxSizing: "border-box",
});

const heading = style({
  font: "ui",
  fontWeight: "bold",
  paddingX: 8,
  paddingY: 8,
});

const row = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "full",
  paddingX: 8,
  paddingY: 8,
  borderRadius: "lg",
  borderStyle: "none",
  backgroundColor: "transparent",
  cursor: "pointer",
  textAlign: "start",
});

const avatar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: "full",
  backgroundColor: "gray-900",
  color: "white",
  font: "ui-xs",
  fontWeight: "bold",
  flexShrink: 0,
});

const copy = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

const text = style({
  font: "ui-sm",
  fontWeight: "medium",
  color: "gray-900",
});

const time = style({
  font: "ui-xs",
  color: "gray-600",
});

const bellWrap = style({
  display: "grid",
  placeItems: "center",
  position: "relative",
});

const unreadDot = style({
  position: "absolute",
  top: 4,
  right: 4,
  width: 8,
  height: 8,
  borderRadius: "full",
  backgroundColor: "red-900",
});

function notificationCreatedAt(notification: Notification) {
  return notification.created_at ?? notification.createdAt ?? "";
}

function relativeTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function kindFallback(kind: string) {
  if (kind === "item.created") return "IT";
  if (kind === "invitation.sent") return "IN";
  return "NO";
}

export function NotificationsPopover() {
  const isDesktop = useIsDesktop();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listNotifications();
      setNotifications(rows);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setNotifications([]);
        return;
      }
      ToastQueue.negative(
        error instanceof ApiError ? error.message : "Could not load notifications.",
        { timeout: 5000 },
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function markOne(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications((rows) =>
        rows.map((row) => (row.id === id ? { ...row, unread: false } : row)),
      );
    } catch (error) {
      ToastQueue.negative(
        error instanceof ApiError ? error.message : "Could not mark notification as read.",
        { timeout: 5000 },
      );
    }
  }

  async function markAll() {
    try {
      await markAllNotificationsRead();
      setNotifications((rows) => rows.map((row) => ({ ...row, unread: false })));
      ToastQueue.positive("All notifications marked as read.", { timeout: 3000 });
    } catch (error) {
      ToastQueue.negative(
        error instanceof ApiError ? error.message : "Could not mark notifications as read.",
        { timeout: 5000 },
      );
    }
  }

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
      }}
    >
      <ActionButton aria-label="Open notifications" isQuiet>
        <span className={bellWrap}>
          <Bell />
          {unreadCount > 0 ? (
            <span className={unreadDot} aria-hidden data-testid="notifications-unread-dot" />
          ) : null}
        </span>
      </ActionButton>
      <Popover hideArrow placement={isDesktop ? "right top" : "bottom end"} offset={12}>
        <div className={`notifications-panel ${panel}`} data-testid="notifications-panel">
          <div className={heading}>Notifications</div>
          {loading && notifications.length === 0 ? (
            <div className={style({ font: "ui-sm", color: "gray-700", paddingX: 8, paddingY: 8 })}>
              Loading…
            </div>
          ) : null}
          {!loading && notifications.length === 0 ? (
            <div className={style({ font: "ui-sm", color: "gray-700", paddingX: 8, paddingY: 8 })}>
              No notifications yet.
            </div>
          ) : null}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={row}
              onClick={() => {
                if (notification.unread) void markOne(notification.id);
              }}
            >
              <span className={avatar}>{kindFallback(notification.kind)}</span>
              <span className={copy}>
                <span className={text}>
                  {notification.unread ? "• " : ""}
                  {notification.title}: {notification.body}
                </span>
                <span className={time}>{relativeTime(notificationCreatedAt(notification))}</span>
              </span>
            </button>
          ))}
          {notifications.some((notification) => notification.unread) ? (
            <button type="button" className={row} onClick={() => void markAll()}>
              <span className={style({ font: "ui-sm", color: "gray-700" })}>Mark all as read</span>
            </button>
          ) : null}
        </div>
      </Popover>
    </DialogTrigger>
  );
}
