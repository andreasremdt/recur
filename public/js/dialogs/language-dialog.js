import LANGUAGE_MAP from "../language-map.js";
import fetcher from "../fetcher.js";

// Elements
let openButtons = document.querySelectorAll('[data-action="add-language"]');

let dialog = document.querySelector('[data-target="language-dialog"]');
let closeButtons = dialog.querySelectorAll("[data-action='close-dialog']");
let form = dialog.querySelector('[data-target="language-form"]');
let select = dialog.querySelector('[data-target="language-select"]');

// Callbacks
let onLanguageCreate = null;

export function setOnLanguageCreate(callback) {
  onLanguageCreate = callback;
}

function renderOptions() {
  select.innerHTML = "";

  for (let [key, name] of Object.entries(LANGUAGE_MAP)) {
    let option = document.createElement("option");

    option.value = key;
    option.textContent = name;

    select.appendChild(option);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  let name = select.value;

  if (!name) return;

  try {
    let newLanguage = await fetcher.post("/api/languages", { name });

    if (onLanguageCreate) {
      onLanguageCreate(newLanguage);
    }

    dialog.close();
  } catch (error) {
    console.error("Failed to create language:", error);
  }
}

export function init() {
  form.addEventListener("submit", handleSubmit);

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      renderOptions();
      dialog.showModal();
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
}
