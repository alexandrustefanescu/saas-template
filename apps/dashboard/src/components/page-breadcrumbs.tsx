import { Breadcrumb, Breadcrumbs } from "@react-spectrum/s2/Breadcrumbs";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

export type PageCrumb = {
  id: string;
  label: string;
  href?: string;
};

type Props = {
  items: PageCrumb[];
  "aria-label"?: string;
};

const wrap = style({
  width: "full",
  flexShrink: 0,
});

/** Spectrum breadcrumbs for dashboard page headers. */
export function PageBreadcrumbs({ items, "aria-label": ariaLabel = "Breadcrumbs" }: Props) {
  return (
    <div className={wrap}>
      <Breadcrumbs aria-label={ariaLabel}>
        {items.map((item) => (
          <Breadcrumb key={item.id} id={item.id} href={item.href}>
            {item.label}
          </Breadcrumb>
        ))}
      </Breadcrumbs>
    </div>
  );
}
