import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@react-spectrum/s2/Link";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { AuthPage } from "#/components/auth-page";
import { Body } from "#/components/typography";
import { SignUpForm } from "#/features/auth/sign-up-form";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
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
          await new Promise((resolve) => setTimeout(resolve, 800));
          ToastQueue.positive(`Account created for ${value.email}`, {
            timeout: 5000,
          });
        }}
      />
    </AuthPage>
  );
}
