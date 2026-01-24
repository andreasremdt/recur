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
const trainingCorrectAnswer = document.querySelector("#training-correct-answer");
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

function createRow(word) {
  const row = document.createElement("tr");
  row.dataset.id = word.id;
  row.dataset.front = word.front;
  row.dataset.back = word.back;
  row.innerHTML = `
    <td>${word.front}</td>
    <td>${word.back}</td>
    <td>${word.box}</td>
    <td>${word.next_review}</td>
    <td>
      <button type="button" class="edit-btn">Edit</button>
      <button type="button" class="delete-btn">Delete</button>
    </td>
  `;
  return row;
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

    for (const word of vocabulary) {
      tbody.appendChild(createRow(word));
    }
  } catch (error) {
    console.error("Failed to load vocabulary:", error);
  }
}

async function handleCreate(front, back) {
  // Optimistically add to table
  const tempId = crypto.randomUUID();
  const optimisticWord = {
    id: tempId,
    front,
    back,
    box: 1,
    next_review: new Date().toISOString().slice(0, 10),
  };
  const row = createRow(optimisticWord);
  row.classList.add("pending");
  tbody.appendChild(row);

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
    const savedWord = await fetcher.patch(`/api/vocabulary/${id}`, { front, back });
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
      row.children[2].textContent = updated.box;
      row.children[3].textContent = updated.next_review;
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
