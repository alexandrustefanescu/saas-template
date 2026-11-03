import { Button } from "#/components/button";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useFormContext } from "../form-context";

type Props = {
  label: string;
  submittingLabel?: string;
};

export function SubmitButton({ label, submittingLabel = "Submitting…" }: Props) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
      {([canSubmit, isSubmitting]) => (
        <Button
          type="submit"
          variant="primary"
          size="L"
          styles={style({ width: "full" })}
          isDisabled={!canSubmit || isSubmitting}
          isPending={isSubmitting}
        >
          {isSubmitting ? submittingLabel : label}
        </Button>
      )}
    </form.Subscribe>
  );
}
