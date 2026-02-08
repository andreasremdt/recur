import { setVisibility } from "./utils.js";

let add = document.querySelector("[data-action='add']");
let dialog = document.querySelector("[data-target='vocabulary-dialog']");
let title = dialog.querySelector("[data-target='title']");

let form = dialog.querySelector("[data-target='vocabulary-form']");
let saveAddBtn = dialog.querySelector("[data-action='save-and-add']");

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
    title.textContent = "Add vocabulary";
    form.elements.id.value = "";
    setVisibility(saveAddBtn, true);
  } else {
    title.textContent = "Edit vocabulary";
    form.elements.id.value = row.dataset.id;
    form.elements.front.value = row.dataset.front;
    form.elements.back.value = row.dataset.back;
    setVisibility(saveAddBtn, false);
  }

  dialog.showModal();
}

function handleSubmit(event) {
  if (event.submitter.value === "cancel") {
    return;
  }

  let id = form.elements.id.value;
  let front = form.elements.front.value;
  let back = form.elements.back.value;

  if (id) {
    if (onUpdate) {
      onUpdate(id, front, back);
    }
  } else {
    if (onCreate) {
      onCreate(front, back);
    }
  }

  if (event.submitter.value === "save-and-add") {
    event.preventDefault();

    form.reset();
    form.elements.front.focus();
  }
}

export function openForCreate() {
  openDialog("create");
}

export function openForEdit(row) {
  openDialog("edit", row);
}

export function init() {
  add.addEventListener("click", openForCreate);
  form.addEventListener("submit", handleSubmit);
}
