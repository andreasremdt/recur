import fetcher from "./fetcher.js";
import { loadLanguage, saveLanguage } from "./storage.js";

// Available languages for the dropdown
const AVAILABLE_LANGUAGES = [
  "Arabic",
  "Chinese",
  "Dutch",
  "English",
  "French",
  "German",
  "Greek",
  "Hebrew",
  "Hindi",
  "Italian",
  "Japanese",
  "Korean",
  "Polish",
  "Portuguese",
  "Russian",
  "Spanish",
  "Swedish",
  "Turkish",
  "Vietnamese",
];

// Elements
const languageSwitcher = document.querySelector("#language-switcher");
const languageDropdown = document.querySelector("#language-dropdown");
const addLanguageOption = document.querySelector("#add-language-option");
const languageDialog = document.querySelector("#language-dialog");
const languageForm = document.querySelector("#language-form");
const languageSelect = document.querySelector("#language-select");
const languageDialogCancel = document.querySelector("#language-dialog-cancel");

// State
let languages = [];
let currentLanguage = loadLanguage();

// Callbacks
let onLanguageChange = null;

export function setOnLanguageChange(callback) {
  onLanguageChange = callback;
}

export function getCurrentLanguage() {
  return currentLanguage;
}

function renderLanguageDropdown() {
  // Clear existing options except the "Add language" option
  const options = languageDropdown.querySelectorAll("option:not(#add-language-option)");
  options.forEach((opt) => opt.remove());

  // Add language options before the "Add language" option
  for (const lang of languages) {
    const option = document.createElement("option");
    option.value = lang.id;
    option.textContent = lang.name;
    if (currentLanguage && lang.id === currentLanguage.id) {
      option.selected = true;
    }
    languageDropdown.insertBefore(option, addLanguageOption);
  }

  // Show/hide the switcher based on whether there are languages
  if (languages.length === 0) {
    languageSwitcher.classList.add("no-languages");
  } else {
    languageSwitcher.classList.remove("no-languages");
  }
}

function renderLanguageSelectOptions() {
  languageSelect.innerHTML = "";

  // Get names of existing languages for filtering
  const existingNames = new Set(languages.map((l) => l.name.toLowerCase()));

  for (const langName of AVAILABLE_LANGUAGES) {
    if (!existingNames.has(langName.toLowerCase())) {
      const option = document.createElement("option");
      option.value = langName;
      option.textContent = langName;
      languageSelect.appendChild(option);
    }
  }
}

export async function loadLanguages() {
  try {
    languages = await fetcher.get("/api/languages");

    // If no current language is set, or if the stored language doesn't exist anymore
    if (!currentLanguage || !languages.find((l) => l.id === currentLanguage.id)) {
      if (languages.length > 0) {
        currentLanguage = languages[0];
        saveLanguage(currentLanguage);
      } else {
        currentLanguage = null;
        saveLanguage(null);
      }
    }

    renderLanguageDropdown();

    if (onLanguageChange) {
      onLanguageChange(currentLanguage);
    }
  } catch (error) {
    console.error("Failed to load languages:", error);
  }
}

function handleLanguageSwitch(event) {
  const value = event.target.value;

  if (value === "add-new") {
    // Reset dropdown to current language while dialog is open
    if (currentLanguage) {
      languageDropdown.value = currentLanguage.id;
    }
    renderLanguageSelectOptions();
    languageDialog.showModal();
    return;
  }

  const selectedLanguage = languages.find((l) => l.id === value);
  if (selectedLanguage && (!currentLanguage || selectedLanguage.id !== currentLanguage.id)) {
    currentLanguage = selectedLanguage;
    saveLanguage(currentLanguage);
    if (onLanguageChange) {
      onLanguageChange(currentLanguage);
    }
  }
}

async function handleCreateLanguage(event) {
  event.preventDefault();

  const name = languageSelect.value;
  if (!name) return;

  try {
    const newLanguage = await fetcher.post("/api/languages", { name });
    languages.push(newLanguage);
    languages.sort((a, b) => a.name.localeCompare(b.name));

    currentLanguage = newLanguage;
    saveLanguage(currentLanguage);

    renderLanguageDropdown();
    languageDialog.close();

    if (onLanguageChange) {
      onLanguageChange(currentLanguage);
    }
  } catch (error) {
    console.error("Failed to create language:", error);
  }
}

export function init() {
  languageDropdown.addEventListener("change", handleLanguageSwitch);
  languageForm.addEventListener("submit", handleCreateLanguage);
  languageDialogCancel.addEventListener("click", () => languageDialog.close());

  languageDialog.addEventListener("click", (event) => {
    if (event.target === languageDialog) {
      languageDialog.close();
    }
  });

  loadLanguages();
}
