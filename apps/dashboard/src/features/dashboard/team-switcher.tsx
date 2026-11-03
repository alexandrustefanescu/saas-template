import { useState } from "react";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import Add from "@react-spectrum/s2/icons/Add";
import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import { Keyboard, Menu, MenuItem, MenuTrigger, Text as MenuText } from "@react-spectrum/s2/Menu";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { motion, useReducedMotion } from "motion/react";
import { spectrumStyles } from "#/spectrum-styles";
import { Logo } from "./logo";
import { teams } from "./nav-routes";
import { sidebarMotion, useCompactSidebar, useSidebarControlWidth } from "./sidebar-motion";

const trigger = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
  paddingX: 8,
  paddingY: 4,
  borderRadius: "lg",
  borderWidth: 0,
  borderStyle: "none",
  backgroundColor: "white",
  boxShadow: "elevated",
  cursor: "pointer",
  textAlign: "start",
  boxSizing: "border-box",
});

const mark = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: "default",
  flexShrink: 0,
  overflow: "hidden",
});

const copy = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minWidth: 0,
});

const nameStyle = style({
  font: "ui-sm",
  fontWeight: "bold",
  color: "gray-900",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const planStyle = style({
  font: "ui-xs",
  color: "gray-600",
});

export function TeamSwitcher() {
  const compact = useCompactSidebar();
  const width = useSidebarControlWidth();
  const reduceMotion = useReducedMotion();
  const [activeTeamId, setActiveTeamId] = useState(teams[0]?.id ?? "1");
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  if (!activeTeam) return null;

  return (
    <motion.div
      initial={false}
      animate={{ width, height: compact ? 40 : 48 }}
      transition={sidebarMotion(reduceMotion)}
      style={{
        overflow: "hidden",
        flexShrink: 0,
        maxWidth: "100%",
        borderRadius: 10,
      }}
    >
      <MenuTrigger direction="end" align="start">
        <ActionButton
          aria-label={`Switch team, ${activeTeam.name}`}
          isQuiet
          UNSAFE_className="team-switcher"
          styles={spectrumStyles(trigger)}
        >
          <span className={mark}>
            <Logo width={16} height={18} />
          </span>
          <motion.span
            className={copy}
            initial={false}
            animate={{ opacity: compact ? 0 : 1 }}
            transition={sidebarMotion(reduceMotion)}
          >
            <span className={nameStyle}>{activeTeam.name}</span>
            <span className={planStyle}>{activeTeam.plan}</span>
          </motion.span>
          <motion.span
            aria-hidden
            initial={false}
            animate={{ opacity: compact ? 0 : 1 }}
            transition={sidebarMotion(reduceMotion)}
            style={{ display: "flex", flexShrink: 0, marginLeft: "auto" }}
          >
            <ChevronDown />
          </motion.span>
        </ActionButton>
        <Menu
          aria-label="Teams"
          onAction={(key) => {
            const id = String(key);
            if (id === "add-team") {
              ToastQueue.info("Add team is coming soon.", { timeout: 4000 });
              return;
            }
            setActiveTeamId(id);
          }}
        >
          {teams.map((team, index) => (
            <MenuItem key={team.id} id={team.id} textValue={team.name}>
              <Logo slot="icon" width={16} height={16} />
              <MenuText slot="label">{team.name}</MenuText>
              <Keyboard>⌘{index + 1}</Keyboard>
            </MenuItem>
          ))}
          <MenuItem id="add-team" textValue="Add team">
            <Add />
            <MenuText slot="label">Add team</MenuText>
          </MenuItem>
        </Menu>
      </MenuTrigger>
    </motion.div>
  );
}
