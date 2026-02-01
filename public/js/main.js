import * as vocabularyTable from "./vocabulary-table.js";
import * as vocabularyDialog from "./vocabulary-dialog.js";
import * as training from "./training.js";
import fetcher from "./fetcher.js";

// Wire up vocabulary dialog callbacks
vocabularyDialog.setOnCreate(vocabularyTable.handleCreate);
vocabularyDialog.setOnUpdate(vocabularyTable.handleUpdate);

// Wire up table callbacks
vocabularyTable.setOnEditClick(vocabularyDialog.openForEdit);

// Wire up training callbacks
training.setOnTrainingComplete(() => {
  training.updateTrainingButton();
  vocabularyTable.loadVocabulary();
});
training.setOnAnswerSubmitted(vocabularyTable.updateRowAfterTraining);

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
vocabularyTable.init();
vocabularyDialog.init();
training.init();
