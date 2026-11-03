import { useEffect, useState } from "react";
import { useDashboardSidebar } from "./sidebar-context";

export const SIDEBAR_EXPANDED_WIDTH = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const SIDEBAR_ITEM_WIDTH = 40;
export const SIDEBAR_CONTENT_WIDTH = SIDEBAR_EXPANDED_WIDTH - 24;

export const sidebarEase = [0.22, 1, 0.36, 1] as const;

export function sidebarMotion(reduceMotion: boolean | null) {
  if (reduceMotion) return { duration: 0 };
  return { duration: 0.48, ease: sidebarEase };
}

const RAIL_QUERY = "(min-width: 64rem)";
const PHONE_QUERY = "(max-width: 40rem)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useIsDesktop() {
  return useMediaQuery(RAIL_QUERY);
}

export function useIsPhone() {
  return useMediaQuery(PHONE_QUERY);
}

export function useCompactSidebar() {
  const { collapsed } = useDashboardSidebar();
  const isDesktop = useIsDesktop();
  return collapsed && isDesktop;
}

export function useIconOnlyNav() {
  const compact = useCompactSidebar();
  const phone = useIsPhone();
  return compact || phone;
}

export function useSidebarControlWidth() {
  const iconOnly = useIconOnlyNav();
  const isDesktop = useIsDesktop();
  if (iconOnly) return SIDEBAR_ITEM_WIDTH;
  if (isDesktop) return SIDEBAR_CONTENT_WIDTH;
  return "auto" as const;
}
