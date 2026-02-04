import { Database } from "bun:sqlite";
import type { Vocabulary, User, Session, Language } from "./types";

const dbPath = process.env.DB_PATH || "dev.db";
const db = new Database(dbPath);
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

export function getAllVocabulary(
  userId: string,
  languageId: string,
): Vocabulary[] {
  return db
    .query<Vocabulary, [string, string]>(
      `SELECT * FROM vocabulary WHERE user_id = ? AND language_id = ?`,
    )
    .all(userId, languageId);
}

export function createVocabulary(front: string, back: string, userId: string, languageId: string): Vocabulary {
  const id = crypto.randomUUID();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextReview = tomorrow.toISOString().slice(0, 10);

  db.run(
    "INSERT INTO vocabulary (id, front, back, box, next_review, user_id, language_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, front, back, 1, nextReview, userId, languageId],
  );

  return db
    .query<Vocabulary, string[]>("SELECT * FROM vocabulary WHERE id = ?")
    .get(id)!;
}

export function updateVocabulary(
  id: string,
  updates: Partial<Pick<Vocabulary, "front" | "back">>,
): Vocabulary | null {
  const existing = db
    .query<Vocabulary, string[]>("SELECT * FROM vocabulary WHERE id = ?")
    .get(id);

  if (!existing) {
    return null;
  }

  const front = updates.front ?? existing.front;
  const back = updates.back ?? existing.back;

  db.run("UPDATE vocabulary SET front = ?, back = ? WHERE id = ?", [
    front,
    back,
    id,
  ]);

  return db
    .query<Vocabulary, string[]>("SELECT * FROM vocabulary WHERE id = ?")
    .get(id)!;
}

export function deleteVocabulary(id: string): boolean {
  const existing = db
    .query<Vocabulary, string[]>("SELECT * FROM vocabulary WHERE id = ?")
    .get(id);

  if (!existing) {
    return false;
  }

  db.run("DELETE FROM vocabulary WHERE id = ?", [id]);

  return true;
}

export function getScheduledVocabulary(userId: string, languageId: string): Vocabulary[] {
  const today = new Date().toISOString().slice(0, 10);

  return db
    .query<
      Vocabulary,
      [string, string, string]
    >("SELECT * FROM vocabulary WHERE user_id = ? AND language_id = ? AND next_review <= ? ORDER BY box ASC, next_review ASC")
    .all(userId, languageId, today);
}

// SM-2 intervals: Box 1 = 1 day, Box 2 = 2 days, Box 3 = 4 days, Box 4 = 7 days, Box 5 = 14 days
const BOX_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

export function updateVocabularyBox(
  id: string,
  correct: boolean,
): Vocabulary | null {
  const existing = db
    .query<Vocabulary, string[]>("SELECT * FROM vocabulary WHERE id = ?")
    .get(id);

  if (!existing) {
    return null;
  }

  // Calculate new box level (min 1, max 5)
  let newBox = existing.box;
  if (correct) {
    newBox = Math.min(5, existing.box + 1);
  } else {
    newBox = Math.max(1, existing.box - 1);
  }

  // Calculate next review date based on new box
  const interval = BOX_INTERVALS[newBox] ?? 1;
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  const nextReviewStr = nextReview.toISOString().slice(0, 10);

  db.run("UPDATE vocabulary SET box = ?, next_review = ? WHERE id = ?", [
    newBox,
    nextReviewStr,
    id,
  ]);

  return db
    .query<Vocabulary, string[]>("SELECT * FROM vocabulary WHERE id = ?")
    .get(id)!;
}

// ==================== Auth Functions ====================

export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<Omit<User, "password"> | null> {
  // Check if email already exists
  const existing = db
    .query<User, [string]>("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (existing) {
    return null;
  }

  const id = crypto.randomUUID();
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19456,
    timeCost: 2,
  });

  db.run(
    "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
    [id, name, email, hashedPassword],
  );

  const user = db
    .query<User, [string]>("SELECT * FROM users WHERE id = ?")
    .get(id)!;

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function findUserByEmail(email: string): User | null {
  return db
    .query<User, [string]>("SELECT * FROM users WHERE email = ?")
    .get(email) ?? null;
}

export function findUserById(id: string): Omit<User, "password"> | null {
  const user = db
    .query<User, [string]>("SELECT * FROM users WHERE id = ?")
    .get(id);

  if (!user) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function createSession(userId: string, rememberMe: boolean = false): Session {
  const id = crypto.randomUUID();
  const expiresAt = new Date();
  
  // 24 hours for regular sessions, 30 days for "remember me"
  if (rememberMe) {
    expiresAt.setDate(expiresAt.getDate() + 30);
  } else {
    expiresAt.setHours(expiresAt.getHours() + 24);
  }

  db.run(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [id, userId, expiresAt.toISOString()],
  );

  return db
    .query<Session, [string]>("SELECT * FROM sessions WHERE id = ?")
    .get(id)!;
}

export function getSessionWithUser(sessionId: string): { session: Session; user: Omit<User, "password"> } | null {
  const session = db
    .query<Session, [string]>("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId);

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    // Delete expired session
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
    return null;
  }

  const user = findUserById(session.user_id);
  if (!user) {
    return null;
  }

  return { session, user };
}

export function deleteSession(sessionId: string): boolean {
  const existing = db
    .query<Session, [string]>("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId);

  if (!existing) {
    return false;
  }

  db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  return true;
}

export function updateLastLogin(userId: string): void {
  db.run(
    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
    [userId],
  );
}

// ==================== Language Functions ====================

export function getAllLanguages(userId: string): Language[] {
  return db
    .query<Language, [string]>("SELECT * FROM languages WHERE user_id = ? ORDER BY name ASC")
    .all(userId);
}

export function createLanguage(name: string, userId: string): Language {
  const id = crypto.randomUUID();

  db.run(
    "INSERT INTO languages (id, name, user_id) VALUES (?, ?, ?)",
    [id, name, userId],
  );

  return db
    .query<Language, [string]>("SELECT * FROM languages WHERE id = ?")
    .get(id)!;
}

export function deleteLanguage(id: string, userId: string): boolean {
  const existing = db
    .query<Language, [string, string]>("SELECT * FROM languages WHERE id = ? AND user_id = ?")
    .get(id, userId);

  if (!existing) {
    return false;
  }

  // Delete all vocabulary associated with this language first
  db.run("DELETE FROM vocabulary WHERE language_id = ?", [id]);
  db.run("DELETE FROM languages WHERE id = ?", [id]);

  return true;
}

export function getLanguageById(id: string, userId: string): Language | null {
  return db
    .query<Language, [string, string]>("SELECT * FROM languages WHERE id = ? AND user_id = ?")
    .get(id, userId) ?? null;
}
