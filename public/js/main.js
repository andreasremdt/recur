import * as vocabularyTable from "./vocabulary-table.js";
import * as vocabularyDialog from "./vocabulary-dialog.js";
import * as trainingDialog from "./training-dialog.js";
import * as languageSwitcher from "./language-switcher.js";
import * as userMenu from "./user-menu.js";

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

// Initialize all modules
languageSwitcher.init();
userMenu.init();
vocabularyTable.init();
vocabularyDialog.init();
trainingDialog.init();
