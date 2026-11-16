// SQLite connection and schema.
// The database is a single file (data/campusfix.db by default), so reports
// survive page refreshes and application restarts.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'campusfix.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Report status values inside the application (not the Jira workflow).
const STATUSES = ['Submitted', 'In Progress', 'Resolved'];

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    location        TEXT    NOT NULL,
    category        TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Submitted'
                            CHECK (status IN ('Submitted', 'In Progress', 'Resolved')),
    resolution_note TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

module.exports = { db, DB_PATH, STATUSES };
