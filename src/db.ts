import { Database, type SQLQueryBindings } from "bun:sqlite";
import type { Vocabulary } from "./types";

const db = new Database("dev.db");
db.run("PRAGMA journal_mode = WAL;");

export function getAllVocabulary() {
  return db
    .query<Vocabulary, SQLQueryBindings[]>("SELECT * FROM vocabulary")
    .all();
}

export function createVocabulary(front: string, back: string): Vocabulary {
  const id = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);

  db.run(
    "INSERT INTO vocabulary (id, front, back, box, next_review) VALUES (?, ?, ?, ?, ?)",
    [id, front, back, 1, today],
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
