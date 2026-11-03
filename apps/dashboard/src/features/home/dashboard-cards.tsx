import { ActionMenu, Keyboard, MenuItem, Text as MenuText } from "@react-spectrum/s2/ActionMenu";
import { Avatar } from "@react-spectrum/s2/Avatar";
import { Badge } from "@react-spectrum/s2/Badge";
import { Button } from "#/components/button";
import {
  AssetCard,
  Card,
  CardPreview,
  Content,
  Footer,
  ProductCard,
  Text,
  UserCard,
} from "@react-spectrum/s2/Card";
import Duplicate from "@react-spectrum/s2/icons/Duplicate";
import Edit from "@react-spectrum/s2/icons/Edit";
import Folder from "@react-spectrum/s2/icons/Folder";
import Share from "@react-spectrum/s2/icons/Share";
import Apps from "@react-spectrum/s2/illustrations/linear/Apps";
import Document from "@react-spectrum/s2/illustrations/linear/Document";
import FolderOpen from "@react-spectrum/s2/illustrations/linear/FolderOpen";
import { StatusLight } from "@react-spectrum/s2/StatusLight";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { AccentIllustration } from "#/components/accent-illustration";
import { spectrumStyles } from "#/spectrum-styles";
import { SectionTitle } from "#/components/typography";

const cardGrid = style({
  display: "grid",
  gridTemplateColumns: {
    default: "1fr",
    sm: "1fr 1fr",
  },
  gap: 16,
});

export function DashboardCards() {
  return (
    <section
      className={style({
        display: "flex",
        flexDirection: "column",
        gap: 16,
      })}
      aria-labelledby="workspace-heading"
    >
      <div
        className={style({
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        })}
      >
        <SectionTitle id="workspace-heading">Workspace</SectionTitle>
        <Badge variant="neutral" size="S">
          New
        </Badge>
        <Badge variant="gray" fillStyle="subtle" size="S">
          Synced
        </Badge>
      </div>

      <div className={cardGrid}>
        <AssetCard textValue="Projects folder">
          <CardPreview>
            <AccentIllustration as={FolderOpen} size="M" />
          </CardPreview>
          <Content>
            <Text slot="title">Projects</Text>
            <ActionMenu aria-label="Projects actions">
              <MenuItem
                textValue="Open"
                onAction={() => ToastQueue.info("Opening Projects", { timeout: 4000 })}
              >
                <Folder />
                <MenuText slot="label">Open</MenuText>
                <MenuText slot="description">Open this folder</MenuText>
                <Keyboard>⌘O</Keyboard>
              </MenuItem>
              <MenuItem
                textValue="Share"
                onAction={() => ToastQueue.neutral("Share link copied", { timeout: 4000 })}
              >
                <Share />
                <MenuText slot="label">Share</MenuText>
                <MenuText slot="description">Copy a share link</MenuText>
                <Keyboard>⌘⇧S</Keyboard>
              </MenuItem>
            </ActionMenu>
            <Text slot="description">12 items · Updated today</Text>
          </Content>
        </AssetCard>

        <AssetCard textValue="Product brief document">
          <CardPreview>
            <AccentIllustration as={Document} size="M" />
          </CardPreview>
          <Content>
            <Text slot="title">Product brief</Text>
            <ActionMenu aria-label="Product brief actions">
              <MenuItem
                textValue="Edit"
                onAction={() => ToastQueue.info("Edit Product brief", { timeout: 4000 })}
              >
                <Edit />
                <MenuText slot="label">Edit</MenuText>
                <MenuText slot="description">Open in the editor</MenuText>
                <Keyboard>⌘E</Keyboard>
              </MenuItem>
              <MenuItem
                textValue="Duplicate"
                onAction={() => ToastQueue.positive("Duplicate created", { timeout: 4000 })}
              >
                <Duplicate />
                <MenuText slot="label">Duplicate</MenuText>
                <MenuText slot="description">Make a copy of this file</MenuText>
                <Keyboard>⌘D</Keyboard>
              </MenuItem>
            </ActionMenu>
            <Text slot="description">PDF · 240 KB</Text>
          </Content>
        </AssetCard>

        <UserCard textValue="Alex Rivera">
          <Avatar src="https://i.pravatar.cc/128?img=12" alt="Alex Rivera" size={48} />
          <Content>
            <Text slot="title">Alex Rivera</Text>
            <ActionMenu aria-label="Alex Rivera actions">
              <MenuItem
                textValue="Message"
                onAction={() => ToastQueue.info("Message draft opened", { timeout: 4000 })}
              >
                <MenuText slot="label">Message</MenuText>
                <MenuText slot="description">Start a conversation</MenuText>
              </MenuItem>
              <MenuItem
                textValue="Copy email"
                onAction={() => ToastQueue.neutral("Email copied", { timeout: 4000 })}
              >
                <MenuText slot="label">Copy email</MenuText>
                <Keyboard>⌘C</Keyboard>
              </MenuItem>
            </ActionMenu>
            <Text slot="description">Product designer focused on auth flows and onboarding.</Text>
          </Content>
          <Footer>
            <StatusLight size="S" variant="neutral">
              Available
            </StatusLight>
          </Footer>
        </UserCard>

        <ProductCard textValue="Spectrum starter kit">
          <CardPreview>
            <AccentIllustration as={Apps} size="M" />
          </CardPreview>
          <Content>
            <Text slot="title">Spectrum starter</Text>
            <Text slot="description">
              Forms, toasts, dialogs, and cards ready for your next product.
            </Text>
          </Content>
          <Footer>
            <Button
              variant="primary"
              onPress={() => ToastQueue.positive("Starter kit unlocked", { timeout: 4000 })}
            >
              Get started
            </Button>
          </Footer>
        </ProductCard>

        <Card
          styles={spectrumStyles(style({ gridColumn: { default: "1", sm: "1 / -1" } }))}
          textValue="Release checklist"
        >
          <Content>
            <Text slot="title">Release checklist</Text>
            <Text slot="description">
              Auth screens, validation, and Spectrum components are wired for a first demo.
            </Text>
          </Content>
          <Footer>
            <StatusLight size="S" variant="neutral">
              In review
            </StatusLight>
            <Badge variant="neutral" size="S">
              v0.1
            </Badge>
          </Footer>
        </Card>
      </div>
    </section>
  );
}
