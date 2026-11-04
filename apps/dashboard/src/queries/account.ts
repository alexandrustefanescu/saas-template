import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMe } from "#/lib/api/account";
import { queryKeys } from "./keys";

export function meQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.account.me(),
    queryFn: getMe,
  });
}

export function useMeQuery() {
  return useQuery(meQueryOptions());
}
