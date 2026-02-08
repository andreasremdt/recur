import * as vocabularyTable from "./vocabulary-table.js";
import * as vocabularyDialog from "./vocabulary-dialog.js";
import * as trainingDialog from "./training-dialog.js";
import * as languageSwitcher from "./language-switcher.js";
import fetcher from "./fetcher.js";

// Wire up vocabulary dialog callbacks
vocabularyDialog.setOnCreate(vocabularyTable.handleCreate);
vocabularyDialog.setOnUpdate(vocabularyTable.handleUpdate);

// Wire up table callbacks
vocabularyTable.setOnEditClick(vocabularyDialog.openForEdit);

// Wire up training callbacks
trainingDialog.setOnTrainingComplete(() => {
  trainingDialog.updateTrainingButton();
  vocabularyTable.loadVocabulary();
});
trainingDialog.setOnAnswerSubmitted(vocabularyTable.updateRowAfterTraining);

// Wire up language switcher callbacks
languageSwitcher.setOnLanguageChange((language) => {
  vocabularyTable.setCurrentLanguage(language);
  trainingDialog.setCurrentLanguage(language);
  vocabularyTable.loadVocabulary();
  trainingDialog.updateTrainingButton();
});

// Initialize user menu
async function initUserMenu() {
  const userNameEl = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");

  try {
    const user = await fetcher.get("/api/auth/me");
    userNameEl.textContent = user.name;
  } catch (error) {
    // Will redirect to login if 401
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetcher.post("/api/auth/logout", {});
    } catch (error) {
      // Ignore errors, redirect anyway
    }
    window.location.href = "/login.html";
  });
}

// Initialize all modules
initUserMenu();
languageSwitcher.init();
vocabularyTable.init();
vocabularyDialog.init();
trainingDialog.init();
