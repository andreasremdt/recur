const SORT_STORAGE_KEY = "memrise_sort";
const PAGINATION_STORAGE_KEY = "memrise_pagination";

const defaultSort = { field: "next_review", dir: "ASC" };
const defaultPagination = { page: 1, limit: 50 };

export function loadSort() {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.field && parsed.dir) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { ...defaultSort };
}

export function saveSort(sort) {
  localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
}

export function loadPagination() {
  try {
    const stored = localStorage.getItem(PAGINATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.page && parsed.limit) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { ...defaultPagination };
}

export function savePagination(pagination) {
  localStorage.setItem(PAGINATION_STORAGE_KEY, JSON.stringify(pagination));
}
