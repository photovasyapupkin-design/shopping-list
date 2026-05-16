import { expect, test } from "@playwright/test";

test("creates a list and adds an item", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Shopping List" })).toBeVisible();
  await page.getByPlaceholder("New list").fill("Dinner");
  await page.getByRole("button", { name: "Create list" }).click();

  await expect(page.getByRole("heading", { name: "Dinner" })).toBeVisible();
  await page.getByPlaceholder("Add item").fill("Lemons");
  await page.getByPlaceholder("Qty").fill("4");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText("Lemons")).toBeVisible();
  await expect(page.getByText("4")).toBeVisible();
});
