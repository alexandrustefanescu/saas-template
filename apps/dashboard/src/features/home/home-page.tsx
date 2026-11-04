import { useEffect, useState } from "react";
import { Link } from "@react-spectrum/s2/Link";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { motion, useReducedMotion } from "motion/react";
import { Button } from "#/components/button";
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";
import { Body, PageTitle } from "#/components/typography";
import { activeOrganizationIdFromSession, authClient } from "#/lib/auth-client";
import { useMeQuery } from "#/queries/account";

const layout = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 16,
  width: "full",
  height: "full",
  minHeight: 0,
  flexGrow: 1,
  boxSizing: "border-box",
  padding: 8,
});

const welcome = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 8,
  width: "full",
  maxWidth: 640,
});

const readyBanner = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "full",
  maxWidth: 640,
  padding: 16,
  borderRadius: "xl",
  backgroundColor: "gray-100",
  boxSizing: "border-box",
});

const actions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  marginTop: 8,
});

type Props = {
  justOnboarded?: boolean;
};

function firstName(name: string) {
  const part = name.trim().split(/\s+/)[0];
  return part || name || "there";
}

export function HomePage({ justOnboarded = false }: Props) {
  const { data, isPending, isError, error, isFetching, refetch } = useMeQuery();
  const reduceMotion = useReducedMotion();
  const { data: sessionData } = authClient.useSession();
  const activeOrgId = activeOrganizationIdFromSession(sessionData);
  const [organisationName, setOrganisationName] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId) {
      setOrganisationName(null);
      return;
    }
    let cancelled = false;
    void authClient.organization
      .getFullOrganization({ query: { organizationId: activeOrgId } })
      .then(({ data: org }) => {
        if (cancelled) return;
        const name = (org as { name?: string } | null)?.name;
        setOrganisationName(typeof name === "string" ? name : null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  if (isPending) {
    return null;
  }

  if (isError || !data) {
    return (
      <section className={layout} aria-labelledby="home-heading">
        <PageTitle id="home-heading">Home</PageTitle>
        <Body>{error instanceof Error ? error.message : "Could not load your account."}</Body>
        <Button variant="secondary" onPress={() => void refetch()}>
          Try again
        </Button>
      </section>
    );
  }

  const greetingName = firstName(data.user.name);
  const backgroundBusy = isFetching && !isPending;

  return (
    <section
      className={layout}
      aria-labelledby="home-heading"
      style={{ opacity: backgroundBusy ? 0.9 : 1, transition: "opacity 160ms ease" }}
    >
      <PageBreadcrumbs items={[{ id: "home", label: "Home" }]} />
      {justOnboarded ? (
        <motion.div
          className={readyBanner}
          role="status"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Body>
            You&apos;re ready
            {organisationName ? <> — {organisationName} is active</> : null}. Add items or invite
            teammates whenever you like.
          </Body>
        </motion.div>
      ) : null}
      <div className={welcome}>
        <PageTitle id="home-heading">Welcome, {greetingName}</PageTitle>
        <Body>
          Signed in as {data.user.email}
          {organisationName ? <> · Active organisation: {organisationName}</> : null}. Jump into
          your items or update your account settings when you are ready.
        </Body>
        <div className={actions}>
          <Link href="/items">Go to items</Link>
          <Link href="/settings?category=organisation">Organisation settings</Link>
          <Link href="/settings">Open settings</Link>
        </div>
      </div>
    </section>
  );
}
