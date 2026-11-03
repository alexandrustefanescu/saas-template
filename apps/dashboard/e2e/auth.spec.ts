import { expect, test } from "@playwright/test";

test.describe("auth flows", () => {
  test("dashboard home shows sidebar only", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome to the dashboard" })).toHaveCount(0);
  });

  test("sign-in validates empty fields", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
  });

  test("sign-in accepts valid input and toggles remember me", async ({ page }) => {
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
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("dashboard sidebar opens settings", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Products" })).toHaveCount(0);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
