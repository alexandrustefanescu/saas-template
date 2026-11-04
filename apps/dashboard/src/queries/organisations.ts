import { queryOptions, useQuery } from "@tanstack/react-query";
import { authClient } from "#/lib/auth-client";
import { queryKeys } from "./keys";

export type OrganisationSummary = {
  id: string;
  name: string;
  slug: string;
};

async function listOrganisations(): Promise<OrganisationSummary[]> {
  const { data, error } = await authClient.organization.list();
  if (error) {
    throw new Error(error.message || "Failed to load organisations.");
  }
  return (data as OrganisationSummary[] | null) ?? [];
}

export function organisationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.organisations.all(),
    queryFn: listOrganisations,
  });
}

export function useOrganisationsQuery() {
  return useQuery(organisationsQueryOptions());
}
