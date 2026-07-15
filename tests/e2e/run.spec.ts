import { expect, test } from "@playwright/test";

test("creates a bounded run and discloses measured savings", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Ship code/ })).toBeVisible();
  await page.getByRole("button", { name: "Start bounded run" }).click();
  await expect(page.getByText("Draft pull request ready")).toBeVisible();
  await expect(page.getByText("70% target met")).toBeVisible();
  await expect(page.getByText(/not a universal production guarantee/i)).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", await page.locator("body").evaluate((body) => body.clientWidth));
  expect(consoleErrors).toEqual([]);
});
