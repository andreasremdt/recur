import fetcher from "./fetcher.js";
import { formatRelativeDate } from "./utils.js";
import {
  loadSort,
  saveSort,
  loadPagination,
  savePagination,
} from "./storage.js";

// Elements
const table = document.querySelector("#vocabulary-table");
const thead = table.querySelector("thead");
const tbody = table.querySelector("tbody");
const paginationRange = document.querySelector("#pagination-range");
const paginationTotal = document.querySelector("#pagination-total");
const paginationLimit = document.querySelector("#pagination-limit");
const paginationPrev = document.querySelector("#pagination-prev");
const paginationNext = document.querySelector("#pagination-next");
const wordCount = document.querySelector('[data-target="word-count"]');

// State
let currentSort = loadSort();
let currentPagination = loadPagination();
let allVocabulary = []; // All vocabulary items fetched from server
let currentLanguage = null;

// Callbacks
let onEditClick = null;

export function setCurrentLanguage(language) {
  currentLanguage = language;
}

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
          <svg width="16" height="16">
            <use href="/icons/icon-defs.svg#pencil" />
          </svg>
        </button>
        <button type="button" class="delete-btn" title="Delete">
          <svg width="16" height="16">
            <use href="/icons/icon-defs.svg#trash" />
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
  const totalItems = allVocabulary.length;
  const totalPages = Math.ceil(totalItems / currentPagination.limit);

  paginationRange.textContent = totalItems > 0 ? currentPagination.page : "0";
  paginationTotal.textContent = totalPages.toString();

  paginationPrev.disabled = currentPagination.page <= 1;
  paginationNext.disabled = currentPagination.page >= totalPages;

  paginationLimit.value = currentPagination.limit.toString();
}

function updateSortHeaders() {
  thead.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("is-active");
    delete th.dataset.dir;
  });

  const activeHeader = thead.querySelector(
    `th[data-sort="${currentSort.field}"]`,
  );
  if (activeHeader) {
    activeHeader.classList.add("is-active");
    activeHeader.dataset.dir = currentSort.dir;
  }
}

function updateTotalWordCount() {
  const count = allVocabulary.length;

  wordCount.textContent = `${count} ${count === 1 ? "word" : "words"}`;
}

function sortVocabulary(vocabulary) {
  const { field, dir } = currentSort;
  const sorted = [...vocabulary];

  sorted.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Handle string comparison (case-insensitive for 'front')
    if (field === "front") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    // Handle numeric comparison for 'box'
    if (field === "box") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }

    if (aVal < bVal) return dir === "ASC" ? -1 : 1;
    if (aVal > bVal) return dir === "ASC" ? 1 : -1;
    return 0;
  });

  return sorted;
}

function getPagedVocabulary() {
  const sorted = sortVocabulary(allVocabulary);
  const start = (currentPagination.page - 1) * currentPagination.limit;
  const end = start + currentPagination.limit;
  return sorted.slice(start, end);
}

function renderCurrentPage() {
  const pagedData = getPagedVocabulary();
  renderVocabulary(pagedData);
  updatePaginationControls();
  updateTotalWordCount();
}

