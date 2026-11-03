import { redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

const configuredBaseUrl = import.meta.env.VITE_API_URL;

export const authClient = createAuthClient({
  baseURL: configuredBaseUrl || undefined,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [organizationClient()],
});

export async function requireSession() {
  const { data } = await authClient.getSession();
  if (!data) {
    throw redirect({ to: "/sign-in" });
  }
  return { session: data };
}

/** Session required and at least one organisation membership. */
export async function requireOrganisation() {
  const { session } = await requireSession();
  const { data, error } = await authClient.organization.list();
  if (error) {
    // Auth/network failures should not bounce users into a create loop.
    return { session, organisations: [] as Array<{ id: string; name: string; slug: string }> };
  }
  const organisations = (data as Array<{ id: string; name: string; slug: string }> | null) ?? [];
  if (organisations.length === 0) {
    throw redirect({ to: "/onboarding" });
  }
  return { session, organisations };
}

export async function redirectIfSignedIn() {
  const { data } = await authClient.getSession();
  if (data) {
    throw redirect({ to: "/" });
  }
}

export function accountNameFromEmail(email: string) {
  const name = email.split("@")[0]?.trim();
  return name || "User";
}

/** Active organisation id from a better-auth session payload. */
export function activeOrganizationIdFromSession(
  session: { session?: Record<string, unknown> } | null | undefined,
): string | undefined {
  const value = session?.session?.activeOrganizationId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Turns a display name into a URL-safe organisation slug. */
export function slugifyOrganisationName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `org-${Date.now().toString(36)}`;
}
