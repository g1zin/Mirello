import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../src/data/database';
import { migrations, SCHEMA_VERSION } from '../src/data/migrations';
import { emptyState, exportData, parseExport } from '../src/shared/model';
import { appearanceDefaults } from '../src/shared/appearance';
const dir = () => mkdtempSync(join(tmpdir(), 'grello-appearance-'));
function fixture() {
  const db = new Store(dir());
  db.dispatch({ type: 'board.create', title: 'Dados antigos' });
  const b = db.read().state.boards[0];
  db.dispatch({
    type: 'board.update',
    id: b.id,
    patch: { accent: '#b35b6d', background: '#f8ecee' },
  });
  db.dispatch({ type: 'column.create', boardId: b.id, title: 'Uma coluna' });
  db.dispatch({
    type: 'card.create',
    columnId: db.read().state.columns[0].id,
    title: 'Meu cartão preservado',
  });
  db.dispatch({ type: 'settings.update', patch: { theme: 'dark', accent: '#b35b6d' } });
  const s = db.read().state;
  db.close();
  return s;
}
test('migração v2 → v4 preserva dados, modo e cores e cria backup anterior recuperável', () => {
  const path = dir(),
    s = fixture(),
    old = new DatabaseSync(join(path, 'grello.sqlite'));
  old.exec(migrations[0]);
  old.exec(migrations[1]);
  old.exec('PRAGMA user_version=2');
  const insert = old.prepare('INSERT INTO entities VALUES (?,?,?)');
  for (const [kind, list] of [
    ['board', s.boards],
    ['column', s.columns],
    ['card', s.cards],
    ['label', s.labels],
  ] as const)
    for (const item of list) insert.run(item.id, kind, JSON.stringify(item));
  const oldSettings = { theme: 'dark', accent: '#b35b6d' };
  old.prepare('UPDATE preferences SET data=? WHERE id=1').run(JSON.stringify(oldSettings));
  old.close();
  const db = new Store(path);
  assert.equal(SCHEMA_VERSION, 4);
  assert.deepEqual(db.read().state, { ...s, settings: { ...oldSettings, ...appearanceDefaults } });
  const backups = readdirSync(db.backups);
  assert.equal(backups.length, 1);
  const backup = new DatabaseSync(join(db.backups, backups[0], 'grello.sqlite'));
  assert.equal(backup.prepare('PRAGMA user_version').get()!.user_version, 2);
  assert.deepEqual(
    JSON.parse(backup.prepare('SELECT data FROM preferences').get()!.data as string),
    oldSettings
  );
  assert.equal(backup.prepare("SELECT count(*) as n FROM entities WHERE kind='card'").get()!.n, 1);
  backup.close();
  db.close();
  const reopened = new Store(path);
  assert.equal(readdirSync(reopened.backups).length, 1);
  assert.equal(reopened.read().state.settings.visualStyle, 'original');
  reopened.close();
});
test('exportação v1 recebe aparência Original sem mudar modo, cores, conteúdo ou IDs', () => {
  const s = fixture(),
    legacy = {
      format: 'grello',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { ...s, settings: { theme: 'dark', accent: '#b35b6d' } },
    };
  assert.deepEqual(parseExport(legacy), s);
  const db = new Store(dir());
  db.import(parseExport(legacy), 'replace');
  assert.deepEqual(db.read().state, s);
  db.close();
});
test('preferências novas sobrevivem à reabertura e à exportação v2; patches não aplicam defaults', () => {
  const path = dir();
  let db = new Store(path);
  db.dispatch({
    type: 'settings.update',
    patch: { visualStyle: 'sky-cherry', decorationIntensity: 0, decorativeAnimations: false },
  });
  db.dispatch({ type: 'settings.update', patch: { theme: 'dark' } });
  const expected = {
    ...emptyState().settings,
    visualStyle: 'sky-cherry',
    decorationIntensity: 0,
    decorativeAnimations: false,
    theme: 'dark',
  };
  assert.deepEqual(db.read().state.settings, expected);
  const exported = exportData(db.read().state);
  assert.equal(exported.version, 2);
  assert.deepEqual(parseExport(JSON.parse(JSON.stringify(exported))).settings, expected);
  db.close();
  db = new Store(path);
  assert.deepEqual(db.read().state.settings, expected);
  db.dispatch({ type: 'settings.update', patch: { visualStyle: 'original' } });
  assert.equal(db.read().state.settings.decorationIntensity, 0);
  assert.equal(db.read().state.settings.theme, 'dark');
  db.close();
});
test('valores de aparência inválidos são recusados sem alterar preferências ou dados', () => {
  const db = new Store(dir()),
    before = db.read();
  for (const patch of [
    { decorationIntensity: -1 },
    { decorationIntensity: 101 },
    { decorationIntensity: 2.5 },
    { decorativeAnimations: 'true' },
    { visualStyle: 'unknown' },
  ])
    assert.throws(() => db.dispatch({ type: 'settings.update', patch } as never));
  assert.deepEqual(db.read(), before);
  db.close();
});
