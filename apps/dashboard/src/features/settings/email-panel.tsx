import { Form } from "@react-spectrum/s2/Form";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAppForm } from "#/forms/form";
import { emailFormat, required } from "#/forms/validators";
import { Body, BodySm, SectionTitle } from "#/components/typography";
import { authClient } from "#/lib/auth-client";
import { spectrumStyles } from "#/spectrum-styles";

const section = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 16,
  width: "full",
  boxSizing: "border-box",
});

type Props = {
  email: string;
  onUpdated?: (email: string) => void;
};

export function EmailPanel({ email, onUpdated }: Props) {
  const form = useAppForm({
    defaultValues: {
      newEmail: email,
    },
    onSubmit: async ({ value }) => {
      const newEmail = value.newEmail.trim().toLowerCase();
      if (newEmail === email.toLowerCase()) {
        ToastQueue.negative("Enter a different email address.", { timeout: 4000 });
        return;
      }
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: window.location.origin,
      });
      if (error) {
        ToastQueue.negative(error.message || "Could not update email.", { timeout: 5000 });
        return;
      }
      onUpdated?.(newEmail);
      ToastQueue.positive("Email updated.", { timeout: 4000 });
    },
  });

  return (
    <section className={section} aria-labelledby="settings-email-heading">
      <SectionTitle id="settings-email-heading">Email</SectionTitle>
      <Body>Change the email address used to sign in.</Body>
      <BodySm>Current email: {email}</BodySm>

      <Form
        styles={spectrumStyles(
          style({
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "full",
            maxWidth: 480,
          }),
        )}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.AppForm>
          <form.AppField
            name="newEmail"
            validators={{
              onChange: ({ value }) =>
                required("Email is required.")({ value }) ?? emailFormat()({ value }),
            }}
          >
            {(field) => (
              <field.TextField
                label="New email address"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                data-testid="settings-email"
              />
            )}
          </form.AppField>
          <form.SubmitButton label="Update email" submittingLabel="Updating…" />
        </form.AppForm>
      </Form>
    </section>
  );
}
