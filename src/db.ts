import { Database, type SQLQueryBindings } from "bun:sqlite";
import type { Vocabulary } from "./types";

const db = new Database("dev.db");
db.run("PRAGMA journal_mode = WAL;");

export function getAllVocabulary() {
  return db
    .query<Vocabulary, SQLQueryBindings[]>("SELECT * FROM vocabulary")
    .all();
}
