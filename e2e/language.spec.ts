import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  execSync("bun run src/seed.ts", {
    env: { ...process.env, DB_PATH: "test.db" },
  });

  await login(page);
  await expect(page.locator('[data-target="word-count"]')).not.toBeEmpty();
});

test("creates a new language and selects it", async ({ page }) => {
  await page.selectOption("#language-dropdown", "add-new");
  await expect(page.locator("#language-dialog")).toBeVisible();

  await page.selectOption("#language-select", "German");
  await page.click('#language-form button[type="submit"]');

  await expect(page.locator("#language-dialog")).not.toBeVisible();

  // German is now selected and has no vocabulary
  await expect(page.locator("#language-dropdown")).toContainText("German");
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "0 words",
  );
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(0);
});

test("switches between languages and loads corresponding vocabulary", async ({
  page,
}) => {
  // French is auto-selected (alphabetically first) with no vocabulary
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "0 words",
  );
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(0);

  // Switch to Spanish — has 11 seeded words
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(11);
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "11 words",
  );

  // Switch back to French — empty again
  await page.selectOption("#language-dropdown", { label: "French" });
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(0);
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "0 words",
  );
});

test("shows empty state when language has no vocabulary", async ({ page }) => {
  // French is auto-selected and has no vocabulary
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(0);
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "0 words",
  );
  await expect(page.locator("#pagination-range")).toHaveText("0");
  await expect(page.locator("#pagination-total")).toHaveText("0");
});

test("only shows languages not yet added in the create dialog", async ({
  page,
}) => {
  await page.selectOption("#language-dropdown", "add-new");
  await expect(page.locator("#language-dialog")).toBeVisible();

  const options = await page
    .locator("#language-select option")
    .allTextContents();

  // Spanish and French are already added — should not appear
  expect(options).not.toContain("Spanish");
  expect(options).not.toContain("French");

  // Other languages should be available
  expect(options).toContain("German");
  expect(options).toContain("Italian");
  expect(options).toContain("Japanese");

  // Total should be 19 available - 2 already added = 17
  expect(options).toHaveLength(17);
});

test("cancels the language dialog without creating", async ({ page }) => {
  await page.selectOption("#language-dropdown", "add-new");
  await expect(page.locator("#language-dialog")).toBeVisible();

  await page.click("#language-dialog-cancel");

  await expect(page.locator("#language-dialog")).not.toBeVisible();
  // Should still only have French and Spanish in the dropdown
  const languageOptions = await page
    .locator("#language-dropdown option:not(#add-language-option)")
    .allTextContents();
  expect(languageOptions).toEqual(["French", "Spanish"]);
});
