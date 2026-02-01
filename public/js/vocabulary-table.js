import fetcher from "./fetcher.js";
import { formatRelativeDate } from "./utils.js";
import { loadSort, saveSort, loadPagination, savePagination } from "./storage.js";

// Elements
const table = document.querySelector("#vocabulary-table");
const thead = table.querySelector("thead");
const tbody = table.querySelector("tbody");
const paginationRange = document.querySelector("#pagination-range");
const paginationTotal = document.querySelector("#pagination-total");
const paginationLimit = document.querySelector("#pagination-limit");
const paginationPrev = document.querySelector("#pagination-prev");
const paginationNext = document.querySelector("#pagination-next");

// State
let currentSort = loadSort();
let currentPagination = loadPagination();
let totalItems = 0;

// Callbacks
let onEditClick = null;

export function setOnEditClick(callback) {
  onEditClick = callback;
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

function updatePaginationControls() {
  const totalPages = Math.ceil(totalItems / currentPagination.limit);
  const start = (currentPagination.page - 1) * currentPagination.limit + 1;
  const end = Math.min(currentPagination.page * currentPagination.limit, totalItems);

  paginationRange.textContent = totalItems > 0 ? `${start}-${end}` : "0";
  paginationTotal.textContent = totalItems.toString();

  paginationPrev.disabled = currentPagination.page <= 1;
  paginationNext.disabled = currentPagination.page >= totalPages;

  paginationLimit.value = currentPagination.limit.toString();
}

function updateSortHeaders() {
  thead.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("is-active");
    delete th.dataset.dir;
  });

  const activeHeader = thead.querySelector(`th[data-sort="${currentSort.field}"]`);
  if (activeHeader) {
    activeHeader.classList.add("is-active");
    activeHeader.dataset.dir = currentSort.dir;
  }
}

export async function loadVocabulary() {
  try {
    const params = new URLSearchParams({
      sortBy: currentSort.field,
      sortDir: currentSort.dir,
      limit: currentPagination.limit.toString(),
      page: currentPagination.page.toString(),
    });
    const response = await fetcher.get(`/api/vocabulary?${params}`);
    totalItems = response.total;
    renderVocabulary(response.data);
    updatePaginationControls();
  } catch (error) {
    console.error("Failed to load vocabulary:", error);
  }
}

function handleSort(field) {
  if (currentSort.field === field) {
    currentSort.dir = currentSort.dir === "ASC" ? "DESC" : "ASC";
  } else {
    currentSort.field = field;
    currentSort.dir = "ASC";
  }

  currentPagination.page = 1;
  savePagination(currentPagination);
  saveSort(currentSort);
  updateSortHeaders();
  loadVocabulary();
}

function goToPage(page) {
  currentPagination.page = page;
  savePagination(currentPagination);
  loadVocabulary();
}

function changeLimit(limit) {
  currentPagination.limit = limit;
  currentPagination.page = 1;
  savePagination(currentPagination);
  loadVocabulary();
}

export async function handleCreate(front, back) {
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

export async function handleUpdate(id, front, back) {
  const row = tbody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const previousData = { front: row.dataset.front, back: row.dataset.back };

  row.dataset.front = front;
  row.dataset.back = back;
  row.querySelector(".word-front").textContent = front;
  row.querySelector(".word-back").textContent = back;
  row.classList.add("pending");

  try {
    const savedWord = await fetcher.patch(`/api/vocabulary/${id}`, { front, back });
    row.dataset.front = savedWord.front;
    row.dataset.back = savedWord.back;
    row.querySelector(".word-front").textContent = savedWord.front;
    row.querySelector(".word-back").textContent = savedWord.back;
    row.classList.remove("pending");
  } catch (error) {
    console.error("Failed to update vocabulary:", error);
    row.dataset.front = previousData.front;
    row.dataset.back = previousData.back;
    row.querySelector(".word-front").textContent = previousData.front;
    row.querySelector(".word-back").textContent = previousData.back;
    row.classList.remove("pending");
  }
}

async function handleDelete(row) {
  const id = row.dataset.id;

  if (!confirm(`Delete "${row.dataset.front}"?`)) return;

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

export function updateRowAfterTraining(id, box, nextReview) {
  const row = tbody.querySelector(`tr[data-id="${id}"]`);
  if (row) {
    row.children[1].textContent = box;
    row.children[2].textContent = formatRelativeDate(nextReview);
  }
}

export function init() {
  updateSortHeaders();

  thead.addEventListener("click", (event) => {
    const th = event.target.closest("th.sortable");
    if (th) {
      handleSort(th.dataset.sort);
    }
  });

  tbody.addEventListener("click", (event) => {
    const target = event.target;
    const row = target.closest("tr");

    if (!row) return;

    if (target.classList.contains("edit-btn")) {
      if (onEditClick) {
        onEditClick(row);
      }
    } else if (target.classList.contains("delete-btn")) {
      handleDelete(row);
    }
  });

  paginationPrev.addEventListener("click", () => {
    if (currentPagination.page > 1) {
      goToPage(currentPagination.page - 1);
    }
  });

  paginationNext.addEventListener("click", () => {
    const totalPages = Math.ceil(totalItems / currentPagination.limit);
    if (currentPagination.page < totalPages) {
      goToPage(currentPagination.page + 1);
    }
  });

  paginationLimit.addEventListener("change", (event) => {
    changeLimit(parseInt(event.target.value, 10));
  });

  loadVocabulary();
}