export async function loadVocabulary() {
  if (!currentLanguage) {
    // No language selected, show empty state
    allVocabulary = [];
    renderVocabulary([]);
    updatePaginationControls();
    return;
  }

  try {
    const params = new URLSearchParams({
      languageId: currentLanguage.id,
    });
    allVocabulary = await fetcher.get(`/api/vocabulary?${params}`);
    currentPagination.page = 1;
    savePagination(currentPagination);
    renderCurrentPage();
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
  renderCurrentPage();
}

function goToPage(page) {
  currentPagination.page = page;
  savePagination(currentPagination);
  renderCurrentPage();
}

function changeLimit(limit) {
  currentPagination.limit = limit;
  currentPagination.page = 1;
  savePagination(currentPagination);
  renderCurrentPage();
}

export async function handleCreate(front, back) {
  if (!currentLanguage) {
    console.error("No language selected");
    return;
  }

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

  // Add to local array and re-render
  allVocabulary.unshift(optimisticWord);
  renderCurrentPage();

  // Mark the row as pending (it should be on the first page now)
  const row = tbody.querySelector(`tr[data-id="${tempId}"]`);
  if (row) {
    row.classList.add("pending");
  }

  try {
    const savedWord = await fetcher.post("/api/vocabulary", {
      front,
      back,
      languageId: currentLanguage.id,
    });

    // Update the local array with the server response
    const index = allVocabulary.findIndex((v) => v.id === tempId);
    if (index !== -1) {
      allVocabulary[index] = savedWord;
    }

    // Update the row if still visible
    const savedRow = tbody.querySelector(`tr[data-id="${tempId}"]`);
    if (savedRow) {
      savedRow.dataset.id = savedWord.id;
      savedRow.classList.remove("pending");
    }
  } catch (error) {
    console.error("Failed to add vocabulary:", error);
    // Remove from local array and re-render
    const index = allVocabulary.findIndex((v) => v.id === tempId);
    if (index !== -1) {
      allVocabulary.splice(index, 1);
    }
    renderCurrentPage();
  }
}

export async function handleUpdate(id, front, back) {
  // Find the item in local array
  const item = allVocabulary.find((v) => v.id === id);
  if (!item) return;

  const previousData = { front: item.front, back: item.back };

  // Optimistically update local array
  item.front = front;
  item.back = back;

  // Update the row if visible
  const row = tbody.querySelector(`tr[data-id="${id}"]`);
  if (row) {
    row.dataset.front = front;
    row.dataset.back = back;
    row.querySelector(".word-front").textContent = front;
    row.querySelector(".word-back").textContent = back;
    row.classList.add("pending");
  }

  try {
    const savedWord = await fetcher.patch(`/api/vocabulary/${id}`, {
      front,
      back,
    });

    // Update local array with server response
    item.front = savedWord.front;
    item.back = savedWord.back;

    // Update the row if still visible
    const updatedRow = tbody.querySelector(`tr[data-id="${id}"]`);
    if (updatedRow) {
      updatedRow.dataset.front = savedWord.front;
      updatedRow.dataset.back = savedWord.back;
      updatedRow.querySelector(".word-front").textContent = savedWord.front;
      updatedRow.querySelector(".word-back").textContent = savedWord.back;
      updatedRow.classList.remove("pending");
    }
  } catch (error) {
    console.error("Failed to update vocabulary:", error);

    // Restore previous data in local array
    item.front = previousData.front;
    item.back = previousData.back;

    // Restore the row if visible
    const revertedRow = tbody.querySelector(`tr[data-id="${id}"]`);
    if (revertedRow) {
      revertedRow.dataset.front = previousData.front;
      revertedRow.dataset.back = previousData.back;
      revertedRow.querySelector(".word-front").textContent = previousData.front;
      revertedRow.querySelector(".word-back").textContent = previousData.back;
      revertedRow.classList.remove("pending");
    }
  }
}

async function handleDelete(row) {
  const id = row.dataset.id;

  if (!confirm(`Delete "${row.dataset.front}"?`)) return;

  // Find and store the item in case we need to restore it
  const index = allVocabulary.findIndex((v) => v.id === id);
  const deletedItem = index !== -1 ? allVocabulary[index] : null;

  // Optimistically remove from local array
  if (index !== -1) {
    allVocabulary.splice(index, 1);
  }

  // Re-render the current page
  renderCurrentPage();

  try {
    await fetcher.delete(`/api/vocabulary/${id}`);
  } catch (error) {
    console.error("Failed to delete vocabulary:", error);
    // Restore the item to local array
    if (deletedItem && index !== -1) {
      allVocabulary.splice(index, 0, deletedItem);
    }
    renderCurrentPage();
  }
}

export function updateRowAfterTraining(id, box, nextReview) {
  // Update the local array
  const item = allVocabulary.find((v) => v.id === id);
  if (item) {
    item.box = box;
    item.next_review = nextReview;
  }

  // Update the row if visible
  const row = tbody.querySelector(`tr[data-id="${id}"]`);
  if (row) {
    row.dataset.box = box;
    row.dataset.nextReview = nextReview;
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
    const totalPages = Math.ceil(
      allVocabulary.length / currentPagination.limit,
    );
    if (currentPagination.page < totalPages) {
      goToPage(currentPagination.page + 1);
    }
  });

  paginationLimit.addEventListener("change", (event) => {
    changeLimit(parseInt(event.target.value, 10));
  });

  // Note: loadVocabulary will be called by the language switcher when a language is selected
}
