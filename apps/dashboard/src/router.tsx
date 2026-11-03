import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { PageSkeleton } from "#/features/shell/page-skeleton";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 200,
    defaultPendingComponent: PageSkeleton,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
