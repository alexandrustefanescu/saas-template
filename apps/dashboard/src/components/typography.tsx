import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

/**
 * Spectrum S2 `font` tokens, compiled statically so the style macro can resolve them.
 * Prefer these over standalone Spectrum `Heading`/`Text` outside slot contexts.
 */
const variants = {
  "heading-3xl": style({ font: "heading-3xl", margin: 0 }),
  "heading-2xl": style({ font: "heading-2xl", margin: 0 }),
  "heading-xl": style({ font: "heading-xl", margin: 0 }),
  "heading-lg": style({ font: "heading-lg", margin: 0 }),
  heading: style({ font: "heading", margin: 0 }),
  "heading-sm": style({ font: "heading-sm", margin: 0 }),
  "heading-xs": style({ font: "heading-xs", margin: 0 }),
  "title-3xl": style({ font: "title-3xl", margin: 0 }),
  "title-2xl": style({ font: "title-2xl", margin: 0 }),
  "title-xl": style({ font: "title-xl", margin: 0 }),
  "title-lg": style({ font: "title-lg", margin: 0 }),
  title: style({ font: "title", margin: 0 }),
  "title-sm": style({ font: "title-sm", margin: 0 }),
  "body-xl": style({ font: "body-xl", margin: 0 }),
  "body-lg": style({ font: "body-lg", margin: 0 }),
  body: style({ font: "body", margin: 0 }),
  "body-sm": style({ font: "body-sm", margin: 0 }),
  "body-xs": style({ font: "body-xs", margin: 0 }),
  "detail-xl": style({ font: "detail-xl", margin: 0 }),
  "detail-lg": style({ font: "detail-lg", margin: 0 }),
  detail: style({ font: "detail", margin: 0 }),
  "detail-sm": style({ font: "detail-sm", margin: 0 }),
  "ui-lg": style({ font: "ui-lg", margin: 0 }),
  ui: style({ font: "ui", margin: 0 }),
  "ui-sm": style({ font: "ui-sm", margin: 0 }),
  code: style({ font: "code", margin: 0 }),
  "code-sm": style({ font: "code-sm", margin: 0 }),
} as const;

export type TypographyVariant = keyof typeof variants;

type OwnProps<T extends ElementType> = {
  as?: T;
  variant?: TypographyVariant;
  children?: ReactNode;
  className?: string;
};

export type TypographyProps<T extends ElementType = "p"> = OwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof OwnProps<T>>;

export function Typography<T extends ElementType = "p">({
  as,
  variant = "body",
  className,
  children,
  ...props
}: TypographyProps<T>) {
  const Component = as ?? "p";
  const classes = [variants[variant], className].filter(Boolean).join(" ");

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

/** Page-level brand/title (h1). */
export function PageTitle(props: Omit<TypographyProps<"h1">, "as" | "variant">) {
  return <Typography as="h1" variant="heading-xl" {...props} />;
}

/** Section heading (h2). */
export function SectionTitle(props: Omit<TypographyProps<"h2">, "as" | "variant">) {
  return <Typography as="h2" variant="heading" {...props} />;
}

/** Primary body copy. */
export function Body(props: Omit<TypographyProps<"p">, "as" | "variant">) {
  return <Typography as="p" variant="body" {...props} />;
}

/** Supporting / secondary body copy. */
export function BodySm(props: Omit<TypographyProps<"p">, "as" | "variant">) {
  return <Typography as="p" variant="body-sm" {...props} />;
}

/** Fine print, captions, metadata. */
export function Detail(props: Omit<TypographyProps<"p">, "as" | "variant">) {
  return <Typography as="p" variant="detail" {...props} />;
}

/** Compact UI labels / inline help. */
export function UiText(props: Omit<TypographyProps<"span">, "as" | "variant">) {
  return <Typography as="span" variant="ui" {...props} />;
}
