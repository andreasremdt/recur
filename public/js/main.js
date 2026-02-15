import * as vocabularyTable from "./components/vocabulary-table.js";
import * as vocabularyDialog from "./components/vocabulary-dialog.js";
import * as trainingDialog from "./components/training-dialog.js";
import * as languageDialog from "./components/language-dialog.js";
import * as languageSwitcher from "./components/language-switcher.js";
import * as userMenu from "./components/user-menu.js";

// Wire up vocabulary dialog callbacks
vocabularyDialog.setOnCreate(vocabularyTable.handleCreate);
vocabularyDialog.setOnUpdate(vocabularyTable.handleUpdate);

// Wire up training callbacks
trainingDialog.setOnTrainingComplete(() => {
  trainingDialog.updateTrainingButton();
  vocabularyTable.loadVocabulary();
});
trainingDialog.setOnAnswerSubmitted(vocabularyTable.updateRowAfterTraining);

// Wire up language switcher callbacks
languageSwitcher.setOnLanguageChange((language) => {
  vocabularyTable.setCurrentLanguage(language);
  vocabularyTable.loadVocabulary();

  trainingDialog.setCurrentLanguage(language);
  trainingDialog.updateTrainingButton();
});

// Wire up language dialog callbacks
languageDialog.setOnLanguageCreate((language) => {
  languageSwitcher.addLanguage(language);
  vocabularyTable.setCurrentLanguage(language);

  vocabularyTable.loadVocabulary();

  trainingDialog.setCurrentLanguage(language);
  trainingDialog.updateTrainingButton();
});

// Initialize all modules
languageSwitcher.init();
userMenu.init();
languageDialog.init();
vocabularyTable.init();
vocabularyDialog.init();
trainingDialog.init();
