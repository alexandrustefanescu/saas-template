import { useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { DashboardSidebar } from "#/features/shell/dashboard-sidebar";
import { SidebarProvider } from "#/features/shell/sidebar-context";
import { requireOrganisation } from "#/lib/auth-client";

export const Route = createFileRoute("/_dashboard")({
  beforeLoad: requireOrganisation,
  component: DashboardLayout,
});

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarProvider
      value={{
        collapsed,
        toggle: () => setCollapsed((value) => !value),
      }}
    >
      <div
        className={`dashboard-shell ${style({
          display: "flex",
          flexDirection: {
            default: "column",
            lg: "row",
          },
          alignItems: "stretch",
          height: "screen",
          width: "full",
          backgroundColor: "gray-100",
          boxSizing: "border-box",
          overflow: "hidden",
        })}`}
      >
        <DashboardSidebar />
        <main
          className={style({
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            margin: {
              default: 12,
              md: 12,
            },
            marginTop: {
              default: 0,
              lg: 12,
            },
            padding: 8,
            borderRadius: "xl",
            backgroundColor: "white",
            boxShadow: "elevated",
            overflow: "hidden",
          })}
        >
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
