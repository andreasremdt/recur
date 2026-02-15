import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { login } from "./helpers";

// Lookup table: English prompt → Spanish answer (for the 7 due items)
let ANSWERS: Record<string, string> = {
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
  await expect(page.getByText(/\d+ words/)).toBeVisible();
});

test("shows correct count of due items on the training button", async ({
  page,
}) => {
  let trainingButton = page.getByRole("button", {
    name: /start training|nothing to repeat today/i,
  });

  // French is auto-selected — has no vocabulary at all
  await expect(trainingButton).toHaveText(/nothing to repeat today/i);
  await expect(trainingButton).toBeDisabled();

  // Switch to Spanish — 7 items are due (overdue + due today)
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();
  await expect(trainingButton).toHaveText(/start training \(7\)/i);
  await expect(trainingButton).toBeEnabled();
});

test("answers a question correctly and shows positive feedback", async ({
  page,
}) => {
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();

  await expect(
    page.getByRole("button", {
      name: /start training|nothing to repeat today/i,
    }),
  ).toBeEnabled();

  let dialog = page.getByRole("dialog", { name: /training/i });

  await page.getByRole("button", { name: /start training/i }).click();

  await expect(dialog).toBeVisible();

  // Read the prompt and provide the correct answer
  let prompt = await dialog.locator('[data-target="label"]').textContent();
  let correctAnswer = ANSWERS[prompt!.trim()];

  await dialog.getByPlaceholder(/type your answer/i).fill(correctAnswer!);
  await dialog.getByRole("button", { name: /check/i }).click();

  await expect(dialog.locator('[data-target="training-result"]')).toBeVisible();
  await expect(dialog.locator('[data-target="icon"]')).toHaveClass(/-green/);
  await expect(dialog.locator('[data-target="training-form"]')).toBeHidden();
});

test("answers a question incorrectly and shows the correct answer", async ({
  page,
}) => {
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();
  await expect(
    page.getByRole("button", {
      name: /start training|nothing to repeat today/i,
    }),
  ).toBeEnabled();

  let dialog = page.getByRole("dialog", { name: /training/i });

  await page.getByRole("button", { name: /start training/i }).click();

  await expect(dialog).toBeVisible();

  let prompt = await dialog.locator('[data-target="label"]').textContent();
  let correctAnswer = ANSWERS[prompt!.trim()];

  await dialog.getByPlaceholder(/type your answer/i).fill("deliberately wrong");
  await dialog.getByRole("button", { name: /check/i }).click();

  await expect(dialog.locator('[data-target="training-result"]')).toBeVisible();
  await expect(dialog.locator('[data-target="icon"]')).toHaveClass(/-red/);
  await expect(dialog.locator('[data-target="correct-answer"]')).toHaveText(
    correctAnswer!,
  );
  await expect(dialog.locator('[data-target="training-form"]')).toBeHidden();
});

test("completes a full training session and shows summary", async ({
  page,
}) => {
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();
  await expect(
    page.getByRole("button", { name: /start training/i }),
  ).toHaveText(/start training \(7\)/i);

  let dialog = page.getByRole("dialog", { name: /training/i });
  await page.getByRole("button", { name: /start training/i }).click();
  await expect(dialog).toBeVisible();

  let answerInput = dialog.getByPlaceholder(/type your answer/i);

  // Answer all 7 questions — first one wrong, rest correct
  for (let i = 0; i < 7; i++) {
    let prompt = await dialog.locator('[data-target="label"]').textContent();
    let correctAnswer = ANSWERS[prompt!.trim()];

    if (i === 0) {
      await answerInput.fill("deliberately wrong");
    } else {
      await answerInput.fill(correctAnswer!);
    }

    await dialog.getByRole("button", { name: /check/i }).click();
    await expect(
      dialog.locator('[data-target="training-result"]'),
    ).toBeVisible();

    await dialog.getByRole("button", { name: /next/i }).click();
  }

  await expect(
    dialog.locator('[data-target="training-complete"]'),
  ).toBeVisible();
  await expect(dialog.locator('[data-target="summary"]')).toContainText(
    "6 out of 7",
  );

  await dialog.getByRole("button", { name: /close/i }).last().click();
  await expect(dialog).not.toBeVisible();
});

test("updates the training button after completing a session", async ({
  page,
}) => {
  let trainingButton = page.getByRole("button", {
    name: /start training|nothing to repeat today/i,
  });

  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();

  await expect(trainingButton).toHaveText(/start training \(7\)/i);

  let dialog = page.getByRole("dialog", { name: /training/i });

  await page.getByRole("button", { name: /start training/i }).click();

  await expect(dialog).toBeVisible();

  let input = dialog.getByPlaceholder(/type your answer/i);

  for (let i = 0; i < 7; i++) {
    let prompt = await dialog.locator('[data-target="label"]').textContent();
    let correctAnswer = ANSWERS[prompt!.trim()];

    await input.fill(correctAnswer!);
    await dialog.getByRole("button", { name: /check/i }).click();

    await expect(
      dialog.locator('[data-target="training-result"]'),
    ).toBeVisible();
    await dialog.getByRole("button", { name: /next/i }).click();
  }

  await dialog.getByRole("button", { name: /close/i }).last().click();

  await expect(trainingButton).toHaveText(/nothing to repeat today/i);
  await expect(trainingButton).toBeDisabled();
});

test("shows progress during training", async ({ page }) => {
  await page.getByRole("button", { name: /open your languages/i }).click();
  await page.getByRole("button", { name: /spanish/i }).click();
  await page.getByRole("button", { name: /start training/i }).click();

  let dialog = page.getByRole("dialog", { name: /training/i });

  await expect(dialog).toBeVisible();

  let progressbar = dialog.getByRole("progressbar");

  await expect(progressbar).toHaveAttribute("max", "7");
  await expect(progressbar).toHaveAttribute("value", "0");

  let input = dialog.getByPlaceholder(/type your answer/i);
  let prompt = await dialog.locator('[data-target="label"]').textContent();

  await input.fill(ANSWERS[prompt!.trim()]!);
  await dialog.getByRole("button", { name: /check/i }).click();

  await expect(progressbar).toHaveAttribute("value", "1");

  await dialog.getByRole("button", { name: /next/i }).click();

  prompt = await dialog.locator('[data-target="label"]').textContent();

  await input.fill(ANSWERS[prompt!.trim()]!);
  await dialog.getByRole("button", { name: /check/i }).click();

  await expect(progressbar).toHaveAttribute("value", "2");
});
