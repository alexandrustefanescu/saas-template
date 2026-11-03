import { ActionButton } from "@react-spectrum/s2/ActionButton";
import ChevronDoubleLeft from "@react-spectrum/s2/icons/ChevronDoubleLeft";
import ChevronDoubleRight from "@react-spectrum/s2/icons/ChevronDoubleRight";
import { Link } from "@react-spectrum/s2/Link";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "./logo";
import { DashboardNavigation } from "./nav-main";
import { NotificationsPopover } from "./nav-notifications";
import { useDashboardSidebar } from "./sidebar-context";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  sidebarMotion,
  useIsDesktop,
} from "./sidebar-motion";
import { spectrumStyles } from "#/spectrum-styles";
import { TeamSwitcher } from "./team-switcher";

const sidebarBase = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  margin: 12,
  padding: 12,
  borderRadius: "xl",
  backgroundColor: "gray-100",
  boxShadow: "elevated",
  boxSizing: "border-box",
  alignSelf: "stretch",
  minHeight: 0,
  width: "full",
  flexShrink: 0,
  overflow: "hidden",
});

const headerRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexDirection: "row",
});

const headerCollapsed = style({
  display: "flex",
  alignItems: "center",
  justifyContent: {
    default: "space-between",
    md: "center",
  },
  gap: 8,
  width: "full",
  flexDirection: {
    default: "row",
    md: "column",
  },
});

const toolsRow = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexDirection: "row",
});

const toolsCollapsed = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  width: "full",
  flexDirection: {
    default: "row",
    md: "column-reverse",
  },
});

const scrollArea = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
  paddingY: 8,
});

const footer = style({
  display: "flex",
  justifyContent: "center",
  paddingTop: 4,
  width: "full",
});

export function DashboardSidebar() {
  const { collapsed, toggle } = useDashboardSidebar();
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const compact = collapsed && isDesktop;
  const transition = sidebarMotion(reduceMotion);
  const layout = reduceMotion ? false : "position";

  return (
    <motion.aside
      aria-label="Application"
      className={sidebarBase}
      initial={false}
      animate={{
        width: isDesktop ? (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH) : "100%",
      }}
      transition={transition}
    >
      <motion.header
        layout={layout}
        layoutDependency={compact}
        transition={transition}
        className={compact ? headerCollapsed : headerRow}
      >
        <motion.div layout={layout} layoutDependency={compact} transition={transition}>
          <Link
            href={{ to: "/" }}
            aria-label="Home"
            isQuiet
            isStandalone
            styles={spectrumStyles(
              style({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: "neutral",
              }),
            )}
          >
            <Logo width={28} height={34} />
          </Link>
        </motion.div>

        <motion.div
          layout={layout}
          layoutDependency={compact}
          transition={transition}
          className={compact ? toolsCollapsed : toolsRow}
        >
          <NotificationsPopover />
          <ActionButton
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            isQuiet
            onPress={toggle}
          >
            {compact ? <ChevronDoubleRight /> : <ChevronDoubleLeft />}
          </ActionButton>
        </motion.div>
      </motion.header>

      <motion.div
        layout={layout}
        layoutDependency={compact}
        transition={transition}
        className={scrollArea}
      >
        <DashboardNavigation />
      </motion.div>

      <motion.footer
        layout={layout}
        layoutDependency={compact}
        transition={transition}
        className={footer}
      >
        <TeamSwitcher />
      </motion.footer>
    </motion.aside>
  );
}
