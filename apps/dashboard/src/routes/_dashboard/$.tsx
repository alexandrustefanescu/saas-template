import { createFileRoute } from "@tanstack/react-router";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Body, PageTitle } from "#/components/typography";

export const Route = createFileRoute("/_dashboard/$")({
  component: DashboardPlaceholder,
});

function titleFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "Page";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DashboardPlaceholder() {
  const { _splat } = Route.useParams();
  const pathname = `/${_splat ?? ""}`;
  const title = titleFromPath(pathname);

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 32,
      })}
    >
      <PageTitle>{title}</PageTitle>
      <Body>
        This is a placeholder for <strong>{pathname}</strong>. Wire this route to a product screen
        when you are ready.
      </Body>
    </div>
  );
}
