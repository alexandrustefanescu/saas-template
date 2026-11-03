import { useState } from "react";
import { Form } from "@react-spectrum/s2/Form";
import { TextField } from "@react-spectrum/s2/TextField";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { authClient, slugifyOrganisationName } from "#/lib/auth-client";
import { spectrumStyles } from "#/spectrum-styles";

type CreatedOrganisation = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  onCreated: (organisation: CreatedOrganisation) => void | Promise<void>;
  submitLabel?: string;
};

export function CreateOrganisationForm({ onCreated, submitLabel = "Continue" }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);

  return (
    <Form
      styles={spectrumStyles(
        style({
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "full",
        }),
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          const nextName = name.trim();
          const nextSlug = (slug.trim() || slugifyOrganisationName(nextName)).toLowerCase();
          if (!nextName || !nextSlug) {
            ToastQueue.negative("Name and slug are required.", { timeout: 4000 });
            return;
          }

          setCreating(true);
          try {
            const { data, error } = await authClient.organization.create({
              name: nextName,
              slug: nextSlug,
            });
            if (error) {
              ToastQueue.negative(error.message || "Could not create organisation.", {
                timeout: 5000,
              });
              return;
            }

            const created = data as CreatedOrganisation | null;
            if (!created?.id) {
              ToastQueue.negative("Organisation created, but no id was returned.", {
                timeout: 5000,
              });
              return;
            }

            const { error: activeError } = await authClient.organization.setActive({
              organizationId: created.id,
            });
            if (activeError) {
              ToastQueue.negative(
                activeError.message || "Organisation created, but could not set it active.",
                { timeout: 5000 },
              );
              return;
            }

            await onCreated(created);
          } finally {
            setCreating(false);
          }
        })();
      }}
    >
      <TextField
        label="Organisation name"
        value={name}
        onChange={(value) => {
          setName(value);
          if (!slugTouched) {
            setSlug(slugifyOrganisationName(value));
          }
        }}
        isRequired
        autoFocus
        placeholder="Acme Ltd"
        data-testid="onboarding-org-name"
      />
      <TextField
        label="Slug"
        value={slug}
        onChange={(value) => {
          setSlugTouched(true);
          setSlug(value);
        }}
        isRequired
        description="Used in URLs and invitations."
        data-testid="onboarding-org-slug"
      />
      <Button
        type="submit"
        variant="accent"
        isPending={creating}
        data-testid="onboarding-org-submit"
      >
        {submitLabel}
      </Button>
    </Form>
  );
}
