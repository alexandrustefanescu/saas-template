import type { QueryClient } from "@tanstack/react-query";
import { orgScopedQueryKeys, queryKeys } from "./keys";

/** Drop cached org-scoped `/v1` data after switching or creating an organisation. */
export function invalidateOrgScopedQueries(queryClient: QueryClient) {
  for (const key of orgScopedQueryKeys) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.account.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.organisations.all() });
}
