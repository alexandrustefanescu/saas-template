import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2/Tabs";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { OrganisationPanel } from "#/features/organisations/organisation-panel";
import type { AccountUser } from "#/lib/api/account";
import { spectrumStyles } from "#/spectrum-styles";
import { AccountPanel } from "./account-panel";
import { EmailPanel } from "./email-panel";
import { PasswordPanel } from "./password-panel";
import { ProfilePanel } from "./profile-panel";
import { WebhooksPanel } from "./webhooks-panel";

const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "full",
  flexGrow: 1,
  minHeight: 0,
  boxSizing: "border-box",
  overflow: "auto",
});

const panel = style({
  display: "flex",
  flexDirection: "column",
  width: "full",
  paddingStart: 24,
  boxSizing: "border-box",
});

export type SettingsCategory =
  | "profile"
  | "email"
  | "password"
  | "organisation"
  | "webhooks"
  | "account";

type Props = {
  user: AccountUser;
  defaultCategory?: SettingsCategory;
};

export function SettingsPanel({ user, defaultCategory = "profile" }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  return (
    <div className={layout}>
      <Tabs
        aria-label="Settings categories"
        orientation="vertical"
        density="compact"
        defaultSelectedKey={defaultCategory}
        styles={spectrumStyles(
          style({
            width: "full",
            flexGrow: 1,
            minHeight: 0,
          }),
        )}
      >
        <TabList
          styles={spectrumStyles(
            style({
              width: 160,
              flexShrink: 0,
            }),
          )}
        >
          <Tab id="profile">Profile</Tab>
          <Tab id="email">Email</Tab>
          <Tab id="password">Password</Tab>
          <Tab id="organisation">Organisation</Tab>
          <Tab id="webhooks">Webhooks</Tab>
          <Tab id="account">Account</Tab>
        </TabList>

        <TabPanel id="profile">
          <div className={panel}>
            <ProfilePanel name={name} onUpdated={setName} />
          </div>
        </TabPanel>
        <TabPanel id="email">
          <div className={panel}>
            <EmailPanel email={email} onUpdated={setEmail} />
          </div>
        </TabPanel>
        <TabPanel id="password">
          <div className={panel}>
            <PasswordPanel />
          </div>
        </TabPanel>
        <TabPanel id="organisation">
          <div className={panel}>
            <OrganisationPanel />
          </div>
        </TabPanel>
        <TabPanel id="webhooks">
          <div className={panel}>
            <WebhooksPanel />
          </div>
        </TabPanel>
        <TabPanel id="account">
          <div className={panel}>
            <AccountPanel />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
