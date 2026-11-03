import { Form } from "@react-spectrum/s2/Form";
import { Link } from "@react-spectrum/s2/Link";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAppForm } from "#/forms/form";
import { spectrumStyles } from "#/spectrum-styles";
import {
  checkEmailAvailable,
  emailFormat,
  minLength,
  passwordsMatch,
  required,
} from "#/forms/validators";
import { AuthOrDivider } from "./auth-or-divider";
import { AuthSocialButtons } from "./auth-social-buttons";

export type SignUpValues = {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type Props = {
  onSubmit?: (value: SignUpValues) => void | Promise<void>;
};

export function SignUpForm({ onSubmit }: Props) {
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    } satisfies SignUpValues,
    onSubmit: async ({ value }) => {
      await onSubmit?.(value);
    },
  });

  return (
    <div className={style({ display: "flex", flexDirection: "column", gap: 20 })}>
      <AuthSocialButtons />
      <AuthOrDivider />

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
              onChangeAsyncDebounceMs: 500,
              onChangeAsync: checkEmailAvailable,
            }}
          >
            {(field) => (
              <field.TextField
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                data-testid="sign-up-email"
              />
            )}
          </form.AppField>

          <form.AppField
            name="password"
            validators={{
              onChange: ({ value }) =>
                required("Password is required.")({ value }) ?? minLength(8)({ value }),
            }}
            listeners={{
              onChange: () => {
                void form.validateField("confirmPassword", "change");
              },
            }}
          >
            {(field) => (
              <field.TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                description="Password must be at least 8 characters."
                data-testid="sign-up-password"
              />
            )}
          </form.AppField>

          <form.AppField
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["password"],
              onChange: ({ value, fieldApi }) =>
                required("Confirm your password.")({ value }) ??
                passwordsMatch(fieldApi.form.getFieldValue("password"))({
                  value,
                }),
            }}
          >
            {(field) => (
              <field.TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                data-testid="sign-up-confirm-password"
              />
            )}
          </form.AppField>

          <form.AppField
            name="acceptTerms"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : "You must accept the terms to continue.",
            }}
          >
            {(field) => (
              <field.CheckboxField value="agree" isRequired data-testid="sign-up-accept-terms">
                I agree to the{" "}
                <Link href={{ to: "/" }} variant="secondary">
                  terms of service
                </Link>
              </field.CheckboxField>
            )}
          </form.AppField>

          <form.SubmitButton label="Create account" submittingLabel="Creating account…" />
        </form.AppForm>
      </Form>
    </div>
  );
}
