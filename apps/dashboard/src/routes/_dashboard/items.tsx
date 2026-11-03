import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { Body, PageTitle } from "#/components/typography";
import { ItemsSkeleton } from "#/features/items/items-skeleton";
import { ItemsTable } from "#/features/items/items-table";
import { listItems } from "#/lib/api/items";

export const Route = createFileRoute("/_dashboard/items")({
  loader: () => listItems(),
  pendingMs: 0,
  pendingComponent: ItemsSkeleton,
  component: ItemsPage,
  errorComponent: ItemsError,
});

function ItemsPage() {
  const items = Route.useLoaderData();
  return <ItemsTable initialItems={items} />;
}

function ItemsError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const message = error instanceof Error ? error.message : "Could not load items.";
  const needsOrganisation = /organisation/i.test(message);

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
      <PageTitle>Items</PageTitle>
      <Body>{message}</Body>
      {needsOrganisation ? (
        <Body>
          Use the organisation switcher in the sidebar, or open Settings → Organisation to create
          one.
        </Body>
      ) : null}
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
