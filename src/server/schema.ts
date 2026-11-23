import { db } from "./services.js";

export async function initialiseDatabase() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY, folder_id TEXT NOT NULL, original_name TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE, content_type TEXT, size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL, FOREIGN KEY(folder_id) REFERENCES folders(id)
    )`,
    `CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY, file_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
      permission TEXT NOT NULL CHECK(permission IN ('viewer', 'editor')),
      created_at TEXT NOT NULL, revoked_at TEXT, FOREIGN KEY(file_id) REFERENCES files(id)
    )`,
  ]);

  const now = new Date().toISOString();
  await db.batch([
    { sql: "INSERT OR IGNORE INTO folders (id, name, created_at) VALUES (?, ?, ?)", args: ["notes", "Notes", now] },
    { sql: "INSERT OR IGNORE INTO folders (id, name, created_at) VALUES (?, ?, ?)", args: ["assignments", "Assignments", now] },
    { sql: "INSERT OR IGNORE INTO folders (id, name, created_at) VALUES (?, ?, ?)", args: ["faculty", "Faculty Materials", now] },
  ]);
}
