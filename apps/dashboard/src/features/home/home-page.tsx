import { useEffect, useState } from "react";
import { Link } from "@react-spectrum/s2/Link";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { motion, useReducedMotion } from "motion/react";
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";
import { Body, PageTitle } from "#/components/typography";
import type { AccountUser } from "#/lib/api/account";
import { activeOrganizationIdFromSession, authClient } from "#/lib/auth-client";

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
  user: AccountUser;
  justOnboarded?: boolean;
};

function firstName(name: string) {
  const part = name.trim().split(/\s+/)[0];
  return part || name || "there";
}

export function HomePage({ user, justOnboarded = false }: Props) {
  const greetingName = firstName(user.name);
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
      .then(({ data }) => {
        if (cancelled) return;
        const name = (data as { name?: string } | null)?.name;
        setOrganisationName(typeof name === "string" ? name : null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  return (
    <section className={layout} aria-labelledby="home-heading">
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
          Signed in as {user.email}
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
