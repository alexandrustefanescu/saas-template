import { Skeleton } from "@react-spectrum/s2/Skeleton";
import { Text } from "@react-spectrum/s2/Text";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const layout = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 8,
  width: "full",
  boxSizing: "border-box",
  padding: 8,
});

/** Generic main-content placeholder while a dashboard route is pending. */
export function PageSkeleton() {
  return (
    <Skeleton isLoading>
      <div className={layout} aria-busy="true" aria-label="Loading page">
        <Text styles={style({ font: "heading-xl", margin: 0 })}>Loading page title</Text>
        <Text styles={style({ font: "body", margin: 0 })}>
          This placeholder approximates the page description so the layout does not jump when
          content arrives.
        </Text>
      </div>
    </Skeleton>
  );
}
