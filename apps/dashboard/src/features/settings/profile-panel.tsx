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

type Props = {
  name: string;
  onUpdated?: (name: string) => void;
};

export function ProfilePanel({ name, onUpdated }: Props) {
  const form = useAppForm({
    defaultValues: {
      name,
    },
    onSubmit: async ({ value }) => {
      const nextName = value.name.trim();
      const { error } = await authClient.updateUser({ name: nextName });
      if (error) {
        ToastQueue.negative(error.message || "Could not update profile.", { timeout: 5000 });
        return;
      }
      onUpdated?.(nextName);
      ToastQueue.positive("Profile updated.", { timeout: 4000 });
    },
  });

  return (
    <section className={section} aria-labelledby="settings-profile-heading">
      <SectionTitle id="settings-profile-heading">Profile</SectionTitle>
      <Body>Update the name shown across your account.</Body>

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
            name="name"
            validators={{
              onChange: ({ value }) => required("Name is required.")({ value }),
            }}
          >
            {(field) => (
              <field.TextField
                label="Display name"
                autoComplete="name"
                placeholder="Your name"
                data-testid="settings-profile-name"
              />
            )}
          </form.AppField>
          <form.SubmitButton label="Save profile" submittingLabel="Saving…" />
        </form.AppForm>
      </Form>
    </section>
  );
}
