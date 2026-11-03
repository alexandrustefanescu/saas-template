import { expect, test, type Page } from "@playwright/test";

const signedInUser = {
  id: "user-1",
  name: "Devon",
  email: "devon@example.com",
  emailVerified: true,
  image: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const defaultOrganisation = {
  id: "org-1",
  name: "Acme Organisation",
  slug: "acme",
  createdAt: signedInUser.createdAt,
};

const signedInSession = {
  session: {
    id: "session-1",
    userId: signedInUser.id,
    expiresAt: "2099-01-01T00:00:00.000Z",
    token: "session-token",
    createdAt: signedInUser.createdAt,
    updatedAt: signedInUser.updatedAt,
    activeOrganizationId: defaultOrganisation.id as string | null,
  },
  user: signedInUser,
};

const signedInSessionWithoutOrg = {
  ...signedInSession,
  session: {
    ...signedInSession.session,
    activeOrganizationId: null,
  },
};

type MockSession = typeof signedInSession;

type MockAuthOptions = {
  organisations?: Array<typeof defaultOrganisation>;
};

async function mockAuth(page: Page, session: MockSession | null, options: MockAuthOptions = {}) {
  let currentSession = session;
  const organisations = [...(options.organisations ?? [defaultOrganisation])];
  let activeOrganizationId = session?.session.activeOrganizationId ?? null;
  const members = [
    {
      id: "member-1",
      organizationId: defaultOrganisation.id,
      userId: signedInUser.id,
      role: "owner",
      createdAt: signedInUser.createdAt,
      user: { email: signedInUser.email, name: signedInUser.name },
    },
  ];
  const invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    organizationId: string;
  }> = [];

  await page.route("**/api/auth/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.includes("/get-session")) {
      if (!currentSession) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "null",
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...currentSession,
          session: {
            ...currentSession.session,
            activeOrganizationId,
          },
        }),
      });
      return;
    }
    if (path.includes("/sign-in/email")) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "session-token", user: signedInUser }),
      });
      return;
    }
    if (path.includes("/request-password-reset")) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: true, message: "ok" }),
      });
      return;
    }
    if (path.includes("/delete-user")) {
      currentSession = null;
      activeOrganizationId = null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "User deleted" }),
      });
      return;
    }

    if (method === "GET" && path.endsWith("/organization/list")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(organisations),
      });
      return;
    }

    if (method === "POST" && path.endsWith("/organization/create")) {
      const body = request.postDataJSON() as { name: string; slug: string };
      const created = {
        id: `org-${organisations.length + 1}`,
        name: body.name,
        slug: body.slug,
        createdAt: "2026-11-03T00:00:00.000Z",
      };
      organisations.push(created);
      activeOrganizationId = created.id;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
      return;
    }

    if (method === "POST" && path.endsWith("/organization/set-active")) {
      const body = request.postDataJSON() as { organizationId?: string | null };
      activeOrganizationId = body.organizationId ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: activeOrganizationId,
        }),
      });
      return;
    }

    if (
      path.includes("/organization/get-full-organization") ||
      path.includes("/organization/get-active-member")
    ) {
      const org =
        organisations.find((item) => item.id === activeOrganizationId) ?? organisations[0];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          path.includes("get-active-member") ? members[0] : { ...org, members, invitations },
        ),
      });
      return;
    }

    if (path.includes("/organization/get-active-member-role")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "owner" }),
      });
      return;
    }

    if (method === "GET" && path.includes("/organization/list-members")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ members }),
      });
      return;
    }

    if (method === "GET" && path.includes("/organization/list-invitations")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(invitations),
      });
      return;
    }

    if (method === "POST" && path.includes("/organization/invite-member")) {
      const body = request.postDataJSON() as { email: string; role: string };
      const invitation = {
        id: `invite-${invitations.length + 1}`,
        email: body.email,
        role: body.role,
        status: "pending",
        organizationId: activeOrganizationId ?? defaultOrganisation.id,
      };
      invitations.push(invitation);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(invitation),
      });
      return;
    }

    if (method === "POST" && path.includes("/organization/cancel-invitation")) {
      const body = request.postDataJSON() as { invitationId: string };
      const index = invitations.findIndex((row) => row.id === body.invitationId);
      if (index >= 0) invitations.splice(index, 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: body.invitationId }),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: "application/json", body: "null" });
  });
  await page.route("**/v1/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: signedInUser,
        session: { id: signedInSession.session.id },
      }),
    });
  });
  await page.route("**/v1/webhooks", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/v1/items", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
      return;
    }
    await route.fallback();
  });

  const notifications = [
    {
      id: "note-1",
      organization_id: defaultOrganisation.id,
      kind: "item.created",
      title: "Item created",
      body: "Launch checklist",
      actor_user_id: signedInUser.id,
      created_at: "2026-11-03T12:00:00.000Z",
      unread: true,
    },
  ];

  await page.route("**/v1/notifications**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (method === "GET" && path === "/v1/notifications") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(notifications),
      });
      return;
    }

    if (method === "POST" && path === "/v1/notifications/read-all") {
      for (const note of notifications) note.unread = false;
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    const readMatch = path.match(/^\/v1\/notifications\/([^/]+)\/read$/);
    if (method === "POST" && readMatch) {
      const note = notifications.find((row) => row.id === readMatch[1]);
      if (note) note.unread = false;
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "not found" }),
    });
  });
}

