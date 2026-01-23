import fetcher from "./fetcher.js";

const tbody = document.querySelector("#vocabulary-table tbody");
const form = document.querySelector("#add-vocabulary-form");

function createRow(word) {
  const row = document.createElement("tr");
  row.dataset.id = word.id;
  row.innerHTML = `
    <td>${word.front}</td>
    <td>${word.back}</td>
    <td>${word.box}</td>
    <td>${word.next_review}</td>
  `;
  return row;
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const front = formData.get("front");
  const back = formData.get("back");

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

  // Clear form
  form.reset();
  form.firstElementChild.focus();

  try {
    const savedWord = await fetcher.post("/api/vocabulary", { front, back });

    // Update row with real data
    row.dataset.id = savedWord.id;
    row.classList.remove("pending");
  } catch (error) {
    console.error("Failed to add vocabulary:", error);
    // Remove optimistic row on failure
    row.remove();
  }
});

loadVocabulary();
