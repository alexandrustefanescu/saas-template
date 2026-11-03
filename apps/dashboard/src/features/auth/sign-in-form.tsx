import { Form } from "@react-spectrum/s2/Form";
import { Link } from "@react-spectrum/s2/Link";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAppForm } from "#/forms/form";
import { spectrumStyles } from "#/spectrum-styles";
import { emailFormat, minLength, required } from "#/forms/validators";
import { AuthOrDivider } from "./auth-or-divider";
import { AuthSocialButtons } from "./auth-social-buttons";

export type SignInValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type Props = {
  onSubmit?: (value: SignInValues) => void | Promise<void>;
};

export function SignInForm({ onSubmit }: Props) {
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    } satisfies SignInValues,
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
              onChangeAsyncDebounceMs: 400,
              onChangeAsync: async ({ value }) => {
                await new Promise((resolve) => setTimeout(resolve, 200));
                return value.toLowerCase() === "blocked@example.com"
                  ? "This account has been disabled."
                  : undefined;
              },
            }}
          >
            {(field) => (
              <field.TextField
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                data-testid="sign-in-email"
              />
            )}
          </form.AppField>

          <form.AppField
            name="password"
            validators={{
              onChange: ({ value }) =>
                required("Password is required.")({ value }) ?? minLength(8)({ value }),
            }}
          >
            {(field) => (
              <field.TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                data-testid="sign-in-password"
              />
            )}
          </form.AppField>

          <div
            className={style({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            })}
          >
            <form.AppField name="rememberMe">
              {(field) => (
                <field.CheckboxField data-testid="sign-in-remember-me">
                  Remember me
                </field.CheckboxField>
              )}
            </form.AppField>

            <Link href={{ to: "/forgot-password" }} isQuiet>
              Forgot password?
            </Link>
          </div>

          <form.SubmitButton label="Sign in" submittingLabel="Signing in…" />
        </form.AppForm>
      </Form>
    </div>
  );
}
