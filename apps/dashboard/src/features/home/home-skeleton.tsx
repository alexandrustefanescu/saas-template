import { Skeleton } from "@react-spectrum/s2/Skeleton";
import { Text } from "@react-spectrum/s2/Text";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";

const layout = style({
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

const welcome = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 8,
  width: "full",
  maxWidth: 640,
});

/** Route pending UI that mirrors the Home welcome page. */
export function HomeSkeleton() {
  return (
    <Skeleton isLoading>
      <section className={layout} aria-busy="true" aria-label="Loading home">
        <PageBreadcrumbs items={[{ id: "home", label: "Home" }]} />
        <div className={welcome}>
          <Text styles={style({ font: "heading-xl", margin: 0 })}>Welcome, Placeholder</Text>
          <Text styles={style({ font: "body", margin: 0 })}>
            Signed in as placeholder@example.com. Jump into your items or update your account
            settings when you are ready.
          </Text>
        </div>
      </section>
    </Skeleton>
  );
}
