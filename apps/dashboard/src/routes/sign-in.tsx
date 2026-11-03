import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@react-spectrum/s2/Link";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { AuthPage } from "#/components/auth-page";
import { Body } from "#/components/typography";
import { SignInForm } from "#/features/auth/sign-in-form";
import { authClient, redirectIfSignedIn } from "#/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: redirectIfSignedIn,
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  return (
    <AuthPage
      title="Welcome Back!"
      description="Sign in to continue your learning journey."
      footer={
        <Body>
          Don't have an account? <Link href={{ to: "/sign-up" }}>Sign up</Link>
        </Body>
      }
    >
      <SignInForm
        onSubmit={async (value) => {
          const { error } = await authClient.signIn.email({
            email: value.email,
            password: value.password,
            rememberMe: value.rememberMe,
          });
          if (error) {
            ToastQueue.negative(error.message || "Could not sign in.", { timeout: 5000 });
            return;
          }
          ToastQueue.positive(`Signed in as ${value.email}`, { timeout: 5000 });
          await navigate({ to: "/" });
        }}
      />
    </AuthPage>
  );
}
