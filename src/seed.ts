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

const today = new Date().toISOString().slice(0, 10);

const vocabulary: [string, string, string, number, string][] = [
  [crypto.randomUUID(), "hello", "hola", 1, today],
  [crypto.randomUUID(), "goodbye", "adiós", 1, today],
  [crypto.randomUUID(), "thank you", "gracias", 1, today],
  [crypto.randomUUID(), "please", "por favor", 1, today],
  [crypto.randomUUID(), "good morning", "buenos días", 1, today],
];

for (const word of vocabulary) {
  insert.run(word[0], word[1], word[2], word[3], word[4]);
}

console.log(`Seeded ${vocabulary.length} vocabulary entries.`);

db.close();
