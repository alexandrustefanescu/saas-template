import type { ButtonProps } from "@react-spectrum/s2/Button";
import { Button } from "#/components/button";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useFormContext } from "../form-context";

type Props = {
  label: string;
  submittingLabel?: string;
  variant?: ButtonProps["variant"];
  "data-testid"?: string;
};

export function SubmitButton({
  label,
  submittingLabel = "Submitting…",
  variant = "primary",
  "data-testid": testId,
}: Props) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
      {([canSubmit, isSubmitting]) => (
        <Button
          type="submit"
          variant={variant}
          size="L"
          styles={style({ width: "full" })}
          isDisabled={!canSubmit || isSubmitting}
          isPending={isSubmitting}
          data-testid={testId}
        >
          {isSubmitting ? submittingLabel : label}
        </Button>
      )}
    </form.Subscribe>
  );
}
