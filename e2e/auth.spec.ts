import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";

test.beforeEach(() => {
  execSync("bun run src/seed.ts", {
    env: { ...process.env, DB_PATH: "test.db" },
  });
});

test.describe("Registration", () => {
  test("registers a new account and redirects to the main page", async ({
    page,
  }) => {
    await page.goto("/register.html");

    await page.fill("#name", "New User");
    await page.fill("#email", "newuser@example.com");
    await page.fill("#password", "testpassword");
    await page.fill("#confirmPassword", "testpassword");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/");
    await expect(page.locator("#user-name")).toHaveText("New User");
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto("/register.html");

    await page.fill("#name", "New User");
    await page.fill("#email", "newuser@example.com");
    await page.fill("#password", "testpassword");
    await page.fill("#confirmPassword", "differentpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("#error-message")).toBeVisible();
    await expect(page.locator("#error-message")).toHaveText(
      "Passwords do not match",
    );
    await expect(page).toHaveURL(/register\.html/);
  });

  test("shows error when email is already taken", async ({ page }) => {
    await page.goto("/register.html");

    await page.fill("#name", "Another John");
    await page.fill("#email", "john@example.com");
    await page.fill("#password", "testpassword");
    await page.fill("#confirmPassword", "testpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("#error-message")).toBeVisible();
    await expect(page.locator("#error-message")).toContainText(
      "Email already exists",
    );
    await expect(page).toHaveURL(/register\.html/);
  });
});

test.describe("Login", () => {
  test("logs in with valid credentials and redirects to the main page", async ({
    page,
  }) => {
    await page.goto("/login.html");

    await page.fill('input[name="email"]', "john@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/");
    await expect(page.locator("#user-name")).toHaveText("John Doe");
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login.html");

    await page.fill('input[name="email"]', "john@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("#error-message")).toBeVisible();
    await expect(page.locator("#error-message")).toContainText(
      "Invalid email or password",
    );
    await expect(page).toHaveURL(/login\.html/);
  });

  test("shows error with non-existent email", async ({ page }) => {
    await page.goto("/login.html");

    await page.fill('input[name="email"]', "nobody@example.com");
    await page.fill('input[name="password"]', "testpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("#error-message")).toBeVisible();
    await expect(page.locator("#error-message")).toContainText(
      "Invalid email or password",
    );
  });
});

test.describe("Logout", () => {
  test("logs out and redirects to the login page", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="email"]', "john@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/");

    await page.click("#logout-btn");

    await expect(page).toHaveURL(/login\.html/);
  });
});

test.describe("Protected routes", () => {
  test("redirects to login page when visiting the app unauthenticated", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/login\.html/);
  });
});
