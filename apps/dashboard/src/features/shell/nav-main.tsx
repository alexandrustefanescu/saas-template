import { useState } from "react";
import { useRouterState, Link as RouterLink } from "@tanstack/react-router";
import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import ChevronUp from "@react-spectrum/s2/icons/ChevronUp";
import { Tooltip, TooltipTrigger } from "@react-spectrum/s2/Tooltip";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { dashboardRoutes, type NavRoute } from "./nav-routes";
import {
  sidebarEase,
  sidebarMotion,
  useCompactSidebar,
  useIconOnlyNav,
  useIsDesktop,
  useSidebarControlWidth,
} from "./sidebar-motion";

const navButtonBase = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  boxSizing: "border-box",
  width: "full",
  paddingX: 8,
  paddingY: 8,
  borderRadius: "lg",
  borderStyle: "none",
  backgroundColor: "transparent",
  color: "gray-700",
  cursor: "pointer",
  font: "ui-sm",
  fontWeight: "medium",
  textDecoration: "none",
  textAlign: "start",
});

const navButtonActive = style({
  backgroundColor: "gray-200",
  color: "gray-900",
});

const navRow = style({
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box",
  height: 40,
  padding: 0,
  gap: 0,
  borderRadius: "lg",
  borderStyle: "none",
  backgroundColor: "transparent",
  color: "gray-700",
  cursor: "pointer",
  font: "ui-sm",
  fontWeight: "medium",
  textDecoration: "none",
  overflow: "hidden",
  flexShrink: 0,
});

const iconSlot = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  flexShrink: 0,
});

const labelText = style({
  display: "block",
  paddingEnd: 12,
  whiteSpace: "nowrap",
});

const NavLink = motion.create(RouterLink);

function NavLabel({ title }: { title: string }) {
  const compact = useIconOnlyNav();
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      initial={false}
      animate={{
        opacity: compact ? 0 : 1,
        width: compact ? 0 : "auto",
      }}
      transition={{
        ...sidebarMotion(reduceMotion),
        opacity: {
          duration: reduceMotion ? 0 : 0.18,
          ease: sidebarEase,
          delay: compact || reduceMotion ? 0 : 0.08,
        },
      }}
      style={{ display: "block", overflow: "hidden", whiteSpace: "nowrap" }}
    >
      <span className={labelText}>{title}</span>
    </motion.span>
  );
}

function isRouteActive(pathname: string, route: NavRoute) {
  if (route.link === "/") return pathname === "/";
  if (pathname === route.link) return true;
  return Boolean(route.subs?.some((sub) => pathname === sub.link));
}

function NavLeaf({ route, active }: { route: NavRoute; active: boolean }) {
  const Icon = route.icon;
  const iconOnly = useIconOnlyNav();
  const width = useSidebarControlWidth();
  const reduceMotion = useReducedMotion();

  return (
    <TooltipTrigger delay={300} placement="bottom" isDisabled={!iconOnly}>
      <NavLink
        to={route.link}
        className={`${navRow} ${active ? navButtonActive : ""}`}
        aria-current={active ? "page" : undefined}
        initial={false}
        animate={{ width }}
        transition={sidebarMotion(reduceMotion)}
      >
        <span className={iconSlot}>
          <Icon />
        </span>
        <NavLabel title={route.title} />
      </NavLink>
      <Tooltip>{route.title}</Tooltip>
    </TooltipTrigger>
  );
}

function NavGroup({
  route,
  open,
  onOpenChange,
  pathname,
}: {
  route: NavRoute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  const Icon = route.icon;
  const active = isRouteActive(pathname, route);
  const iconOnly = useIconOnlyNav();
  const width = useSidebarControlWidth();
  const reduceMotion = useReducedMotion();
  const showSubs = open && !iconOnly;

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: "full",
      })}
    >
      <TooltipTrigger delay={300} placement="bottom" isDisabled={!iconOnly}>
        <motion.button
          type="button"
          className={`${navRow} ${active || open ? navButtonActive : ""}`}
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          initial={false}
          animate={{ width }}
          transition={sidebarMotion(reduceMotion)}
        >
          <span className={iconSlot}>
            <Icon />
          </span>
          <NavLabel title={route.title} />
          <motion.span
            initial={false}
            animate={{
              opacity: iconOnly ? 0 : 1,
              width: iconOnly ? 0 : "auto",
            }}
            transition={sidebarMotion(reduceMotion)}
            style={{ display: "flex", overflow: "hidden", flexShrink: 0 }}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </motion.span>
        </motion.button>
        <Tooltip>{route.title}</Tooltip>
      </TooltipTrigger>
      <AnimatePresence initial={false}>
        {showSubs ? (
          <motion.div
            key={`${route.id}-subs`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={sidebarMotion(reduceMotion)}
            style={{ overflow: "hidden", width: "100%" }}
          >
            <div
              className={style({
                display: "flex",
                flexDirection: "column",
                gap: 2,
                paddingStart: 16,
              })}
            >
              {route.subs?.map((sub) => {
                const subActive = pathname === sub.link;
                return (
                  <RouterLink
                    key={`${route.id}-${sub.title}`}
                    to={sub.link}
                    className={`${navButtonBase} ${subActive ? navButtonActive : ""}`}
                    aria-current={subActive ? "page" : undefined}
                  >
                    {sub.title}
                  </RouterLink>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const navColumn = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  width: "full",
});

const navBar = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  flexGrow: 1,
  minWidth: 0,
});

export function DashboardNavigation() {
  const compact = useCompactSidebar();
  const isDesktop = useIsDesktop();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [openId, setOpenId] = useState<string | null>(() => {
    const match = dashboardRoutes.find((route) => route.subs && isRouteActive(pathname, route));
    return match?.id ?? null;
  });

  return (
    <nav aria-label="Dashboard" className={isDesktop ? navColumn : navBar}>
      {dashboardRoutes.map((route) => {
        const hasSubs = Boolean(route.subs?.length);
        if (!hasSubs) {
          return <NavLeaf key={route.id} route={route} active={isRouteActive(pathname, route)} />;
        }

        return (
          <NavGroup
            key={route.id}
            route={route}
            pathname={pathname}
            open={!compact && openId === route.id}
            onOpenChange={(next) => setOpenId(next ? route.id : null)}
          />
        );
      })}
    </nav>
  );
}
