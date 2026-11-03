import { useNavigate } from "@tanstack/react-router";
import { Form } from "@react-spectrum/s2/Form";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAppForm } from "#/forms/form";
import { required } from "#/forms/validators";
import { Body, SectionTitle } from "#/components/typography";
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

const danger = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "full",
  maxWidth: 480,
  padding: 16,
  borderRadius: "xl",
  backgroundColor: "red-100",
  boxSizing: "border-box",
});

export function AccountPanel() {
  const navigate = useNavigate();
  const form = useAppForm({
    defaultValues: {
      password: "",
      confirmDelete: false,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.deleteUser({
        password: value.password,
      });
      if (error) {
        ToastQueue.negative(error.message || "Could not delete the account.", { timeout: 5000 });
        return;
      }
      ToastQueue.positive("Account deleted.", { timeout: 4000 });
      await navigate({ to: "/sign-in" });
    },
  });

  return (
    <section className={section} aria-labelledby="settings-account-heading">
      <SectionTitle id="settings-account-heading">Account</SectionTitle>
      <Body>Permanently remove your account and sign-in access.</Body>

      <div className={danger}>
        <Body>Deleting your account cannot be undone. Enter your password to confirm.</Body>

        <Form
          styles={spectrumStyles(
            style({
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: "full",
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
              name="password"
              validators={{
                onChange: ({ value }) => required("Password is required.")({ value }),
              }}
            >
              {(field) => (
                <field.TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  data-testid="settings-delete-password"
                />
              )}
            </form.AppField>

            <form.AppField
              name="confirmDelete"
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : "Confirm that you want to delete your account.",
              }}
            >
              {(field) => (
                <field.CheckboxField data-testid="settings-delete-confirm">
                  I understand this permanently deletes my account
                </field.CheckboxField>
              )}
            </form.AppField>

            <form.SubmitButton
              label="Delete account"
              submittingLabel="Deleting…"
              variant="negative"
              data-testid="settings-delete-account"
            />
          </form.AppForm>
        </Form>
      </div>
    </section>
  );
}
