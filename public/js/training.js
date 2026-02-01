import fetcher from "./fetcher.js";

// Elements
const trainingDialog = document.querySelector("#training-dialog");
const trainingContent = document.querySelector("#training-content");
const trainingComplete = document.querySelector("#training-complete");
const trainingEmpty = document.querySelector("#training-empty");
const trainingProgress = document.querySelector("#training-progress");
const trainingFront = document.querySelector("#training-front");
const trainingForm = document.querySelector("#training-form");
const trainingAnswer = document.querySelector("#training-answer");
const trainingResult = document.querySelector("#training-result");
const trainingFeedback = document.querySelector("#training-feedback");
const trainingCorrectAnswer = document.querySelector("#training-correct-answer");
const trainingNextBtn = document.querySelector("#training-next-btn");
const trainingSummary = document.querySelector("#training-summary");
const startTrainingBtn = document.querySelector("#start-training-btn");
const closeTrainingBtn = document.querySelector("#training-close-btn");
const emptyCloseBtn = document.querySelector("#training-empty-close-btn");

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

function normalizeAnswer(str) {
  return str.trim().toLowerCase();
}

function showTrainingCard() {
  const word = trainingQueue[currentIndex];
  trainingProgress.textContent = `Card ${currentIndex + 1} of ${trainingQueue.length} (Box ${word.box})`;
  trainingFront.textContent = word.front;
  trainingAnswer.value = "";
  trainingForm.hidden = false;
  trainingResult.hidden = true;
  trainingAnswer.focus();
}

async function checkAnswer(userAnswer) {
  const word = trainingQueue[currentIndex];
  const correct = normalizeAnswer(userAnswer) === normalizeAnswer(word.back);

  if (correct) {
    correctCount++;
    trainingFeedback.textContent = "Correct!";
    trainingFeedback.className = "feedback-correct";
  } else {
    incorrectCount++;
    trainingFeedback.textContent = "Incorrect";
    trainingFeedback.className = "feedback-incorrect";
  }

  trainingCorrectAnswer.textContent = word.back;
  trainingForm.hidden = true;
  trainingResult.hidden = false;

  try {
    const updated = await fetcher.post(`/api/training/${word.id}`, { correct });

    if (onAnswerSubmitted) {
      onAnswerSubmitted(word.id, updated.box, updated.next_review);
    }
  } catch (error) {
    console.error("Failed to update vocabulary:", error);
  }
}

function nextCard() {
  currentIndex++;

  if (currentIndex < trainingQueue.length) {
    showTrainingCard();
  } else {
    trainingContent.hidden = true;
    trainingComplete.hidden = false;
    trainingSummary.textContent = `You got ${correctCount} out of ${trainingQueue.length} correct.`;
  }
}

async function startTraining() {
  if (!currentLanguage) {
    console.error("No language selected");
    return;
  }

  try {
    const params = new URLSearchParams({ languageId: currentLanguage.id });
    trainingQueue = await fetcher.get(`/api/training?${params}`);
    currentIndex = 0;
    correctCount = 0;
    incorrectCount = 0;

    trainingContent.hidden = false;
    trainingComplete.hidden = true;
    trainingEmpty.hidden = true;

    if (trainingQueue.length === 0) {
      trainingContent.hidden = true;
      trainingEmpty.hidden = false;
    } else {
      showTrainingCard();
    }

    trainingDialog.showModal();
  } catch (error) {
    console.error("Failed to start training:", error);
  }
}

function closeTrainingDialog() {
  trainingDialog.close();
  if (onTrainingComplete) {
    onTrainingComplete();
  }
}

export async function updateTrainingButton() {
  if (!currentLanguage) {
    startTrainingBtn.textContent = "No language selected";
    startTrainingBtn.disabled = true;
    return;
  }

  try {
    const params = new URLSearchParams({ languageId: currentLanguage.id });
    const scheduled = await fetcher.get(`/api/training?${params}`);
    const count = scheduled.length;

    if (count === 0) {
      startTrainingBtn.textContent = "Nothing to repeat today";
      startTrainingBtn.disabled = true;
    } else {
      startTrainingBtn.textContent = `Start Training (${count})`;
      startTrainingBtn.disabled = false;
    }
  } catch (error) {
    console.error("Failed to fetch training count:", error);
    startTrainingBtn.textContent = "Start Training";
    startTrainingBtn.disabled = false;
  }
}

export function init() {
  startTrainingBtn.addEventListener("click", startTraining);

  trainingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    checkAnswer(trainingAnswer.value);
  });

  trainingNextBtn.addEventListener("click", nextCard);
  closeTrainingBtn.addEventListener("click", closeTrainingDialog);
  emptyCloseBtn.addEventListener("click", closeTrainingDialog);

  trainingDialog.addEventListener("click", (event) => {
    if (event.target === trainingDialog) {
      closeTrainingDialog();
    }
  });

  // Note: updateTrainingButton will be called by the language switcher when a language is selected
}