async function mockItems(page: Page) {
  const items: Array<{
    id: string;
    user_id: string;
    name: string;
    created_at: string;
  }> = [
    {
      id: "item-1",
      user_id: signedInUser.id,
      name: "Launch checklist",
      created_at: "2026-11-01T12:00:00.000Z",
    },
  ];

  await page.route("**/v1/items**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "GET" && url.pathname === "/v1/items") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(items),
      });
      return;
    }

    if (method === "POST" && url.pathname === "/v1/items") {
      const body = request.postDataJSON() as { name: string };
      const created = {
        id: `item-${items.length + 1}`,
        user_id: signedInUser.id,
        name: body.name,
        created_at: "2026-11-03T00:00:00.000Z",
      };
      items.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
      return;
    }

    await route.fallback();
  });
}

async function mockWebhooks(page: Page) {
  const endpoints: Array<{
    id: string;
    url: string;
    events: string[];
    created_at: string;
    secret?: string;
  }> = [];

  await page.route("**/v1/webhooks**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "GET" && path === "/v1/webhooks") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(endpoints.map(({ secret: _secret, ...endpoint }) => endpoint)),
      });
      return;
    }

    if (method === "POST" && path === "/v1/webhooks") {
      const body = request.postDataJSON() as { url: string; events: string[] };
      const created = {
        id: `hook-${endpoints.length + 1}`,
        url: body.url,
        events: body.events,
        created_at: "2026-11-03T00:00:00.000Z",
        secret: "test-secret-once",
      };
      endpoints.push(created);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
      return;
    }

    const pingMatch = path.match(/^\/v1\/webhooks\/([^/]+)\/ping$/);
    if (method === "POST" && pingMatch) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "delivery-1",
          endpoint_id: pingMatch[1],
          event: "webhook.ping",
          success: true,
          status_code: 200,
          error: null,
          created_at: "2026-11-03T00:01:00.000Z",
        }),
      });
      return;
    }

    const deliveriesMatch = path.match(/^\/v1\/webhooks\/([^/]+)\/deliveries$/);
    if (method === "GET" && deliveriesMatch) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "delivery-1",
            endpoint_id: deliveriesMatch[1],
            event: "webhook.ping",
            success: true,
            status_code: 200,
            error: null,
            created_at: "2026-11-03T00:01:00.000Z",
          },
        ]),
      });
      return;
    }

    const deleteMatch = path.match(/^\/v1\/webhooks\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const index = endpoints.findIndex((endpoint) => endpoint.id === deleteMatch[1]);
      if (index >= 0) endpoints.splice(index, 1);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "not found" }),
    });
  });
}

