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

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 48rem)").matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 48rem)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function useCompactSidebar() {
  const { collapsed } = useDashboardSidebar();
  const isDesktop = useIsDesktop();
  return collapsed && isDesktop;
}

export function useSidebarControlWidth() {
  const compact = useCompactSidebar();
  const isDesktop = useIsDesktop();
  if (compact) return SIDEBAR_ITEM_WIDTH;
  if (isDesktop) return SIDEBAR_CONTENT_WIDTH;
  return "100%" as const;
}
