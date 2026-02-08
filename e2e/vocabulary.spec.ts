import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  execSync("bun run src/seed.ts", {
    env: { ...process.env, DB_PATH: "test.db" },
  });

  await login(page);

  // Wait for the app to fully initialize, then switch to Spanish
  await expect(page.locator('[data-target="word-count"]')).not.toBeEmpty();
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(11);
});

test("adds new vocabulary", async ({ page }) => {
  await page.click('[data-action="add"]');
  await expect(page.locator('[data-target="vocabulary-dialog"]')).toBeVisible();
  await expect(page.locator('[data-target="title"]')).toHaveText(
    "Add vocabulary",
  );

  await page.fill("#front", "water");
  await page.fill("#back", "agua");
  await page.click('[data-testid="save-button"]');

  await expect(
    page.locator('[data-target="vocabulary-dialog"]'),
  ).not.toBeVisible();
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(12);
  await expect(page.locator("#vocabulary-table tbody")).toContainText("water");
  await expect(page.locator("#vocabulary-table tbody")).toContainText("agua");
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "12 words",
  );
});

test("adds multiple vocabulary entries with 'Save and Add'", async ({
  page,
}) => {
  await page.click('[data-action="add"]');

  // First word — click "Save and Add"
  await page.fill("#front", "water");
  await page.fill("#back", "agua");
  await page.click('[data-action="save-and-add"]');

  // Dialog stays open with cleared fields
  await expect(page.locator('[data-target="vocabulary-dialog"]')).toBeVisible();
  await expect(page.locator("#front")).toHaveValue("");
  await expect(page.locator("#back")).toHaveValue("");

  // Second word — click "Save"
  await page.fill("#front", "fire");
  await page.fill("#back", "fuego");
  await page.click('[data-testid="save-button"]');

  await expect(
    page.locator('[data-target="vocabulary-dialog"]'),
  ).not.toBeVisible();
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(13);
  await expect(page.locator("#vocabulary-table tbody")).toContainText("water");
  await expect(page.locator("#vocabulary-table tbody")).toContainText("fire");
});

test("edits existing vocabulary", async ({ page }) => {
  const firstRow = page.locator("#vocabulary-table tbody tr").first();

  await firstRow.locator(".edit-btn").click();

  await expect(page.locator('[data-target="vocabulary-dialog"]')).toBeVisible();
  await expect(page.locator('[data-target="title"]')).toHaveText(
    "Edit vocabulary",
  );
  await expect(page.locator('[data-action="save-and-add"]')).toBeHidden();

  await page.fill("#front", "modified word");
  await page.click('[data-testid="save-button"]');

  await expect(
    page.locator('[data-target="vocabulary-dialog"]'),
  ).not.toBeVisible();
  await expect(page.locator("#vocabulary-table tbody")).toContainText(
    "modified word",
  );
  // Row count unchanged — it was an edit, not an addition
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(11);
});

test("deletes vocabulary after confirmation", async ({ page }) => {
  const firstRow = page.locator("#vocabulary-table tbody tr").first();
  const deletedWord = await firstRow.locator(".word-front").textContent();

  page.once("dialog", (dialog) => dialog.accept());
  await firstRow.locator(".delete-btn").click();

  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(10);
  await expect(page.locator("#vocabulary-table tbody")).not.toContainText(
    deletedWord!,
  );
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "10 words",
  );
});

test("keeps vocabulary when delete confirmation is dismissed", async ({
  page,
}) => {
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .locator("#vocabulary-table tbody tr")
    .first()
    .locator(".delete-btn")
    .click();

  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(11);
});

test("cancels the add dialog without saving", async ({ page }) => {
  await page.click('[data-action="add"]');
  await page.fill("#front", "should not appear");
  await page.fill("#back", "no debería aparecer");
  await page.click('[data-testid="cancel-button"]');

  await expect(
    page.locator('[data-target="vocabulary-dialog"]'),
  ).not.toBeVisible();
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(11);
  await expect(page.locator("#vocabulary-table tbody")).not.toContainText(
    "should not appear",
  );
});

test("sorts vocabulary by clicking column headers", async ({ page }) => {
  const wordHeader = page.locator('th[data-sort="front"]');

  // Sort by Word ascending
  await wordHeader.click();
  await expect(wordHeader).toHaveClass(/is-active/);
  await expect(wordHeader).toHaveAttribute("data-dir", "ASC");

  // First row alphabetically: "good evening"
  await expect(
    page.locator("#vocabulary-table tbody tr").first().locator(".word-front"),
  ).toHaveText("good evening");

  // Click again to reverse
  await wordHeader.click();
  await expect(wordHeader).toHaveAttribute("data-dir", "DESC");

  // Last alphabetically is first: "yes"
  await expect(
    page.locator("#vocabulary-table tbody tr").first().locator(".word-front"),
  ).toHaveText("yes");

  // Switch to a different column — Box
  const boxHeader = page.locator('th[data-sort="box"]');
  await boxHeader.click();
  await expect(boxHeader).toHaveClass(/is-active/);
  await expect(boxHeader).toHaveAttribute("data-dir", "ASC");
  // Word header should no longer be active
  await expect(wordHeader).not.toHaveClass(/is-active/);
});

test("paginates vocabulary", async ({ page }) => {
  // Change per-page to 10 so 11 items split into 2 pages
  await page.selectOption("#pagination-limit", "10");

  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(10);
  await expect(page.locator("#pagination-range")).toHaveText("1");
  await expect(page.locator("#pagination-total")).toHaveText("2");
  // Total word count always shows the full number
  await expect(page.locator('[data-target="word-count"]')).toHaveText(
    "11 words",
  );

  // Next page
  await expect(page.locator("#pagination-next")).toBeEnabled();
  await page.click("#pagination-next");
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(1);
  await expect(page.locator("#pagination-range")).toHaveText("2");
  await expect(page.locator("#pagination-prev")).toBeEnabled();
  await expect(page.locator("#pagination-next")).toBeDisabled();

  // Back to page 1
  await page.click("#pagination-prev");
  await expect(page.locator("#vocabulary-table tbody tr")).toHaveCount(10);
  await expect(page.locator("#pagination-range")).toHaveText("1");
  await expect(page.locator("#pagination-prev")).toBeDisabled();
});