test.describe("auth flows", () => {
  test("dashboard home shows sidebar only", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome to the dashboard" })).toHaveCount(0);
  });

  test("sign-in validates empty fields", async ({ page }) => {
    await mockAuth(page, null);
    await page.goto("/sign-in");

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
  });

  test("sign-in accepts valid input and toggles remember me", async ({ page }) => {
    await mockAuth(page, null);
    await page.goto("/sign-in");

    await page.getByRole("textbox", { name: "Email address" }).fill("devon@example.com");
    await page.getByLabel("Password").fill("Pas$w0rd");

    // Spectrum Checkbox can fail Playwright actionability on the role node;
    // prefer the labeled control via test id + keyboard/check.
    const rememberMe = page.getByTestId("sign-in-remember-me");
    await rememberMe.click({ force: true });
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeChecked();

    const submit = page.getByRole("button", { name: "Sign in" });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();
    await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible();
    await expect(page.getByText("Signed in as devon@example.com")).toBeVisible();
  });

  test("forgot password sends a reset link", async ({ page }) => {
    await mockAuth(page, null);
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();

    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Email is required.")).toBeVisible();

    await page.getByRole("textbox", { name: "Email address" }).fill("devon@example.com");
    const submit = page.getByRole("button", { name: "Send reset link" });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole("button", { name: "Sending…" })).toBeVisible();
    await expect(page.getByText("Reset link sent to devon@example.com")).toBeVisible();

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("navigates between sign-in and sign-up", async ({ page }) => {
    await mockAuth(page, null);
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("dashboard home welcomes the signed-in user", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Welcome, Devon" })).toBeVisible();
    await expect(page.getByText(/Signed in as devon@example.com/)).toBeVisible();
    await expect(page.getByText(/Active organisation: Acme Organisation/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Switch organisation/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to items" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open settings" })).toBeVisible();
  });

  test("notifications bell shows organisation inbox", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await page.goto("/");

    await expect(page.getByTestId("notifications-unread-dot")).toBeVisible();
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByTestId("notifications-panel")).toBeVisible();
    await expect(page.getByText(/Item created: Launch checklist/)).toBeVisible();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByText("All notifications marked as read.")).toBeVisible();
  });

  test("users without an organisation are sent to onboarding", async ({ page }) => {
    await mockAuth(page, signedInSessionWithoutOrg, { organisations: [] });
    await page.goto("/");

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Create your organisation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Dashboard" })).toHaveCount(0);
  });

  test("onboarding creates an organisation and opens home ready state", async ({ page }) => {
    await mockAuth(page, signedInSessionWithoutOrg, { organisations: [] });
    await page.goto("/onboarding");

    await page.getByRole("textbox", { name: "Organisation name" }).fill("Northwind");
    await expect(page.getByRole("textbox", { name: "Slug" })).toHaveValue("northwind");
    await page.getByRole("button", { name: "Create and continue" }).click();

    await expect(page).toHaveURL(/\/\?welcome=true$/);
    await expect(page.getByRole("status")).toContainText(/You're ready/);
    await expect(page.getByRole("heading", { name: "Welcome, Devon" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
  });

  test("organisation switcher can create an organisation", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await page.goto("/");

    await page.getByRole("button", { name: /Switch organisation/ }).click();
    await page.getByRole("menuitem", { name: /Add organisation/ }).click();
    const createDialog = page.getByRole("dialog").filter({ hasText: "Create organisation" });
    await createDialog.getByRole("textbox", { name: "Name" }).fill("Northwind");
    await expect(createDialog.getByRole("textbox", { name: "Slug" })).toHaveValue("northwind");
    await createDialog.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Organisation created.")).toBeVisible();
  });

  test("dashboard items page shows items table", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await mockItems(page);
    await page.goto("/items");

    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
    const table = page.getByRole("grid", { name: "Items" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /Launch checklist/ })).toBeVisible();

    await page.getByRole("textbox", { name: "Name" }).fill("Webhook probe");
    await page.getByTestId("items-create").click();
    await expect(page.getByText("Item created.")).toBeVisible();
    await expect(table.getByRole("row", { name: /Webhook probe/ })).toBeVisible();
  });

  test("dashboard sidebar opens settings", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Dashboard" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Products" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Items", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("settings page switches categories and creates a webhook", async ({ page }) => {
    await mockAuth(page, signedInSession);
    await mockWebhooks(page);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const categories = page.getByRole("tablist", { name: "Settings categories" });
    await expect(categories.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(categories.getByRole("tab", { name: "Email" })).toBeVisible();
    await expect(categories.getByRole("tab", { name: "Password" })).toBeVisible();
    await expect(categories.getByRole("tab", { name: "Organisation" })).toBeVisible();
    await expect(categories.getByRole("tab", { name: "Webhooks" })).toBeVisible();
    await expect(categories.getByRole("tab", { name: "Account" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Display name" })).toHaveValue("Devon");

    await categories.getByRole("tab", { name: "Email" }).click();
    await expect(page.getByRole("heading", { name: "Email" })).toBeVisible();
    await expect(page.getByText("Current email: devon@example.com")).toBeVisible();

    await categories.getByRole("tab", { name: "Password" }).click();
    await expect(page.getByRole("heading", { name: "Password" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Current password" })).toBeVisible();

    await categories.getByRole("tab", { name: "Organisation" }).click();
    await expect(page.getByRole("heading", { name: "Organisation" })).toBeVisible();
    await expect(page.getByText("devon@example.com")).toBeVisible();
    await page.getByRole("textbox", { name: "Email" }).fill("teammate@example.com");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText("Invitation created.")).toBeVisible();
    await expect(page.getByText(/teammate@example.com/)).toBeVisible();

    await categories.getByRole("tab", { name: "Webhooks" }).click();
    await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();
    await page.getByRole("textbox", { name: "Endpoint URL" }).fill("https://example.com/hooks");
    await page.getByRole("button", { name: "Add webhook" }).click();

    await expect(page.getByText("test-secret-once")).toBeVisible();
    await expect(page.getByText("https://example.com/hooks")).toBeVisible();
    await expect(page.getByText("Webhook endpoint created.")).toBeVisible();

    await categories.getByRole("tab", { name: "Account" }).click();
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await page
      .getByRole("region", { name: /Account/i })
      .getByRole("textbox", { name: "Password" })
      .fill("password1234!");
    await page.getByTestId("settings-delete-confirm").click({ force: true });
    await page.getByTestId("settings-delete-account").click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
