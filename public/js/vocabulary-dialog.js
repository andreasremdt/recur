const dialog = document.querySelector("#vocabulary-dialog");
const form = document.querySelector("#vocabulary-form");
const dialogTitle = document.querySelector("#dialog-title");
const addBtn = document.querySelector("#add-vocabulary-btn");
const cancelBtn = document.querySelector("#dialog-cancel-btn");
const saveAddBtn = document.querySelector("#dialog-save-add-btn");

let onCreate = null;
let onUpdate = null;

export function setOnCreate(callback) {
  onCreate = callback;
}

export function setOnUpdate(callback) {
  onUpdate = callback;
}

function openDialog(mode, row = null) {
  form.reset();

  if (mode === "create") {
    dialogTitle.textContent = "Add Vocabulary";
    form.elements.id.value = "";
    saveAddBtn.hidden = false;
  } else {
    dialogTitle.textContent = "Edit Vocabulary";
    form.elements.id.value = row.dataset.id;
    form.elements.front.value = row.dataset.front;
    form.elements.back.value = row.dataset.back;
    saveAddBtn.hidden = true;
  }

  dialog.showModal();
}

export function openForCreate() {
  openDialog("create");
}

export function openForEdit(row) {
  openDialog("edit", row);
}

export function init() {
  addBtn.addEventListener("click", () => openDialog("create"));

  cancelBtn.addEventListener("click", () => dialog.close());

  saveAddBtn.addEventListener("click", () => {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const front = formData.get("front");
    const back = formData.get("back");

    if (onCreate) {
      onCreate(front, back);
    }
    form.reset();
    form.elements.front.focus();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const id = formData.get("id");
    const front = formData.get("front");
    const back = formData.get("back");

    dialog.close();

    if (id) {
      if (onUpdate) {
        onUpdate(id, front, back);
      }
    } else {
      if (onCreate) {
        onCreate(front, back);
      }
    }
  });
}
