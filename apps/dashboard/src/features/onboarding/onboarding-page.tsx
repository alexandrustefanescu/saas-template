import { motion, useReducedMotion } from "motion/react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Body, PageTitle } from "#/components/typography";
import { Logo } from "#/components/logo";
import { CreateOrganisationForm } from "./create-organisation-form";

const shell = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "full",
  minHeight: "screen",
  padding: 24,
  boxSizing: "border-box",
  backgroundColor: "gray-100",
});

const card = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 20,
  width: "full",
  maxWidth: 440,
  padding: 32,
  borderRadius: "xl",
  backgroundColor: "white",
  boxShadow: "elevated",
  boxSizing: "border-box",
});

const brand = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

const brandName = style({
  font: "heading",
  fontWeight: "bold",
  color: "gray-900",
  margin: 0,
});

type Props = {
  onCreated: (organisation: { id: string; name: string; slug: string }) => void | Promise<void>;
};

export function OnboardingPage({ onCreated }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={shell}>
      <motion.section
        className={card}
        aria-labelledby="onboarding-heading"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={brand}>
          <Logo width={28} height={34} />
          <p className={brandName}>SaaS Template</p>
        </div>
        <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
          <PageTitle id="onboarding-heading">Create your organisation</PageTitle>
          <Body>
            Items, webhooks, and team settings live inside an organisation. Set one up to continue.
          </Body>
        </div>
        <CreateOrganisationForm onCreated={onCreated} submitLabel="Create and continue" />
      </motion.section>
    </div>
  );
}
