import path from "node:path";
import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("customer uploads a photo for virtual try-on and sees an honestly labelled result", async ({ page }, testInfo) => {
  // Synthetic test image (no real person).
  const file = path.join(testInfo.outputDir, "person.png");
  fs.mkdirSync(testInfo.outputDir, { recursive: true });
  const sharp = (await import("sharp")).default;
  await sharp({ create: { width: 640, height: 900, channels: 3, background: "#cdbfae" } }).png().toFile(file);

  await page.goto("/try-on?product=bangladesh-supporters-26-home-jersey");
  await page.setInputFiles("input[type=file]", file);
  // Generate is disabled until consent is given.
  await expect(page.getByRole("button", { name: /Generate try-on/ })).toBeDisabled();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: /Generate try-on/ }).click();
  await expect(page.getByText(/Generating your preview|Uploading photo securely|Fitting the jersey/).first()).toBeVisible();
  const label = page.getByText(/DEMO MODE — this is not an AI try-on|AI-generated preview/);
  await expect(label).toBeVisible({ timeout: 60_000 });
  // Customer can delete their images immediately.
  await page.getByRole("button", { name: /Delete my images now/ }).click();
  await expect(page.getByText("Your AI preview will appear here")).toBeVisible();
});

test("try-on rejects requests without consent", async ({ request, baseURL }) => {
  const res = await request.post("/api/try-on/jobs", { multipart: { productId: "x", consent: "false" }, headers: { origin: baseURL! } });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe("CONSENT_REQUIRED");
});

test.describe("authorization", () => {
  test("unauthenticated users cannot reach protected admin APIs or pages", async ({ request, page }) => {
    for (const url of ["/api/admin/orders/export", "/api/admin/products/export", "/api/admin/newsletter/export", "/api/admin/couriers/pathao/locations?kind=cities"]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(401);
    }
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a customer session is not an admin session", async ({ page, request }) => {
    await page.goto("/account/register");
    await page.getByLabel("Full name").fill("Curious Customer");
    await page.getByLabel("Email", { exact: true }).fill(`curious-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("Shopper123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    const cookies = await page.context().cookies();
    const res = await request.get("/api/admin/orders/export", { headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") } });
    expect(res.status()).toBe(401);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("cross-origin JSON mutations are rejected", async ({ request }) => {
    const res = await request.post("/api/cart", { data: { variantId: "x" }, headers: { origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
  });
});
