import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@react-spectrum/s2/Link";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { AuthPage } from "#/components/auth-page";
import { Body } from "#/components/typography";
import { ForgotPasswordForm } from "#/features/auth/forgot-password-form";
import { authClient, redirectIfSignedIn } from "#/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: redirectIfSignedIn,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Forgot password?"
      description="Enter the email for your account and we'll send a reset link."
      footer={
        <Body>
          Remember your password? <Link href={{ to: "/sign-in" }}>Sign in</Link>
        </Body>
      }
    >
      <ForgotPasswordForm
        onSubmit={async (value) => {
          const { error } = await authClient.requestPasswordReset({
            email: value.email,
            redirectTo: `${window.location.origin}/sign-in`,
          });
          if (error) {
            ToastQueue.negative(error.message || "Could not send a reset link.", {
              timeout: 5000,
            });
            return;
          }
          ToastQueue.positive(`Reset link sent to ${value.email}`, { timeout: 5000 });
        }}
      />
    </AuthPage>
  );
}
