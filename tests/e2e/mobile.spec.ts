import { expect, test } from "@playwright/test";
import { fillCheckout } from "./helpers";

test("mobile shopping: menu, bottom-sheet filters, sticky bar, checkout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Shop" })).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Shop" }).click();

  await page.getByRole("button", { name: /Filters/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "L", exact: true }).click();
  await sheet.getByRole("button", { name: /Show results/ }).click();
  await expect(page).toHaveURL(/size=L/);

  await page.goto("/products/chattogram-mariners-26-27-home-jersey");
  await page.getByRole("radio", { name: "L", exact: true }).click();
  await page.mouse.wheel(0, 1400);
  const sticky = page.locator(".fixed.bottom-0", { hasText: "Add to bag" });
  await expect(sticky).toBeVisible();
  await sticky.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("dialog").locator("h2.font-heading", { hasText: "Your bag" })).toBeVisible();

  await page.goto("/checkout");
  await fillCheckout(page);
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/checkout\/success/);
});
