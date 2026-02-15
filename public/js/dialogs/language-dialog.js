import LANGUAGE_MAP from "../language-map.js";
import fetcher from "../fetcher.js";

let dialog = document.querySelector('[data-target="language-dialog"]');
let form = dialog.querySelector('[data-target="language-form"]');
let select = dialog.querySelector('[data-target="language-select"]');

// Callbacks
let onLanguageCreate = null;

export function setOnLanguageCreate(callback) {
  onLanguageCreate = callback;
}

function handleOpen() {
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
  dialog.addEventListener("toggle", handleOpen);
}
