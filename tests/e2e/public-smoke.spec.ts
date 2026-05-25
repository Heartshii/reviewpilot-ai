import { expect, test } from "@playwright/test";

test.describe("public smoke flows", () => {
  test("landing page renders primary conversion path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Turn Every Visit Into a 5-Star Google Review/i,
      })
    ).toBeVisible();

    const startTrial = page
      .getByRole("main")
      .getByRole("link", { name: /start free trial/i })
      .first();
    await expect(startTrial).toBeVisible();
    await expect(startTrial).toHaveAttribute("href", "/sign-up");
    await Promise.all([page.waitForURL(/\/sign-up/), startTrial.click()]);
  });

  test("sign-in page is reachable", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator("body")).toContainText(/sign in|continue/i);
  });

  test("trust pages load", async ({ page }) => {
    test.slow();
    for (const path of ["/about", "/contact", "/privacy", "/terms"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("body")).toContainText(/\S+/);
    }
  });
});
