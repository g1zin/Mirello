import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrate } from './migrations';
import { applyAction, mergeStates } from '../domain/actions';
import { emptyState, validateState, type Action, type State, type Snapshot } from '../shared/model';
export class Store {
  readonly db: DatabaseSync;
  readonly backups: string;
  constructor(readonly directory: string) {
    mkdirSync(directory, { recursive: true });
    this.backups = join(directory, 'backups');
    mkdirSync(this.backups, { recursive: true });
    this.db = new DatabaseSync(join(directory, 'grello.sqlite'));
    this.db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;');
    try {
      migrate(this.db, () => this.backup('antes-migracao'));
      this.db.exec('PRAGMA journal_mode=WAL;');
      validateState(this.read().state);
    } catch (e) {
      this.db.close();
      throw e;
    }
  }
  read(): Snapshot {
    const s = emptyState();
    const rows = this.db.prepare('SELECT kind,data FROM entities ORDER BY rowid').all();
    for (const row of rows) {
      const data = JSON.parse(row.data as string);
      switch (row.kind) {
        case 'board':
          s.boards.push(data);
          break;
        case 'column':
          s.columns.push(data);
          break;
        case 'card':
          s.cards.push(data);
          break;
        case 'label':
          s.labels.push(data);
          break;
      }
    }
    s.settings = JSON.parse(
      this.db.prepare('SELECT data FROM preferences WHERE id=1').get()!.data as string
    );
    return {
      state: validateState(s),
      revision: Number(this.db.prepare('SELECT revision FROM metadata WHERE id=1').get()!.revision),
    };
  }
  private write(state: State): Snapshot {
    const s = validateState(state);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec('DELETE FROM entities');
      const insert = this.db.prepare('INSERT INTO entities (id,kind,data) VALUES (?,?,?)');
      for (const [kind, list] of [
        ['board', s.boards],
        ['column', s.columns],
        ['card', s.cards],
        ['label', s.labels],
      ] as const)
        for (const e of list) insert.run(e.id, kind, JSON.stringify(e));
      this.db.prepare('UPDATE preferences SET data=? WHERE id=1').run(JSON.stringify(s.settings));
      this.db.exec('UPDATE metadata SET revision=revision+1 WHERE id=1; COMMIT');
      return this.read();
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  dispatch(action: Action) {
    return this.write(applyAction(this.read().state, action));
  }
  import(state: State, mode: 'merge' | 'replace') {
    const valid = validateState(state);
    if (mode === 'replace') {
      this.backup('antes-importacao');
      return this.write(valid);
    }
    return this.write(mergeStates(this.read().state, valid));
  }
  backup(reason = 'manual'): string {
    const target = join(
      this.backups,
      new Date().toISOString().replace(/[:.]/g, '-') +
        '-' +
        reason +
        '-' +
        randomUUID().slice(0, 8) +
        '.sqlite'
    );
    if (existsSync(target)) throw new Error('Já existe um backup com este nome.');
    this.db.prepare('VACUUM INTO ?').run(target);
    return target;
  }
  close() {
    this.db.close();
  }
}
