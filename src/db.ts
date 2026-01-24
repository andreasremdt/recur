import { Database, type SQLQueryBindings } from "bun:sqlite";
import type { Vocabulary } from "./types";

const db = new Database("dev.db");
db.run("PRAGMA journal_mode = WAL;");

export function getAllVocabulary() {
  return db
    .query<
      Vocabulary,
      SQLQueryBindings[]
    >("SELECT * FROM vocabulary ORDER BY box ASC, next_review ASC")
    .all();
}

export function createVocabulary(front: string, back: string): Vocabulary {
  const id = crypto.randomUUID();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextReview = tomorrow.toISOString().slice(0, 10);

  db.run(
    "INSERT INTO vocabulary (id, front, back, box, next_review) VALUES (?, ?, ?, ?, ?)",
    [id, front, back, 1, nextReview],
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

export function getScheduledVocabulary(): Vocabulary[] {
  const today = new Date().toISOString().slice(0, 10);

  return db
    .query<
      Vocabulary,
      string[]
    >("SELECT * FROM vocabulary WHERE next_review <= ? ORDER BY box ASC, next_review ASC")
    .all(today);
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
