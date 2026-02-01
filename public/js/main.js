import fetcher from "./fetcher.js";

// Vocabulary table elements
const tbody = document.querySelector("#vocabulary-table tbody");
const dialog = document.querySelector("#vocabulary-dialog");
const form = document.querySelector("#vocabulary-form");
const dialogTitle = document.querySelector("#dialog-title");
const addBtn = document.querySelector("#add-vocabulary-btn");
const cancelBtn = document.querySelector("#dialog-cancel-btn");
const saveAddBtn = document.querySelector("#dialog-save-add-btn");

// Training elements
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
const trainingCorrectAnswer = document.querySelector(
  "#training-correct-answer",
);
const trainingNextBtn = document.querySelector("#training-next-btn");
const trainingSummary = document.querySelector("#training-summary");
const startTrainingBtn = document.querySelector("#start-training-btn");
const closeTrainingBtn = document.querySelector("#training-close-btn");
const emptyCloseBtn = document.querySelector("#training-empty-close-btn");

// Training state
let trainingQueue = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectCount = 0;

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function formatRelativeDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return relativeTimeFormatter.format(diffDays, "day");
}

function createRow(word) {
  const row = document.createElement("tr");
  row.dataset.id = word.id;
  row.dataset.front = word.front;
  row.dataset.back = word.back;
  row.dataset.box = word.box;
  row.dataset.nextReview = word.next_review;
  row.innerHTML = `
    <td>
      <span class="word-front">${word.front}</span>
      <span class="word-back">${word.back}</span>
    </td>
    <td>${word.box}</td>
    <td>${formatRelativeDate(word.next_review)}</td>
    <td>
      <div class="actions">
        <button type="button" class="edit-btn" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 20H21M3.00003 20H4.67457C5.16376 20 5.40835 20 5.63852 19.9447C5.84259 19.8957 6.03768 19.8149 6.21663 19.7053C6.41846 19.5816 6.59141 19.4086 6.93732 19.0627L19.5001 6.49998C20.3285 5.67156 20.3285 4.32841 19.5001 3.49998C18.6716 2.67156 17.3285 2.67156 16.5001 3.49998L3.93729 16.0627C3.59139 16.4086 3.41843 16.5816 3.29475 16.7834C3.18509 16.9624 3.10428 17.1574 3.05529 17.3615C3.00003 17.5917 3.00003 17.8363 3.00003 18.3255V20Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button type="button" class="delete-btn" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 6V5.2C16 4.0799 16 3.51984 15.782 3.09202C15.5903 2.71569 15.2843 2.40973 14.908 2.21799C14.4802 2 13.9201 2 12.8 2H11.2C10.0799 2 9.51984 2 9.09202 2.21799C8.71569 2.40973 8.40973 2.71569 8.21799 3.09202C8 3.51984 8 4.0799 8 5.2V6M10 11.5V16.5M14 11.5V16.5M3 6H21M19 6V17.2C19 18.8802 19 19.7202 18.673 20.362C18.3854 20.9265 17.9265 21.3854 17.362 21.673C16.7202 22 15.8802 22 14.2 22H9.8C8.11984 22 7.27976 22 6.63803 21.673C6.07354 21.3854 5.6146 20.9265 5.32698 20.362C5 19.7202 5 18.8802 5 17.2V6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </td>
  `;
  return row;
}

function renderVocabulary(vocabulary) {
  tbody.innerHTML = "";

  for (const word of vocabulary) {
    tbody.appendChild(createRow(word));
  }
}

function updateRowContent(row, word) {
  row.dataset.front = word.front;
  row.dataset.back = word.back;
  row.children[0].textContent = word.front;
  row.children[1].textContent = word.back;
}

function openDialog(mode, row = null) {
  form.reset();

  if (mode === "create") {
    dialogTitle.textContent = "Add Vocabulary";
    form.elements.id.value = "";
    saveAddBtn.hidden = false;
  } else {
    dialogTitle.textContent = "Edit Vocabulary";
    form.elements.id.value = row.dataset.id;
    form.elements.front.value = row.dataset.front;
    form.elements.back.value = row.dataset.back;
    saveAddBtn.hidden = true;
  }

  dialog.showModal();
}

