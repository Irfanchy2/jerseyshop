import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "admin@jerseystudio.local", password: process.env.E2E_ADMIN_PASSWORD ?? "Admin12345" };

export const randomPhone = () => `017${String(Math.floor(10000000 + Math.random() * 89999999))}`;

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function fillCheckout(page: Page, phone = randomPhone()) {
  await page.getByLabel("Full name").fill("E2E Shopper");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Area / Thana").fill("Dhanmondi");
  await page.getByLabel("House, road, area details").fill("House 7, Road 3, Dhanmondi");
  return phone;
}
