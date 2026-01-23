import fetcher from "./fetcher.js";

const tbody = document.querySelector("#vocabulary-table tbody");
const dialog = document.querySelector("#vocabulary-dialog");
const form = document.querySelector("#vocabulary-form");
const dialogTitle = document.querySelector("#dialog-title");
const addBtn = document.querySelector("#add-vocabulary-btn");
const cancelBtn = document.querySelector("#dialog-cancel-btn");

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
  } else {
    dialogTitle.textContent = "Edit Vocabulary";
    form.elements.id.value = row.dataset.id;
    form.elements.front.value = row.dataset.front;
    form.elements.back.value = row.dataset.back;
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

loadVocabulary();
