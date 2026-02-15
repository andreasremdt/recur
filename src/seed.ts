import { Database } from "bun:sqlite";

const dbPath = process.env.DB_PATH || "dev.db";
const db = new Database(dbPath);

// Disable foreign keys for clean deletion order
db.run("PRAGMA foreign_keys = OFF;");

db.run("DELETE FROM vocabulary");
db.run("DELETE FROM sessions");
db.run("DELETE FROM languages");
db.run("DELETE FROM users");

db.run("PRAGMA foreign_keys = ON;");

function getDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

// --- Users ---
// John has languages and vocabulary, Jane has nothing (empty state)
const johnId = "seed-user-john";
const janeId = "seed-user-jane";

const johnPassword = await Bun.password.hash("password123", {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
});

const janePassword = await Bun.password.hash("securepass456", {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
});

const insertUser = db.prepare(
  "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
);

insertUser.run(johnId, "John Doe", "john@example.com", johnPassword);
insertUser.run(janeId, "Jane Smith", "jane@example.com", janePassword);

// --- Languages ---
// Spanish has vocabulary across all boxes, French is empty
const spanishId = "seed-lang-spanish";
const frenchId = "seed-lang-french";

const insertLanguage = db.prepare(
  "INSERT INTO languages (id, name, user_id) VALUES (?, ?, ?)",
);

insertLanguage.run(spanishId, "es", johnId);
insertLanguage.run(frenchId, "fr", johnId);

// --- Vocabulary ---
// Covers all 5 boxes with overdue, due today, and future review dates
const insertVocab = db.prepare(
  "INSERT INTO vocabulary (id, front, back, box, next_review, user_id, language_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
);

const vocabulary: [string, string, string, number, string, string, string][] = [
  // Box 1 — daily review
  [crypto.randomUUID(), "hello", "hola", 1, getDate(-1), johnId, spanishId],
  [crypto.randomUUID(), "goodbye", "adiós", 1, getDate(0), johnId, spanishId],
  [
    crypto.randomUUID(),
    "thank you",
    "gracias",
    1,
    getDate(0),
    johnId,
    spanishId,
  ],

  // Box 2 — every 2 days
  [
    crypto.randomUUID(),
    "please",
    "por favor",
    2,
    getDate(0),
    johnId,
    spanishId,
  ],
  [
    crypto.randomUUID(),
    "good morning",
    "buenos días",
    2,
    getDate(1),
    johnId,
    spanishId,
  ],

  // Box 3 — every 4 days
  [
    crypto.randomUUID(),
    "good evening",
    "buenas tardes",
    3,
    getDate(0),
    johnId,
    spanishId,
  ],
  [
    crypto.randomUUID(),
    "good night",
    "buenas noches",
    3,
    getDate(3),
    johnId,
    spanishId,
  ],

  // Box 4 — every 7 days
  [
    crypto.randomUUID(),
    "how are you",
    "¿cómo estás?",
    4,
    getDate(-2),
    johnId,
    spanishId,
  ],
  [
    crypto.randomUUID(),
    "I'm fine",
    "estoy bien",
    4,
    getDate(5),
    johnId,
    spanishId,
  ],

  // Box 5 — every 14 days (mastered)
  [crypto.randomUUID(), "yes", "sí", 5, getDate(0), johnId, spanishId],
  [crypto.randomUUID(), "no", "no", 5, getDate(10), johnId, spanishId],
];

for (const word of vocabulary) {
  insertVocab.run(...word);
}

db.close();

console.log("Database seeded successfully.");
console.log("  Users:");
console.log(
  "    - john@example.com / password123 (2 languages, 11 vocabulary)",
);
console.log("    - jane@example.com / securepass456 (no data)");
console.log("  Languages (John):");
console.log("    - Spanish (11 vocabulary across boxes 1-5)");
console.log("    - French (empty)");
