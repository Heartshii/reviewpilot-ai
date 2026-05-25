import { expect, test } from "@playwright/test";
import { bootstrapE2ESession } from "./helpers/e2e-session";

test.describe("kiosk smoke", () => {
  test("kiosk accepts a new customer check-in", async ({ page, context }) => {
    test.slow();

    const data = await bootstrapE2ESession({
      request: page.request,
      context,
      page,
      mode: "withWorkspace",
      businessName: "Harbor Fitness Lab",
      businessType: "FITNESS_STUDIO",
    });
    expect(data.slug).toBeTruthy();

    await page.goto(`/kiosk/${data.slug}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /new member/i }).click();
    await page.getByPlaceholder(/your name/i).fill("Jordan");

    for (const digit of "5551234567") {
      await page.getByRole("button", { name: digit }).click();
    }

    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByText(/I agree to receive messages from/i).click();
    await page.getByRole("button", { name: /join and earn rewards/i }).click();

    await expect(page.locator("body")).toContainText(/all set/i);
  });
});
