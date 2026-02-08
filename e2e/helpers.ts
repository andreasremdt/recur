import { type Page, expect } from "@playwright/test";

export async function login(
  page: Page,
  email = "john@example.com",
  password = "password123",
) {
  await page.goto("/login.html");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
  await expect(page.locator("#user-name")).toBeVisible();
}
