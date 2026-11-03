import { Form } from "@react-spectrum/s2/Form";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAppForm } from "#/forms/form";
import { spectrumStyles } from "#/spectrum-styles";
import { emailFormat, required } from "#/forms/validators";

export type ForgotPasswordValues = {
  email: string;
};

type Props = {
  onSubmit?: (value: ForgotPasswordValues) => void | Promise<void>;
};

export function ForgotPasswordForm({ onSubmit }: Props) {
  const form = useAppForm({
    defaultValues: {
      email: "",
    } satisfies ForgotPasswordValues,
    onSubmit: async ({ value }) => {
      await onSubmit?.(value);
    },
  });

  return (
    <Form
      styles={spectrumStyles(style({ display: "flex", flexDirection: "column", gap: 16 }))}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField
          name="email"
          validators={{
            onChange: ({ value }) =>
              required("Email is required.")({ value }) ?? emailFormat()({ value }),
          }}
        >
          {(field) => (
            <field.TextField
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              description="We'll send a reset link to this address."
              data-testid="forgot-password-email"
            />
          )}
        </form.AppField>

        <form.SubmitButton label="Send reset link" submittingLabel="Sending…" />
      </form.AppForm>
    </Form>
  );
}
