import fetcher from "../lib/fetcher.js";
import { normalize, setVisibility } from "../lib/utils.js";

let startTraining = document.querySelector('[data-target="start-training"]');
let dialog = document.querySelector('[data-target="training-dialog"]');

// Training progress indicator
let progress = dialog.querySelector('[data-target="progress-indicator"]');

// Training form
let form = dialog.querySelector('[data-target="training-form"]');
let label = dialog.querySelector('[data-target="label"]');

// Training result
let result = dialog.querySelector('[data-target="training-result"]');
let icon = result.querySelector('[data-target="icon"]');
let feedback = result.querySelector('[data-target="feedback"]');
let next = result.querySelector('[data-target="next"]');
let correctAnswer = result.querySelector('[data-target="correct-answer"]');

// Training complete
let complete = dialog.querySelector('[data-target="training-complete"]');
let summary = complete.querySelector('[data-target="summary"]');

const SUCCESS_MESSAGES = [
  "Correct!",
  "Excellent!",
  "Well done!",
  "You got it!",
  "Great job!",
];
const FAILURE_MESSAGES = [
  "Incorrect",
  "Try again",
  "Not quite",
  "Keep practicing",
  "Keep trying",
];

// State
let trainingQueue = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let currentLanguage = null;

// Callbacks
let onTrainingComplete = null;
let onAnswerSubmitted = null;

export function setCurrentLanguage(language) {
  currentLanguage = language;
}

export function setOnTrainingComplete(callback) {
  onTrainingComplete = callback;
}

export function setOnAnswerSubmitted(callback) {
  onAnswerSubmitted = callback;
}

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function updateProgressIndidcator() {
  let total = trainingQueue.length;
  let percentage = Math.floor((currentIndex * 100) / total);

  let [bar, label] = progress.children;

  bar.max = total;
  bar.value = currentIndex;
  label.textContent = `${percentage}%`;
}

function showTrainingCard() {
  let word = trainingQueue[currentIndex];

  setVisibility(result, false);
  setVisibility(form, true);

  label.textContent = word.front;
  form.elements.answer.value = "";
  form.elements.answer.focus();
}

async function handleSubmit(event) {
  event.preventDefault();

  let word = trainingQueue[currentIndex];
  let isCorrect =
    normalize(form.elements.answer.value) === normalize(word.back);

  if (isCorrect) {
    correctCount++;
    feedback.textContent = getRandomMessage(SUCCESS_MESSAGES);
    icon.classList.add("-green");
    icon.classList.remove("-red");
    icon.firstElementChild.setAttribute("href", "/icons/icon-defs.svg#check");
  } else {
    incorrectCount++;
    feedback.textContent = getRandomMessage(FAILURE_MESSAGES);
    icon.classList.add("-red");
    icon.classList.remove("-green");
    icon.firstElementChild.setAttribute("href", "/icons/icon-defs.svg#cross");
  }

  correctAnswer.textContent = word.back;
  currentIndex++;

  updateProgressIndidcator();
  setVisibility(result, true);
  setVisibility(form, false);

  next.focus();

  try {
    let updated = await fetcher.post(`/api/training/${word.id}`, {
      correct: isCorrect,
    });

    if (onAnswerSubmitted) {
      onAnswerSubmitted(word.id, updated.box, updated.next_review);
    }
  } catch (error) {
    console.error("Failed to update vocabulary:", error);
  }
}

function handleNextCard() {
  if (currentIndex < trainingQueue.length) {
    showTrainingCard();
  } else {
    setVisibility(result, false);
    setVisibility(complete, true);

    summary.textContent = `You got ${correctCount} out of ${trainingQueue.length} correct.`;
  }
}

async function handleStartTraining(event) {
  if (event.newState === "closed") {
    return;
  }

  if (!currentLanguage) {
    console.error("No language selected");
    return;
  }

  try {
    let params = new URLSearchParams({ languageId: currentLanguage.id });

    trainingQueue = await fetcher.get(`/api/training?${params}`);
    currentIndex = 0;
    correctCount = 0;
    incorrectCount = 0;

    updateProgressIndidcator();
    showTrainingCard();

    dialog.showModal();
  } catch (error) {
    console.error("Failed to start training:", error);
  }
}

function handleClose() {
  dialog.close();

  if (onTrainingComplete) {
    onTrainingComplete();
  }
}

export async function updateTrainingButton() {
  if (!currentLanguage) {
    startTraining.textContent = "No language selected";
    startTraining.disabled = true;
    return;
  }

  try {
    let params = new URLSearchParams({ languageId: currentLanguage.id });
    let scheduled = await fetcher.get(`/api/training?${params}`);
    let count = scheduled.length;

    if (count === 0) {
      startTraining.textContent = "Nothing to repeat today";
      startTraining.disabled = true;
    } else {
      startTraining.textContent = `Start Training (${count})`;
      startTraining.disabled = false;
    }
  } catch (error) {
    console.error("Failed to fetch training count:", error);
    startTraining.textContent = "Start Training";
    startTraining.disabled = false;
  }
}

export function init() {
  form.addEventListener("submit", handleSubmit);
  next.addEventListener("click", handleNextCard);
  dialog.addEventListener("close", handleClose);
  dialog.addEventListener("toggle", handleStartTraining);
}