async function loadVocabulary() {
  try {
    const vocabulary = await fetcher.get("/api/vocabulary");
    renderVocabulary(vocabulary);
  } catch (error) {
    console.error("Failed to load vocabulary:", error);
  }
}

async function handleCreate(front, back) {
  // Optimistically add to table
  const tempId = crypto.randomUUID();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const optimisticWord = {
    id: tempId,
    front,
    back,
    box: 1,
    next_review: tomorrow.toISOString().slice(0, 10),
  };
  const row = createRow(optimisticWord);
  row.classList.add("pending");
  // Prepend to table (sorted by next_review ASC, so newest goes first)
  tbody.prepend(row);

  try {
    const savedWord = await fetcher.post("/api/vocabulary", { front, back });
    row.dataset.id = savedWord.id;
    row.classList.remove("pending");
  } catch (error) {
    console.error("Failed to add vocabulary:", error);
    row.remove();
  }
}

async function handleUpdate(id, front, back) {
  const row = tbody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const previousData = { front: row.dataset.front, back: row.dataset.back };

  // Optimistically update
  updateRowContent(row, { front, back });
  row.classList.add("pending");

  try {
    const savedWord = await fetcher.patch(`/api/vocabulary/${id}`, {
      front,
      back,
    });
    updateRowContent(row, savedWord);
    row.classList.remove("pending");
  } catch (error) {
    console.error("Failed to update vocabulary:", error);
    updateRowContent(row, previousData);
    row.classList.remove("pending");
  }
}

async function handleDelete(row) {
  const id = row.dataset.id;

  if (!confirm(`Delete "${row.dataset.front}"?`)) return;

  // Optimistically remove
  row.classList.add("pending");
  row.style.display = "none";

  try {
    await fetcher.delete(`/api/vocabulary/${id}`);
    row.remove();
  } catch (error) {
    console.error("Failed to delete vocabulary:", error);
    row.style.display = "";
    row.classList.remove("pending");
  }
}

// Open dialog for creating
addBtn.addEventListener("click", () => openDialog("create"));

// Cancel button closes dialog
cancelBtn.addEventListener("click", () => dialog.close());

// Save and Add button - saves but keeps dialog open
saveAddBtn.addEventListener("click", () => {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  const front = formData.get("front");
  const back = formData.get("back");

  handleCreate(front, back);
  form.reset();
  form.elements.front.focus();
});

// Close dialog on backdrop click
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

// Handle form submission
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const id = formData.get("id");
  const front = formData.get("front");
  const back = formData.get("back");

  dialog.close();

  if (id) {
    handleUpdate(id, front, back);
  } else {
    handleCreate(front, back);
  }
});

// Handle table button clicks
tbody.addEventListener("click", (event) => {
  const target = event.target;
  const row = target.closest("tr");

  if (!row) return;

  if (target.classList.contains("edit-btn")) {
    openDialog("edit", row);
  } else if (target.classList.contains("delete-btn")) {
    handleDelete(row);
  }
});

// Training functions
async function updateTrainingButton() {
  try {
    const scheduled = await fetcher.get("/api/training");
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

function showTrainingCard() {
  const word = trainingQueue[currentIndex];
  trainingProgress.textContent = `Card ${currentIndex + 1} of ${trainingQueue.length} (Box ${word.box})`;
  trainingFront.textContent = word.front;
  trainingAnswer.value = "";
  trainingForm.hidden = false;
  trainingResult.hidden = true;
  trainingAnswer.focus();
}

function normalizeAnswer(str) {
  return str.trim().toLowerCase();
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

    // Update the table row if it exists
    const row = tbody.querySelector(`tr[data-id="${word.id}"]`);
    if (row) {
      row.children[1].textContent = updated.box;
      row.children[2].textContent = formatRelativeDate(updated.next_review);
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
  try {
    trainingQueue = await fetcher.get("/api/training");
    currentIndex = 0;
    correctCount = 0;
    incorrectCount = 0;

    // Reset dialog state
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
  updateTrainingButton();
  // Reload vocabulary to update sorting after box changes
  loadVocabulary();
}

// Training event listeners
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

loadVocabulary();
updateTrainingButton();
