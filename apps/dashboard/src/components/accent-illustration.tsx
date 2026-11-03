import type { ComponentType, ReactElement } from "react";
import type { IconProps } from "@react-spectrum/s2/Icon";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

/** Monochrome ink fill for linear S2 illustrations. */
const monoStyles = style({
  "--iconPrimary": {
    type: "fill",
    value: "black",
  },
});

type GraphicProps = {
  size?: "S" | "M" | "L";
  styles?: typeof monoStyles;
  "aria-hidden"?: boolean | "false" | "true";
};

type Props = {
  /** Linear S2 illustration component (supports `--iconPrimary`). */
  as: ComponentType<IconProps>;
  size?: GraphicProps["size"];
};

export function AccentIllustration({ as: Illustration, size = "L" }: Props): ReactElement {
  const Graphic = Illustration as ComponentType<GraphicProps>;
  return <Graphic size={size} styles={monoStyles} aria-hidden />;
}
