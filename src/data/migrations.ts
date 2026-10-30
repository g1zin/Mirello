import type { DatabaseSync } from 'node:sqlite';
export const SCHEMA_VERSION = 4;
export const migrations = [
  `CREATE TABLE entities (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('board','column','card','label')), data TEXT NOT NULL CHECK(json_valid(data))); CREATE TABLE preferences (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL CHECK(json_valid(data))); INSERT INTO preferences VALUES (1,'{"theme":"system","accent":"#347568"}');`,
  `CREATE TABLE metadata (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0); INSERT INTO metadata VALUES (1,0);`,
  // Migration 3 adds appearance without changing the existing mode or accent.
  `UPDATE preferences SET data=json_set(data,'$.visualStyle','original','$.decorationIntensity',65,'$.decorativeAnimations',json('true')) WHERE id=1;`,
  // Migration 4 stores scene documents separately from tasks. Asset files are immutable.
  `CREATE TABLE visual_scenes (board_id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data))); CREATE TABLE visual_assets (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)));`,
];
export function migrate(db: DatabaseSync, before: () => void) {
  const version = Number(db.prepare('PRAGMA user_version').get()!.user_version);
  if (version > SCHEMA_VERSION)
    throw new Error(
      'Este banco foi criado por uma versão mais nova do Mirello. Abra com a versão mais recente.'
    );
  if (version === SCHEMA_VERSION) return;
  if (version > 0) before();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let i = version; i < SCHEMA_VERSION; i++) {
      db.exec(migrations[i]);
      db.exec('PRAGMA user_version = ' + (i + 1));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
