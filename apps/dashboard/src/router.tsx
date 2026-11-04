import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { PageSkeleton } from "#/features/shell/page-skeleton";
import type { AppQueryClient } from "#/lib/query-client";
import { routeTree } from "./routeTree.gen";

export type RouterContext = {
  queryClient: AppQueryClient;
};

export function getRouter(queryClient: AppQueryClient) {
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
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
