import { expect, test } from "@playwright/test";
import { bootstrapE2ESession } from "./helpers/e2e-session";

test.describe("founder workspace walkthrough", () => {
  test("core dashboard pages load for a seeded workspace", async ({
    page,
    context,
  }) => {
    await bootstrapE2ESession({
      request: page.request,
      context,
      page,
      mode: "withWorkspace",
      businessName: "North Ridge Dental",
      businessType: "DENTAL_CLINIC",
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/reviewpilot workspace/i);

    const pageChecks: Array<{ path: string; text: RegExp }> = [
      { path: "/dashboard/customers", text: /customer memory/i },
      { path: "/dashboard/reviews", text: /reviews\s*&\s*feedback/i },
      { path: "/dashboard/loyalty", text: /turn points into claimable rewards/i },
      { path: "/dashboard/sms", text: /messaging center/i },
      { path: "/dashboard/integrations", text: /how to connect a provider/i },
      { path: "/dashboard/leaderboard", text: /leaderboard and badge controls/i },
      { path: "/dashboard/settings", text: /business profile/i },
      { path: "/dashboard/billing", text: /current plan/i },
    ];

    for (const item of pageChecks) {
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(item.path.replace("/", "\\/")));
      await expect(page.locator("body")).not.toContainText(/loading workspace/i);
      await expect(page.locator("body")).toContainText(item.text);
    }
  });

  test("mobile landing nav exposes sign in", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: /menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await Promise.all([page.waitForURL(/\/sign-in/), signInLink.click()]);
  });
});
