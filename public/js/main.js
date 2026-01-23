async function loadVocabulary() {
  try {
    const res = await fetch("/api/vocabulary");
    const vocabulary = await res.json();
    const tbody = document.querySelector("#vocabulary-table tbody");

    for (const word of vocabulary) {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${word.front}</td>
          <td>${word.back}</td>
          <td>${word.box}</td>
          <td>${word.next_review}</td>
        `;
      tbody.appendChild(row);
    }
  } catch (error) {
    console.error("Failed to load vocabulary:", error);
  }
}

loadVocabulary();
