import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { OnboardingPage } from "#/features/onboarding/onboarding-page";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: "/sign-in" });
    }

    const { data: organisations, error } = await authClient.organization.list();
    if (!error && Array.isArray(organisations) && organisations.length > 0) {
      throw redirect({ to: "/" });
    }

    return { session };
  },
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const navigate = useNavigate();
  const router = useRouter();

  return (
    <OnboardingPage
      onCreated={async (organisation) => {
        ToastQueue.positive(`${organisation.name} is ready.`, { timeout: 4000 });
        await router.invalidate();
        await navigate({
          to: "/",
          search: { welcome: true },
        });
      }}
    />
  );
}
