import { ActionButton } from "@react-spectrum/s2/ActionButton";
import Bell from "@react-spectrum/s2/icons/Bell";
import { DialogTrigger, Popover } from "@react-spectrum/s2/Popover";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { sampleNotifications } from "./nav-routes";

const panel = style({
  display: "flex",
  flexDirection: "column",
  width: 320,
  padding: 8,
  gap: 4,
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

export function NotificationsPopover() {
  return (
    <DialogTrigger>
      <ActionButton aria-label="Open notifications" isQuiet>
        <Bell />
      </ActionButton>
      <Popover hideArrow placement="right top" offset={12}>
        <div className={panel}>
          <div className={heading}>Notifications</div>
          {sampleNotifications.map((notification) => (
            <button key={notification.id} type="button" className={row}>
              <span className={avatar}>{notification.fallback}</span>
              <span className={copy}>
                <span className={text}>{notification.text}</span>
                <span className={time}>{notification.time}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            className={row}
            onClick={() =>
              ToastQueue.info("Notifications inbox is coming soon.", {
                timeout: 4000,
              })
            }
          >
            <span className={style({ font: "ui-sm", color: "gray-700" })}>
              View all notifications
            </span>
          </button>
        </div>
      </Popover>
    </DialogTrigger>
  );
}
