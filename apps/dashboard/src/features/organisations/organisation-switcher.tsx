import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Footer,
  Heading,
} from "@react-spectrum/s2/Dialog";
import Add from "@react-spectrum/s2/icons/Add";
import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import { Keyboard, Menu, MenuItem, MenuTrigger, Text as MenuText } from "@react-spectrum/s2/Menu";
import { TextField } from "@react-spectrum/s2/TextField";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { motion, useReducedMotion } from "motion/react";
import {
  activeOrganizationIdFromSession,
  authClient,
  slugifyOrganisationName,
} from "#/lib/auth-client";
import { spectrumStyles } from "#/spectrum-styles";
import { Logo } from "#/components/logo";
import {
  SIDEBAR_CONTENT_WIDTH,
  sidebarMotion,
  useIconOnlyNav,
  useIsDesktop,
} from "#/features/shell/sidebar-motion";
import { invalidateOrgScopedQueries } from "#/queries/invalidate-org";
import { useOrganisationsQuery } from "#/queries/organisations";

const trigger = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
  paddingX: 8,
  paddingY: 4,
  borderRadius: "lg",
  borderWidth: 0,
  borderStyle: "none",
  backgroundColor: "white",
  boxShadow: "elevated",
  cursor: "pointer",
  textAlign: "start",
  boxSizing: "border-box",
});

const mark = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: "default",
  flexShrink: 0,
  overflow: "hidden",
});

const copy = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minWidth: 0,
});

const nameStyle = style({
  font: "ui-sm",
  fontWeight: "bold",
  color: "gray-900",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const planStyle = style({
  font: "ui-xs",
  color: "gray-600",
});

export function OrganisationSwitcher() {
  const iconOnly = useIconOnlyNav();
  const isDesktop = useIsDesktop();
  const width = iconOnly ? 40 : isDesktop ? SIDEBAR_CONTENT_WIDTH : 176;
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessionData } = authClient.useSession();
  const { data, isPending, isFetching, refetch } = useOrganisationsQuery();

  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const organisations = data ?? [];
  const activeId = activeOrganizationIdFromSession(sessionData);
  const activeOrg = organisations.find((org) => org.id === activeId) ?? organisations[0] ?? null;
  const loading = isPending || (isFetching && organisations.length === 0);

  useEffect(() => {
    let cancelled = false;
    void authClient.organization.getActiveMemberRole().then((roleResult) => {
      if (cancelled) return;
      if (!roleResult.error && roleResult.data?.role) {
        setActiveRole(String(roleResult.data.role));
      } else {
        setActiveRole(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function setActive(organizationId: string) {
    const { error } = await authClient.organization.setActive({ organizationId });
    if (error) {
      ToastQueue.negative(error.message || "Could not switch organisation.", { timeout: 5000 });
      return;
    }
    invalidateOrgScopedQueries(queryClient);
    await router.invalidate();
    await refetch();
  }

  async function createOrganisation() {
    const name = createName.trim();
    const slug = (createSlug.trim() || slugifyOrganisationName(name)).toLowerCase();
    if (!name || !slug) {
      ToastQueue.negative("Name and slug are required.", { timeout: 4000 });
      return;
    }

    setCreating(true);
    try {
      const { data: created, error } = await authClient.organization.create({ name, slug });
      if (error) {
        ToastQueue.negative(error.message || "Could not create organisation.", { timeout: 5000 });
        return;
      }
      const createdId = (created as { id?: string } | null)?.id;
      if (createdId) {
        await authClient.organization.setActive({ organizationId: createdId });
      }
      ToastQueue.positive("Organisation created.", { timeout: 4000 });
      setCreateOpen(false);
      setCreateName("");
      setCreateSlug("");
      setSlugTouched(false);
      invalidateOrgScopedQueries(queryClient);
      await router.invalidate();
      await refetch();
    } finally {
      setCreating(false);
    }
  }

  const subtitle = loading
    ? "Loading…"
    : activeOrg
      ? activeRole
        ? activeRole
        : "Organisation"
      : "No organisation";

  const labelName = activeOrg?.name ?? (loading ? "Organisations" : "Create organisation");

  return (
    <>
      <motion.div
        initial={false}
        animate={{ width, height: iconOnly ? 40 : 48 }}
        transition={sidebarMotion(reduceMotion)}
        style={{
          overflow: "hidden",
          flexShrink: isDesktop ? 0 : 1,
          maxWidth: "100%",
          borderRadius: 10,
        }}
      >
        <MenuTrigger direction={isDesktop ? "end" : "bottom"} align={isDesktop ? "start" : "end"}>
          <ActionButton
            aria-label={`Switch organisation, ${labelName}`}
            isQuiet
            UNSAFE_className="organisation-switcher"
            styles={spectrumStyles(trigger)}
          >
            <span className={mark}>
              <Logo width={16} height={18} />
            </span>
            <motion.span
              className={copy}
              initial={false}
              animate={{ opacity: iconOnly ? 0 : 1 }}
              transition={sidebarMotion(reduceMotion)}
            >
              <span className={nameStyle}>{labelName}</span>
              <span className={planStyle}>{subtitle}</span>
            </motion.span>
            <motion.span
              aria-hidden
              initial={false}
              animate={{ opacity: iconOnly ? 0 : 1 }}
              transition={sidebarMotion(reduceMotion)}
              style={{ display: "flex", flexShrink: 0, marginLeft: "auto" }}
            >
              <ChevronDown />
            </motion.span>
          </ActionButton>
          <Menu
            aria-label="Organisations"
            onAction={(key) => {
              const id = String(key);
              if (id === "add-organisation") {
                setCreateOpen(true);
                return;
              }
              void setActive(id);
            }}
          >
            {organisations.map((org, index) => (
              <MenuItem key={org.id} id={org.id} textValue={org.name}>
                <Logo slot="icon" width={16} height={16} />
                <MenuText slot="label">{org.name}</MenuText>
                <Keyboard>⌘{index + 1}</Keyboard>
              </MenuItem>
            ))}
            <MenuItem id="add-organisation" textValue="Add organisation">
              <Add />
              <MenuText slot="label">
                {organisations.length === 0 ? "Create organisation" : "Add organisation"}
              </MenuText>
            </MenuItem>
          </Menu>
        </MenuTrigger>
      </motion.div>

      <DialogContainer
        onDismiss={() => {
          if (!creating) setCreateOpen(false);
        }}
      >
        {createOpen ? (
          <Dialog>
            <Heading>Create organisation</Heading>
            <Content>
              <div
                className={style({
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  width: "full",
                })}
              >
                <TextField
                  label="Name"
                  value={createName}
                  onChange={(value) => {
                    setCreateName(value);
                    if (!slugTouched) {
                      setCreateSlug(slugifyOrganisationName(value));
                    }
                  }}
                  isRequired
                  autoFocus
                  data-testid="organisation-create-name"
                />
                <TextField
                  label="Slug"
                  value={createSlug}
                  onChange={(value) => {
                    setSlugTouched(true);
                    setCreateSlug(value);
                  }}
                  isRequired
                  description="Used in URLs and invitations."
                  data-testid="organisation-create-slug"
                />
              </div>
            </Content>
            <Footer>
              <ButtonGroup>
                <Button
                  variant="secondary"
                  onPress={() => setCreateOpen(false)}
                  isDisabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  onPress={() => {
                    void createOrganisation();
                  }}
                  isPending={creating}
                  data-testid="organisation-create-submit"
                >
                  Create
                </Button>
              </ButtonGroup>
            </Footer>
          </Dialog>
        ) : null}
      </DialogContainer>
    </>
  );
}
