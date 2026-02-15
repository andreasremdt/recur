import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  execSync("bun run src/seed.ts", {
    env: { ...process.env, DB_PATH: "test.db" },
  });

  await login(page);
  await expect(page.getByText(/\d+ words/)).toBeVisible();
});

test("creates a new language and selects it", async ({ page }) => {
  let vocabularyTable = page.getByRole("table");

  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /add language/i }).click();

  let dialog = page.getByRole("dialog", { name: /add language/i });

  await expect(dialog).toBeVisible();

  await page
    .getByRole("combobox", { name: /select a language/i })
    .selectOption("German");

  await dialog.getByRole("button", { name: /add language/i }).click();

  await expect(dialog).not.toBeVisible();

  // German is now selected and has no vocabulary
  await expect(page.getByText(/0 words/i)).toBeVisible();
  await expect(vocabularyTable.locator("tbody tr")).toHaveCount(0);
});

test("switches between languages and loads corresponding vocabulary", async ({
  page,
}) => {
  let vocabularyTable = page.getByRole("table");

  // French is auto-selected (alphabetically first) with no vocabulary
  await expect(page.getByText(/0 words/)).toBeVisible();
  await expect(vocabularyTable.locator("tbody tr")).toHaveCount(0);

  // Switch to Spanish — has 11 seeded words
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();
  await expect(vocabularyTable.locator("tbody tr")).toHaveCount(11);
  await expect(page.getByText(/11 words/i)).toBeVisible();

  // Switch back to French — empty again
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /french/i }).click();
  await expect(vocabularyTable.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByText(/0 words/)).toBeVisible();
});

test("shows empty state when language has no vocabulary", async ({ page }) => {
  let vocabularyTable = page.getByRole("table");

  // French is auto-selected and has no vocabulary
  await expect(vocabularyTable.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByText(/0 words/i)).toBeVisible();
  await expect(page.locator("#pagination-range")).toHaveText("0");
  await expect(page.locator("#pagination-total")).toHaveText("0");
});

// test("only shows languages not yet added in the create dialog", async ({
//   page,
// }) => {
//   await page.getByRole("button", { name: /open your languages/i }).click();
//   await page.getByRole("button", { name: /add language/i }).click();

//   let dialog = page.getByRole("dialog", { name: /add language/i });
//   await expect(dialog).toBeVisible();

//   let options = await dialog
//     .getByRole("combobox", { name: /select a language/i })
//     .locator("option")
//     .allTextContents();

//   // Spanish and French are already added — should not appear
//   expect(options).not.toContain("Spanish");
//   expect(options).not.toContain("French");

//   // Other languages should be available
//   expect(options).toContain("German");
//   expect(options).toContain("Italian");
//   expect(options).toContain("Japanese");

//   // Total should be 19 available - 2 already added = 17
//   expect(options).toHaveLength(17);
// });

test("cancels the language dialog without creating", async ({ page }) => {
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /add language/i }).click();

  let dialog = page.getByRole("dialog", { name: /add language/i });

  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: /close/i }).last().click();

  await expect(dialog).not.toBeVisible();

  // Should still only have French and Spanish in the dropdown
  await page.getByRole("button", { name: /open your languages/i }).click();

  let languageOptions = await page
    .locator('[data-target="language-list"]')
    .getByRole("button")
    .allTextContents();

  expect(languageOptions.map((s) => s.trim())).toEqual(["French", "Spanish"]);
});
