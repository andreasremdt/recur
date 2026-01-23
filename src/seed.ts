import { Database } from "bun:sqlite";

const db = new Database("dev.db");

console.log("Creating database schema...");

db.run("DROP TABLE IF EXISTS vocabulary");

db.run(`
  CREATE TABLE vocabulary (
    id TEXT PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    box INTEGER NOT NULL DEFAULT 1,
    next_review DATE NOT NULL,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log("Database schema created successfully.");

const insert = db.prepare(`
  INSERT OR IGNORE INTO vocabulary (id, front, back, box, next_review)
  VALUES (?, ?, ?, ?, ?)
`);

// Helper to get date relative to today
function getDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

const vocabulary: [string, string, string, number, string][] = [
  // Box 1 - Daily review (due today and yesterday)
  [crypto.randomUUID(), "hello", "hola", 1, getDate(-1)],
  [crypto.randomUUID(), "goodbye", "adiós", 1, getDate(0)],
  [crypto.randomUUID(), "thank you", "gracias", 1, getDate(0)],

  // Box 2 - Review every 2 days
  [crypto.randomUUID(), "please", "por favor", 2, getDate(0)],
  [crypto.randomUUID(), "good morning", "buenos días", 2, getDate(1)],

  // Box 3 - Review every 4 days
  [crypto.randomUUID(), "good evening", "buenas tardes", 3, getDate(0)],
  [crypto.randomUUID(), "good night", "buenas noches", 3, getDate(3)],

  // Box 4 - Review every 7 days
  [crypto.randomUUID(), "how are you", "¿cómo estás?", 4, getDate(0)],
  [crypto.randomUUID(), "I'm fine", "estoy bien", 4, getDate(5)],

  // Box 5 - Review every 14 days (mastered)
  [crypto.randomUUID(), "yes", "sí", 5, getDate(0)],
  [crypto.randomUUID(), "no", "no", 5, getDate(10)],
];

for (const word of vocabulary) {
  insert.run(word[0], word[1], word[2], word[3], word[4]);
}

console.log(`Seeded ${vocabulary.length} vocabulary entries.`);

db.close();
