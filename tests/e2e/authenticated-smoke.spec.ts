import { expect, test } from "@playwright/test";
import { bootstrapE2ESession } from "./helpers/e2e-session";

test.describe("authenticated smoke flows", () => {
  test("setup creates a workspace and opens billing", async ({ page, context }) => {
    await bootstrapE2ESession({
      request: page.request,
      context,
      page,
      mode: "withoutWorkspace",
    });

    await page.goto("/setup");
    await expect(page).toHaveURL(/\/setup/);

    await page.getByTestId("setup-business-name").fill("Atlas Dental Studio");
    await page
      .getByTestId("setup-business-type")
      .selectOption("DENTAL_CLINIC");
    await page
      .getByTestId("setup-workspace-slug")
      .fill("atlas-dental-studio");
    await page
      .getByTestId("setup-business-subtype")
      .fill("family dentistry");
    await page.getByTestId("setup-contact-phone").fill("5551112222");
    await page
      .getByTestId("setup-website-url")
      .fill("https://atlas-dental.example.com");
    await page
      .getByTestId("setup-google-review-url")
      .fill("https://g.page/r/example");

    await Promise.all([
      page.waitForURL(/\/dashboard\/billing/),
      page.getByTestId("setup-create-workspace").click(),
    ]);

    await expect(
      page.getByRole("heading", { name: /billing/i })
    ).toBeVisible();
    await expect(page.locator("body")).toContainText(/current plan/i);
  });

  test("dashboard opens for a seeded workspace", async ({ page, context }) => {
    await bootstrapE2ESession({
      request: page.request,
      context,
      page,
      mode: "withWorkspace",
      businessName: "North Point Wellness",
      businessType: "PROFESSIONAL_SERVICE",
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("body")).toContainText(/reviewpilot workspace/i);
  });
});
