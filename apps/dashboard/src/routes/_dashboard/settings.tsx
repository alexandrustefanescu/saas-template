import { useNavigate, createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";
import { Body, PageTitle } from "#/components/typography";
import { SettingsPanel, type SettingsCategory } from "#/features/settings/settings-panel";
import { SettingsSkeleton } from "#/features/settings/settings-skeleton";
import { authClient } from "#/lib/auth-client";
import { meQueryOptions } from "#/queries/account";
import { webhooksQueryOptions } from "#/queries/webhooks";

const page = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 16,
  width: "full",
  height: "full",
  minHeight: 0,
  flexGrow: 1,
  boxSizing: "border-box",
  padding: 8,
});

const header = style({
  display: "flex",
  flexDirection: {
    default: "column",
    sm: "row",
  },
  alignItems: {
    default: "stretch",
    sm: "start",
  },
  justifyContent: "space-between",
  gap: 12,
  width: "full",
  flexShrink: 0,
});

const categories = ["profile", "email", "password", "organisation", "webhooks", "account"] as const;

function parseCategory(value: unknown): SettingsCategory | undefined {
  return typeof value === "string" && (categories as readonly string[]).includes(value)
    ? (value as SettingsCategory)
    : undefined;
}

export const Route = createFileRoute("/_dashboard/settings")({
  validateSearch: (search: Record<string, unknown>): { category?: SettingsCategory } => {
    const category = parseCategory(search.category);
    return category ? { category } : {};
  },
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(meQueryOptions());
    await context.queryClient.ensureQueryData(webhooksQueryOptions());
    return { account };
  },
  pendingMs: 0,
  pendingComponent: SettingsSkeleton,
  component: SettingsPage,
  errorComponent: SettingsError,
});

function SettingsPage() {
  const { account } = Route.useLoaderData();
  const { category } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <section className={page} aria-labelledby="settings-heading">
      <PageBreadcrumbs
        items={[
          { id: "home", label: "Home", href: "/" },
          { id: "settings", label: "Settings" },
        ]}
      />
      <div className={header}>
        <div className={style({ display: "flex", flexDirection: "column", gap: 4 })}>
          <PageTitle id="settings-heading">Settings</PageTitle>
          <Body>Manage your profile, security, and integrations.</Body>
        </div>
        <Button
          variant="secondary"
          onPress={() => {
            void authClient.signOut().then(async ({ error }) => {
              if (error) {
                ToastQueue.negative(error.message || "Could not sign out.", { timeout: 5000 });
                return;
              }
              await navigate({ to: "/sign-in" });
            });
          }}
        >
          Sign out
        </Button>
      </div>

      <SettingsPanel user={account.user} defaultCategory={category ?? "profile"} />
    </section>
  );
}

function SettingsError({ error }: ErrorComponentProps) {
  const navigate = useNavigate();

  return (
    <div className={page}>
      <PageTitle>Settings</PageTitle>
      <Body>{error instanceof Error ? error.message : "Could not load your account."}</Body>
      <Button
        variant="secondary"
        onPress={() => {
          void navigate({ to: "/" });
        }}
      >
        Back to home
      </Button>
    </div>
  );
}
