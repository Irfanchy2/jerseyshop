import { expect, test } from "@playwright/test";
import { adminLogin, fillCheckout } from "./helpers";

test.describe("customer shopping journey", () => {
  test("filters → size → bag → COD checkout → admin sees order → status update → mock shipment", async ({ page }) => {
    // 1. Find a jersey using filters (real data).
    await page.goto("/shop?team=sylhet-tea-valley&size=M");
    await expect(page.getByText(/1 products|\d+ products/)).toBeVisible();
    const card = page.getByRole("link", { name: "Sylhet Tea Valley 26/27 Home Jersey" }).first();
    await card.click();

    // 2. Select a size. 3. Add to bag.
    await page.getByRole("radio", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByRole("dialog").locator("h2.font-heading", { hasText: "Your bag" })).toBeVisible();

    // 4. COD checkout.
    await page.goto("/checkout");
    const phone = await fillCheckout(page);
    await page.getByRole("button", { name: /Place order/ }).click();
    await expect(page).toHaveURL(/checkout\/success\?order=JS-/);
    const orderNumber = new URL(page.url()).searchParams.get("order")!;
    await expect(page.getByRole("heading", { name: "Thank you — your order is placed" })).toBeVisible();

    // Guest tracking with number + phone.
    await page.goto(`/track-order?order=${orderNumber}&phone=${phone}`);
    await expect(page.getByText("Order placed").first()).toBeVisible();

    // 5. Order appears in admin. 6. Admin updates status.
    await adminLogin(page);
    await page.goto(`/admin/orders?q=${orderNumber}`);
    await page.getByRole("link", { name: orderNumber }).click();
    await page.getByRole("button", { name: "Confirm order" }).last().click();
    await expect(page.getByText("Order marked confirmed.")).toBeVisible();

    // 7. Admin creates a mocked courier shipment safely.
    await page.goto("/admin/settings/shipping");
    const steadfast = page.locator("section", { hasText: "Steadfast Courier" }).first();
    const sw = steadfast.getByRole("switch");
    if ((await sw.getAttribute("aria-checked")) !== "true") {
      await sw.click();
      await steadfast.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Courier settings saved.")).toBeVisible();
    }
    await page.goto(`/admin/orders?q=${orderNumber}`);
    await page.getByRole("link", { name: orderNumber }).click();
    await page.getByRole("button", { name: "Create shipment" }).click();
    await page.getByLabel("Courier").selectOption("steadfast");
    await page.getByRole("button", { name: "Review booking" }).click();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText(/Mock shipment booked: MOCK-/)).toBeVisible();
    await expect(page.getByText("mock — not a real booking")).toBeVisible();
    // Duplicate protection: the create button is gone once a shipment is active.
    await expect(page.getByRole("button", { name: "Create shipment" })).toHaveCount(0);
  });

  test("admin edits a product and the storefront reflects it", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/products?q=Northern Star 26/27 Home");
    await page.getByRole("link", { name: /Northern Star 26\/27 Home Jersey/ }).first().click();
    const price = String(1800 + Math.floor(Math.random() * 90));
    await page.getByLabel("Price (৳)", { exact: true }).fill(price);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Product saved.")).toBeVisible();
    await page.goto("/products/northern-star-26-27-home-jersey");
    await expect(page.locator("main")).toContainText(`৳${Number(price).toLocaleString("en-IN")}`);
  });

  test("personalisation metadata persists through checkout", async ({ page }) => {
    await page.goto("/products/studio-custom-team-jersey");
    await page.getByRole("link", { name: /Add name & number/ }).click();
    await page.getByPlaceholder("YOUR NAME").fill("RAFIQ");
    await page.getByPlaceholder("10").fill("23");
    await page.getByRole("button", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: /Add personalised jersey/ }).click();
    await expect(page.getByRole("dialog").getByText(/Personalised: RAFIQ #23/)).toBeVisible();
    await page.goto("/checkout");
    await fillCheckout(page);
    await page.getByRole("button", { name: /Place order/ }).click();
    await expect(page).toHaveURL(/checkout\/success/);
    await expect(page.getByText("Personalised: RAFIQ #23")).toBeVisible();
  });
});
