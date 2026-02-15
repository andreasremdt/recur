import { type Page, expect } from "@playwright/test";

export async function login(
  page: Page,
  email = "john@example.com",
  password = "password123",
) {
  await page.goto("/login.html");

  // Fill in the form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("/");

  // Open the user menu
  await page.getByRole("button", { name: /open user menu/i }).click();

  await expect(page.getByText(/john doe/i)).toBeVisible();

  // Close the user menu so that it doesn't interfere with other tests by overlapping with other elements
  await page.getByRole("button", { name: /open user menu/i }).click();
}
