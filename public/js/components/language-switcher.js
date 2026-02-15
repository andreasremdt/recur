import fetcher from "../lib/fetcher.js";
import { loadLanguage, saveLanguage } from "../lib/storage.js";
import { setVisibility } from "../lib/utils.js";
import LANGUAGE_MAP from "../language-map.js";

// Elements
let addLanguageButton = document.querySelector('[data-action="add-language"]');
let languageFlag = document.querySelector('[data-target="language-flag"]');
let dropdownTrigger = document.querySelector(
  '[data-target="language-dropdown-trigger"]',
);
let languageMenu = document.querySelector('[data-target="language-menu"]');
let languageList = document.querySelector('[data-target="language-list"]');

// State
let languages = [];
let currentLanguage = loadLanguage();

// Callbacks
let onLanguageChange = null;

export function setOnLanguageChange(callback) {
  onLanguageChange = callback;
}

export function addLanguage(newLanguage) {
  languages.push(newLanguage);
  languages.sort((a, b) => a.name.localeCompare(b.name));

  currentLanguage = newLanguage;

  saveLanguage(currentLanguage);
  renderLanguageDropdown();
}

export function getCurrentLanguage() {
  return currentLanguage;
}

function renderLanguageDropdown() {
  if (languages.length === 0) {
    setVisibility(addLanguageButton, true);
    setVisibility(dropdownTrigger, false);
  } else {
    setVisibility(addLanguageButton, false);
    setVisibility(dropdownTrigger, true);

    if (currentLanguage) {
      languageFlag.setAttribute(
        "href",
        `/icons/country-defs.svg#${currentLanguage.name}`,
      );
    }

    let options = languages.map((language) => {
      return `
        <button type="button" class="item${language.id === currentLanguage.id ? " -active" : ""}" data-language-id="${language.id}" data-action="switch-langage">
          <svg width="20" height="20">
            <use href="/icons/country-defs.svg#${language.name}" />
          </svg>

          ${LANGUAGE_MAP[language.name] ?? language.name}
        </button>`;
    });

    languageList.innerHTML = options.join("");
  }
}

function handleSelectLanguage(event) {
  let { languageId } = event.target.dataset;
  let match = languages.find((language) => language.id === languageId);

  if (!match || match.id === currentLanguage.id) {
    return;
  }

  currentLanguage = match;
  saveLanguage(currentLanguage);
  renderLanguageDropdown();
  languageMenu.hidePopover();

  if (onLanguageChange) {
    onLanguageChange(currentLanguage);
  }
}

export async function loadLanguages() {
  try {
    languages = await fetcher.get("/api/languages");

    // If no current language is set, or if the stored language doesn't exist anymore
    if (
      !currentLanguage ||
      !languages.find((l) => l.id === currentLanguage.id)
    ) {
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

export function init() {
  languageList.addEventListener("click", handleSelectLanguage);
  loadLanguages();
}
