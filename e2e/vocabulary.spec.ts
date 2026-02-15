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

test("adds new vocabulary", async ({ page }) => {
  let table = page.getByRole("table");
  let dialog = page.getByRole("dialog", { name: /add vocabulary/i });

  await page.getByRole("button", { name: /add$/i }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText("Add vocabulary");

  await dialog.getByLabel(/in your language/i).fill("water");
  await dialog.getByLabel(/in the target language/i).fill("agua");
  await dialog.getByRole("button", { name: /^save$/i }).click();

  await expect(dialog).not.toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(12);
  await expect(table.locator("tbody")).toContainText("water");
  await expect(table.locator("tbody")).toContainText("agua");
  await expect(page.getByText(/12 words/)).toBeVisible();
});

test("adds multiple vocabulary entries with 'Save and Add'", async ({
  page,
}) => {
  let table = page.getByRole("table");
  let dialog = page.getByRole("dialog", { name: /add vocabulary/i });

  await page.getByRole("button", { name: /add$/i }).click();

  // First word — click "Save and Add"
  await dialog.getByLabel(/in your language/i).fill("water");
  await dialog.getByLabel(/in the target language/i).fill("agua");
  await dialog.getByRole("button", { name: /save and add/i }).click();

  // Dialog stays open with cleared fields
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/in your language/i)).toHaveValue("");
  await expect(dialog.getByLabel(/in the target language/i)).toHaveValue("");

  // Second word — click "Save"
  await dialog.getByLabel(/in your language/i).fill("fire");
  await dialog.getByLabel(/in the target language/i).fill("fuego");
  await dialog.getByRole("button", { name: /^save$/i }).click();

  await expect(dialog).not.toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(13);
  await expect(table.locator("tbody")).toContainText("water");
  await expect(table.locator("tbody")).toContainText("fire");
});

test("edits existing vocabulary", async ({ page }) => {
  let table = page.getByRole("table");
  let firstRow = table.locator("tbody tr").first();

  await firstRow.getByRole("button", { name: /edit/i }).click();

  let dialog = page.getByRole("dialog", {
    name: /edit vocabulary/i,
  });

  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /save and add/i }),
  ).toBeHidden();

  await dialog.getByLabel(/in your language/i).fill("modified word");
  await dialog.getByRole("button", { name: /^save$/i }).click();

  await expect(dialog).not.toBeVisible();
  await expect(table.locator("tbody")).toContainText("modified word");
  // Row count unchanged — it was an edit, not an addition
  await expect(table.locator("tbody tr")).toHaveCount(11);
});

test("deletes vocabulary after confirmation", async ({ page }) => {
  let table = page.getByRole("table");
  let firstRow = table.locator("tbody tr").first();
  let deletedWord = (
    await firstRow.locator("td").first().locator("span").first().textContent()
  )?.trim();

  page.once("dialog", (dialog) => dialog.accept());

  await firstRow.getByRole("button", { name: /delete/i }).click();

  await expect(table.locator("tbody tr")).toHaveCount(10);
  await expect(table.locator("tbody")).not.toContainText(deletedWord!);
  await expect(page.getByText(/10 words/i)).toBeVisible();
});

test("keeps vocabulary when delete confirmation is dismissed", async ({
  page,
}) => {
  let table = page.getByRole("table");

  page.once("dialog", (dialog) => dialog.dismiss());

  await table
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: /delete/i })
    .click();

  await expect(table.locator("tbody tr")).toHaveCount(11);
});

test("cancels the add dialog without saving", async ({ page }) => {
  let table = page.getByRole("table");
  let dialog = page.getByRole("dialog", { name: /add vocabulary/i });

  await page.getByRole("button", { name: /add$/i }).click();
  await dialog.getByLabel(/in your language/i).fill("should not appear");
  await dialog
    .getByLabel(/in the target language/i)
    .fill("no debería aparecer");
  await dialog.getByRole("button", { name: /close/i }).last().click();

  await expect(dialog).not.toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(11);
  await expect(table.locator("tbody")).not.toContainText("should not appear");
});

test("sorts vocabulary by clicking column headers", async ({ page }) => {
  let table = page.getByRole("table");
  let wordHeader = page.getByRole("columnheader", { name: /^word$/i });

  // Sort by Word ascending
  await wordHeader.click();
  await expect(wordHeader).toHaveClass(/is-active/);
  await expect(wordHeader).toHaveAttribute("data-dir", "ASC");

  // First row alphabetically: "good evening"
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toContainText("good evening");

  // Click again to reverse
  await wordHeader.click();
  await expect(wordHeader).toHaveAttribute("data-dir", "DESC");

  // Last alphabetically is first: "yes"
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toContainText("yes");

  // Switch to a different column — Box
  let boxHeader = page.getByRole("columnheader", { name: /^box$/i });

  await boxHeader.click();
  await expect(boxHeader).toHaveClass(/is-active/);
  await expect(boxHeader).toHaveAttribute("data-dir", "ASC");

  // Word header should no longer be active
  await expect(wordHeader).not.toHaveClass(/is-active/);
});

test("paginates vocabulary", async ({ page }) => {
  let table = page.getByRole("table");

  // Change per-page to 10 so 11 items split into 2 pages
  await page.getByLabel(/per page:/i).selectOption("10");

  await expect(table.locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("#pagination-range")).toHaveText("1");
  await expect(page.locator("#pagination-total")).toHaveText("2");
  await expect(page.getByText(/11 words/)).toBeVisible();

  // Next page
  await expect(page.getByRole("button", { name: /next/i })).toBeEnabled();
  await page.getByRole("button", { name: /next/i }).click();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("#pagination-range")).toHaveText("2");
  await expect(page.getByRole("button", { name: /previous/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /next/i })).toBeDisabled();

  // Back to page 1
  await page.getByRole("button", { name: /previous/i }).click();
  await expect(table.locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("#pagination-range")).toHaveText("1");
  await expect(page.getByRole("button", { name: /previous/i })).toBeDisabled();
});
