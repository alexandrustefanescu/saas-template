import { Divider } from "@react-spectrum/s2/Divider";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Detail } from "#/components/typography";

export function AuthOrDivider() {
  return (
    <div
      className={style({
        display: "flex",
        alignItems: "center",
        gap: 12,
      })}
    >
      <Divider size="S" styles={style({ flexGrow: 1 })} />
      <Detail>or</Detail>
      <Divider size="S" styles={style({ flexGrow: 1 })} />
    </div>
  );
}
