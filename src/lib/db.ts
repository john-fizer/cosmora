import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "cosmora.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      customer_id    TEXT PRIMARY KEY,
      stripe_sub_id  TEXT,
      tier           TEXT NOT NULL DEFAULT 'free',
      period_end     INTEGER,
      updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS oracle_usage (
      customer_id TEXT NOT NULL,
      date        TEXT NOT NULL,
      count       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (customer_id, date)
    );

    CREATE TABLE IF NOT EXISTS marriage_readings (
      id             TEXT PRIMARY KEY,
      profile_id     TEXT NOT NULL,
      generated_at   TEXT NOT NULL,
      guide_mode     TEXT NOT NULL DEFAULT 'star',
      star_text      TEXT NOT NULL,
      final_text     TEXT NOT NULL,
      significators  TEXT NOT NULL,   -- JSON blob
      created_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_marriage_readings_profile
      ON marriage_readings (profile_id, generated_at DESC);
  `);
}
