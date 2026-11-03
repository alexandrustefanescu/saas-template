import { Form } from "@react-spectrum/s2/Form";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAppForm } from "#/forms/form";
import { minLength, passwordsMatch, required } from "#/forms/validators";
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

export function PasswordPanel() {
  const form = useAppForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: value.revokeOtherSessions,
      });
      if (error) {
        ToastQueue.negative(error.message || "Could not change password.", { timeout: 5000 });
        return;
      }
      formApi.reset();
      ToastQueue.positive("Password updated.", { timeout: 4000 });
    },
  });

  return (
    <section className={section} aria-labelledby="settings-password-heading">
      <SectionTitle id="settings-password-heading">Password</SectionTitle>
      <Body>Choose a new password for your account.</Body>

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
            name="currentPassword"
            validators={{
              onChange: ({ value }) => required("Current password is required.")({ value }),
            }}
          >
            {(field) => (
              <field.TextField
                label="Current password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your current password"
                data-testid="settings-current-password"
              />
            )}
          </form.AppField>

          <form.AppField
            name="newPassword"
            validators={{
              onChange: ({ value }) =>
                required("New password is required.")({ value }) ?? minLength(8)({ value }),
            }}
            listeners={{
              onChange: () => {
                void form.validateField("confirmPassword", "change");
              },
            }}
          >
            {(field) => (
              <field.TextField
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                description="Password must be at least 8 characters."
                data-testid="settings-new-password"
              />
            )}
          </form.AppField>

          <form.AppField
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["newPassword"],
              onChange: ({ value, fieldApi }) =>
                required("Confirm your new password.")({ value }) ??
                passwordsMatch(fieldApi.form.getFieldValue("newPassword"))({ value }),
            }}
          >
            {(field) => (
              <field.TextField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                data-testid="settings-confirm-password"
              />
            )}
          </form.AppField>

          <form.AppField name="revokeOtherSessions">
            {(field) => (
              <field.CheckboxField data-testid="settings-revoke-other-sessions">
                Sign out of other devices
              </field.CheckboxField>
            )}
          </form.AppField>

          <form.SubmitButton label="Change password" submittingLabel="Updating…" />
        </form.AppForm>
      </Form>
    </section>
  );
}
