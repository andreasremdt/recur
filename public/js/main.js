import * as vocabularyTable from "./vocabulary-table.js";
import * as vocabularyDialog from "./vocabulary-dialog.js";
import * as training from "./training.js";

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

// Initialize all modules
vocabularyTable.init();
vocabularyDialog.init();
training.init();
