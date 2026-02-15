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

    // Fill in the form
    await page.getByLabel(/name/i).fill("New User");
    await page.getByLabel(/email/i).fill("newuser@example.com");
    await page.getByLabel(/^password/i).fill("testpassword");
    await page.getByLabel(/confirm password/i).fill("testpassword");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL("/");

    // Open the user menu
    await page.getByRole("button", { name: /open user menu/i }).click();

    await expect(page.getByText(/new user/i)).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto("/register.html");

    // Fill in the form
    await page.getByLabel(/name/i).fill("New User");
    await page.getByLabel(/email/i).fill("newuser@example.com");
    await page.getByLabel(/^password/i).fill("testpassword");
    await page.getByLabel(/confirm password/i).fill("differentpassword");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page).toHaveURL("register.html");
  });

  test("shows error when email is already taken", async ({ page }) => {
    await page.goto("/register.html");

    // Fill in the form
    await page.getByLabel(/name/i).fill("Another John");
    await page.getByLabel(/email/i).fill("john@example.com");
    await page.getByLabel(/^password/i).fill("testpassword");
    await page.getByLabel(/confirm password/i).fill("testpassword");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/email already exists/i)).toBeVisible();
    await expect(page).toHaveURL("register.html");
  });
});

test.describe("Login", () => {
  test("logs in with valid credentials and redirects to the main page", async ({
    page,
  }) => {
    await page.goto("/login.html");

    // Fill in the form
    await page.getByLabel(/email/i).fill("john@example.com");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");

    // Open the user menu
    await page.getByRole("button", { name: /open user menu/i }).click();

    await expect(page.getByText(/john doe/i)).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login.html");

    // Fill in the form
    await page.getByLabel(/email/i).fill("john@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL("login.html");
  });

  test("shows error with non-existent email", async ({ page }) => {
    await page.goto("/login.html");

    // Fill in the form
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password/i).fill("testpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL("login.html");
  });
});

test.describe("Logout", () => {
  test("logs out and redirects to the login page", async ({ page }) => {
    await page.goto("/login.html");
    // Fill in the form
    await page.getByLabel(/email/i).fill("john@example.com");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");

    // Open the user menu
    await page.getByRole("button", { name: /open user menu/i }).click();
    await page.getByRole("button", { name: /log out/i }).click();

    await expect(page).toHaveURL("login.html");
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
