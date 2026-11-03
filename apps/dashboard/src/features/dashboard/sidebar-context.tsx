import { createContext, useContext } from "react";

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  value,
  children,
}: {
  value: SidebarContextValue;
  children: React.ReactNode;
}) {
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useDashboardSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useDashboardSidebar must be used within SidebarProvider");
  }
  return ctx;
}
