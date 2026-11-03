import { Form } from "@react-spectrum/s2/Form";
import { Skeleton } from "@react-spectrum/s2/Skeleton";
import { Text } from "@react-spectrum/s2/Text";
import { TextField } from "@react-spectrum/s2/TextField";
import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2/Tabs";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";
import { spectrumStyles } from "#/spectrum-styles";

const page = style({
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

const header = style({
  display: "flex",
  flexDirection: {
    default: "column",
    sm: "row",
  },
  alignItems: {
    default: "stretch",
    sm: "start",
  },
  justifyContent: "space-between",
  gap: 12,
  width: "full",
  flexShrink: 0,
});

const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "full",
  flexGrow: 1,
  minHeight: 0,
  boxSizing: "border-box",
});

const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "full",
  paddingStart: 24,
  boxSizing: "border-box",
});

/** Route pending UI that mirrors the Settings page layout. */
export function SettingsSkeleton() {
  return (
    <Skeleton isLoading>
      <section className={page} aria-busy="true" aria-label="Loading settings">
        <PageBreadcrumbs
          items={[
            { id: "home", label: "Home", href: "/" },
            { id: "settings", label: "Settings" },
          ]}
        />
        <div className={header}>
          <div className={style({ display: "flex", flexDirection: "column", gap: 4 })}>
            <Text styles={style({ font: "heading-xl", margin: 0 })}>Settings</Text>
            <Text styles={style({ font: "body", margin: 0 })}>
              Manage your profile, security, and integrations.
            </Text>
          </div>
          <Button variant="secondary" isDisabled>
            Sign out
          </Button>
        </div>

        <div className={layout}>
          <Tabs
            aria-label="Settings categories"
            orientation="vertical"
            density="compact"
            defaultSelectedKey="profile"
            styles={spectrumStyles(style({ width: "full", flexGrow: 1, minHeight: 0 }))}
          >
            <TabList styles={spectrumStyles(style({ width: 160, flexShrink: 0 }))}>
              <Tab id="profile">Profile</Tab>
              <Tab id="email">Email</Tab>
              <Tab id="password">Password</Tab>
              <Tab id="webhooks">Webhooks</Tab>
              <Tab id="account">Account</Tab>
            </TabList>

            <TabPanel id="profile">
              <div className={panel}>
                <Text styles={style({ font: "heading", margin: 0 })}>Profile</Text>
                <Text styles={style({ font: "body", margin: 0 })}>
                  Update the name shown across your account.
                </Text>
                <Form
                  styles={spectrumStyles(
                    style({
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      width: "full",
                      maxWidth: 480,
                    }),
                  )}
                >
                  <TextField label="Display name" defaultValue="Loading display name" />
                  <Button type="button">Save profile</Button>
                </Form>
              </div>
            </TabPanel>
          </Tabs>
        </div>
      </section>
    </Skeleton>
  );
}
