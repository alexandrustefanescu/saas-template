import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { Body, PageTitle } from "#/components/typography";
import { HomePage } from "#/features/home/home-page";
import { HomeSkeleton } from "#/features/home/home-skeleton";
import { meQueryOptions } from "#/queries/account";

export const Route = createFileRoute("/_dashboard/")({
  validateSearch: (search: Record<string, unknown>): { welcome?: boolean } => {
    const welcome = search.welcome === true || search.welcome === "true" || search.welcome === "1";
    return welcome ? { welcome: true } : {};
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQueryOptions()),
  pendingMs: 0,
  pendingComponent: HomeSkeleton,
  component: Home,
  errorComponent: HomeError,
});

function Home() {
  const { welcome } = Route.useSearch();
  return <HomePage justOnboarded={Boolean(welcome)} />;
}

function HomeError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        alignItems: "start",
        gap: 12,
        padding: 16,
      })}
    >
      <PageTitle>Home</PageTitle>
      <Body>{error instanceof Error ? error.message : "Could not load your account."}</Body>
      <Button
        variant="secondary"
        onPress={() => {
          void router.invalidate();
        }}
      >
        Try again
      </Button>
    </div>
  );
}
