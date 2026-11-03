import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@react-spectrum/s2/Link";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { AuthPage } from "#/components/auth-page";
import { Body } from "#/components/typography";
import { SignUpForm } from "#/features/auth/sign-up-form";
import { accountNameFromEmail, authClient, redirectIfSignedIn } from "#/lib/auth-client";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: redirectIfSignedIn,
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();

  return (
    <AuthPage
      title="Create account"
      description="Start your learning journey in a few minutes."
      heroImageSrc="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80"
      heroImageAlt="Students collaborating with laptops"
      footer={
        <Body>
          Already have an account? <Link href={{ to: "/sign-in" }}>Sign in</Link>
        </Body>
      }
    >
      <SignUpForm
        onSubmit={async (value) => {
          const { error } = await authClient.signUp.email({
            name: accountNameFromEmail(value.email),
            email: value.email,
            password: value.password,
          });
          if (error) {
            ToastQueue.negative(error.message || "Could not create the account.", {
              timeout: 5000,
            });
            return;
          }
          ToastQueue.positive(`Account created for ${value.email}`, { timeout: 5000 });
          await navigate({ to: "/onboarding" });
        }}
      />
    </AuthPage>
  );
}
