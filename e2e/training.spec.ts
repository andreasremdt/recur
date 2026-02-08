import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { login } from "./helpers";

// Lookup table: English prompt → Spanish answer (for the 7 due items)
const ANSWERS: Record<string, string> = {
  hello: "hola",
  goodbye: "adiós",
  "thank you": "gracias",
  please: "por favor",
  "good evening": "buenas tardes",
  "how are you": "¿cómo estás?",
  yes: "sí",
};

test.beforeEach(async ({ page }) => {
  execSync("bun run src/seed.ts", {
    env: { ...process.env, DB_PATH: "test.db" },
  });

  await login(page);
  await expect(page.locator('[data-target="word-count"]')).not.toBeEmpty();
});

test("shows correct count of due items on the training button", async ({
  page,
}) => {
  // French is auto-selected — has no vocabulary at all
  await expect(page.locator('[data-action="start-training"]')).toHaveText(
    "Nothing to repeat today",
  );
  await expect(page.locator('[data-action="start-training"]')).toBeDisabled();

  // Switch to Spanish — 7 items are due (overdue + due today)
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator('[data-action="start-training"]')).toHaveText(
    "Start Training (7)",
  );
  await expect(page.locator('[data-action="start-training"]')).toBeEnabled();
});

test("answers a question correctly and shows positive feedback", async ({
  page,
}) => {
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator('[data-action="start-training"]')).toBeEnabled();

  // Start training
  await page.click('[data-action="start-training"]');
  await expect(page.locator('[data-target="training-dialog"]')).toBeVisible();

  // Read the prompt and provide the correct answer
  const prompt = await page.locator('[data-target="label"]').textContent();
  const correctAnswer = ANSWERS[prompt!.trim()];

  await page.fill('input[id="answer"]', correctAnswer!);
  await page.click('[data-testid="check-button"]');

  // Should show positive feedback
  await expect(page.locator('[data-target="training-result"]')).toBeVisible();
  await expect(page.locator('[data-target="icon"]')).toHaveClass(/-green/);
  await expect(page.locator('[data-target="training-form"]')).toBeHidden();
});

test("answers a question incorrectly and shows the correct answer", async ({
  page,
}) => {
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator('[data-action="start-training"]')).toBeEnabled();

  await page.click('[data-action="start-training"]');
  await expect(page.locator('[data-target="training-dialog"]')).toBeVisible();

  // Read the prompt so we know what the correct answer should be
  const prompt = await page.locator('[data-target="label"]').textContent();
  const correctAnswer = ANSWERS[prompt!.trim()];

  // Provide a wrong answer
  await page.fill('input[id="answer"]', "deliberately wrong");
  await page.click('[data-testid="check-button"]');

  // Should show negative feedback with the correct answer
  await expect(page.locator('[data-target="training-result"]')).toBeVisible();
  await expect(page.locator('[data-target="icon"]')).toHaveClass(/-red/);
  await expect(page.locator('[data-target="correct-answer"]')).toHaveText(
    correctAnswer!,
  );
  await expect(page.locator('[data-target="training-form"]')).toBeHidden();
});

test("completes a full training session and shows summary", async ({
  page,
}) => {
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator('[data-action="start-training"]')).toHaveText(
    "Start Training (7)",
  );

  await page.click('[data-action="start-training"]');
  await expect(page.locator('[data-target="training-dialog"]')).toBeVisible();

  // Answer all 7 questions — first one wrong, rest correct
  for (let i = 0; i < 7; i++) {
    const prompt = await page.locator('[data-target="label"]').textContent();
    const correctAnswer = ANSWERS[prompt!.trim()];

    if (i === 0) {
      await page.fill('input[id="answer"]', "deliberately wrong");
    } else {
      await page.fill('input[id="answer"]', correctAnswer!);
    }

    await page.click('[data-testid="check-button"]');
    await expect(page.locator('[data-target="training-result"]')).toBeVisible();

    await page.click('[data-target="next"]');
  }

  // Completion screen should appear
  await expect(page.locator('[data-target="training-complete"]')).toBeVisible();
  await expect(page.locator('[data-target="summary"]')).toContainText(
    "6 out of 7",
  );

  // Close training
  await page.click('[data-target="close"]');
  await expect(
    page.locator('[data-target="training-dialog"]'),
  ).not.toBeVisible();
});

test("updates the training button after completing a session", async ({
  page,
}) => {
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await expect(page.locator('[data-action="start-training"]')).toHaveText(
    "Start Training (7)",
  );

  // Complete all training with correct answers
  await page.click('[data-action="start-training"]');
  await expect(page.locator('[data-target="training-dialog"]')).toBeVisible();

  for (let i = 0; i < 7; i++) {
    const prompt = await page.locator('[data-target="label"]').textContent();
    const correctAnswer = ANSWERS[prompt!.trim()];

    await page.fill('input[id="answer"]', correctAnswer!);
    await page.click('[data-testid="check-button"]');
    await expect(page.locator('[data-target="training-result"]')).toBeVisible();
    await page.click('[data-target="next"]');
  }

  await page.click('[data-target="close"]');

  // After completing all training, button should show "Nothing to repeat today"
  await expect(page.locator('[data-action="start-training"]')).toHaveText(
    "Nothing to repeat today",
  );
  await expect(page.locator('[data-action="start-training"]')).toBeDisabled();
});

test("shows progress during training", async ({ page }) => {
  await page.selectOption("#language-dropdown", { label: "Spanish" });
  await page.click('[data-action="start-training"]');
  await expect(page.locator('[data-target="training-dialog"]')).toBeVisible();

  // Progress should start at 0%
  const progressBar = page.locator("progress");
  await expect(progressBar).toHaveAttribute("max", "7");
  await expect(progressBar).toHaveAttribute("value", "0");

  // Answer first question
  const prompt = await page.locator('[data-target="label"]').textContent();
  await page.fill('input[id="answer"]', ANSWERS[prompt!.trim()]!);
  await page.click('[data-testid="check-button"]');

  // Progress should update after answering
  await expect(progressBar).toHaveAttribute("value", "1");

  // Move to next question
  await page.click('[data-target="next"]');

  // Answer second question
  const prompt2 = await page.locator('[data-target="label"]').textContent();
  await page.fill('input[id="answer"]', ANSWERS[prompt2!.trim()]!);
  await page.click('[data-testid="check-button"]');

  await expect(progressBar).toHaveAttribute("value", "2");
});
