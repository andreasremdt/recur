import { Database } from "bun:sqlite";

const db = new Database("dev.db");

console.log("Creating database schema...");

// Drop tables in correct order (foreign key constraints)
db.run("DROP TABLE IF EXISTS sessions");
db.run("DROP TABLE IF EXISTS vocabulary");
db.run("DROP TABLE IF EXISTS users");

// Create users table
db.run(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  )
`);

// Create sessions table
db.run(`
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create vocabulary table
db.run(`
  CREATE TABLE vocabulary (
    id TEXT PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    box INTEGER NOT NULL DEFAULT 1,
    next_review DATE NOT NULL,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log("Database schema created successfully.");

// Helper to get date relative to today
function getDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

// Seed users
const testUserId = crypto.randomUUID();
const testUser2Id = crypto.randomUUID();

// Hash passwords using Bun's native Argon2id
const testPassword1 = await Bun.password.hash("password123", {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
});

const testPassword2 = await Bun.password.hash("securepass456", {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
});

const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password)
  VALUES (?, ?, ?, ?)
`);

insertUser.run(testUserId, "John Doe", "john@example.com", testPassword1);
insertUser.run(testUser2Id, "Jane Smith", "jane@example.com", testPassword2);

console.log("Seeded 2 test users.");
console.log("  - john@example.com / password123");
console.log("  - jane@example.com / securepass456");

// Seed vocabulary (linked to first test user)
const insertVocabulary = db.prepare(`
  INSERT OR IGNORE INTO vocabulary (id, front, back, box, next_review, user_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const vocabulary: [string, string, string, number, string, string][] = [
  // Box 1 - Daily review (due today and yesterday)
  [crypto.randomUUID(), "hello", "hola", 1, getDate(-1), testUserId],
  [crypto.randomUUID(), "goodbye", "adiós", 1, getDate(0), testUserId],
  [crypto.randomUUID(), "thank you", "gracias", 1, getDate(0), testUserId],

  // Box 2 - Review every 2 days
  [crypto.randomUUID(), "please", "por favor", 2, getDate(0), testUserId],
  [crypto.randomUUID(), "good morning", "buenos días", 2, getDate(1), testUserId],

  // Box 3 - Review every 4 days
  [crypto.randomUUID(), "good evening", "buenas tardes", 3, getDate(0), testUserId],
  [crypto.randomUUID(), "good night", "buenas noches", 3, getDate(3), testUserId],

  // Box 4 - Review every 7 days
  [crypto.randomUUID(), "how are you", "¿cómo estás?", 4, getDate(0), testUserId],
  [crypto.randomUUID(), "I'm fine", "estoy bien", 4, getDate(5), testUserId],

  // Box 5 - Review every 14 days (mastered)
  [crypto.randomUUID(), "yes", "sí", 5, getDate(0), testUserId],
  [crypto.randomUUID(), "no", "no", 5, getDate(10), testUserId],
];

for (const word of vocabulary) {
  insertVocabulary.run(word[0], word[1], word[2], word[3], word[4], word[5]);
}

console.log(`Seeded ${vocabulary.length} vocabulary entries for john@example.com.`);

db.close();
