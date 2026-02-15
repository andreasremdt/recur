import { Database } from "bun:sqlite";
import { existsSync } from "fs";

const dbPath = process.env.DB_PATH || "dev.db";

console.log(`[migrate] Database path: ${dbPath}`);

// Check if database file exists
const dbExists = existsSync(dbPath);

if (dbExists) {
  console.log("[migrate] Database already exists, checking schema...");
} else {
  console.log("[migrate] Creating new database...");
}

const db = new Database(dbPath);
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

// Create tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  )
`);
console.log("[migrate] ✓ users table ready");

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);
console.log("[migrate] ✓ sessions table ready");

db.run(`
  CREATE TABLE IF NOT EXISTS languages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);
console.log("[migrate] ✓ languages table ready");

db.run(`
  CREATE TABLE IF NOT EXISTS vocabulary (
    id TEXT PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    box INTEGER NOT NULL DEFAULT 1,
    next_review DATE NOT NULL,
    user_id TEXT,
    language_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
  )
`);
console.log("[migrate] ✓ vocabulary table ready");

db.run(`
  UPDATE languages SET name = 'es' WHERE name = 'Spanish';
  UPDATE languages SET name = 'fr' WHERE name = 'French';
`);

db.close();

console.log("[migrate] Database migration complete!");
