import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@react-spectrum/s2/Link";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { AuthPage } from "#/components/auth-page";
import { Body } from "#/components/typography";
import { ForgotPasswordForm } from "#/features/auth/forgot-password-form";

export const Route = createFileRoute("/forgot-password")({
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
          await new Promise((resolve) => setTimeout(resolve, 600));
          ToastQueue.positive(`Reset link sent to ${value.email}`, {
            timeout: 5000,
          });
        }}
      />
    </AuthPage>
  );
}
