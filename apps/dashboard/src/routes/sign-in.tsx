import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@react-spectrum/s2/Link";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { AuthPage } from "#/components/auth-page";
import { Body } from "#/components/typography";
import { SignInForm } from "#/features/auth/sign-in-form";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
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
          await new Promise((resolve) => setTimeout(resolve, 600));
          ToastQueue.positive(`Signed in as ${value.email}`, {
            timeout: 5000,
          });
        }}
      />
    </AuthPage>
  );
}
