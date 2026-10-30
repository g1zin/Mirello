import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../src/data/database';
import { migrations } from '../src/data/migrations';
import { emptyState, exportData, parseExport, validateState } from '../src/shared/model';
const dir = () => mkdtempSync(join(tmpdir(), 'grello-test-'));
function seed(db: Store) {
  db.dispatch({ type: 'board.create', title: 'Minha semana' });
  const b = db.read().state.boards[0].id;
  for (const title of ['A fazer', 'Fazendo', 'Finalizado'])
    db.dispatch({ type: 'column.create', boardId: b, title });
  const columns = db.read().state.columns;
  for (const title of ['Alfa', 'Beta', 'Gama'])
    db.dispatch({ type: 'card.create', columnId: columns[0].id, title });
  return db.read().state;
}
test('persistência real: movimentação, ordem de quadros e colunas sobrevivem ao reinício', () => {
  const path = dir();
  let db = new Store(path);
  const s = seed(db),
    [a, b, c] = s.cards;
  db.dispatch({ type: 'card.move', id: c.id, columnId: s.columns[0].id, beforeId: a.id });
  db.dispatch({ type: 'card.move', id: b.id, columnId: s.columns[1].id, beforeId: null });
  db.dispatch({ type: 'column.move', id: s.columns[2].id, offset: -1 });
  db.dispatch({ type: 'board.create', title: 'Segundo' });
  db.dispatch({ type: 'board.move', id: db.read().state.boards[1].id, offset: -1 });
  const expected = db.read();
  db.close();
  db = new Store(path);
  assert.deepEqual(db.read(), expected);
  assert.deepEqual(
    db
      .read()
      .state.cards.filter((x) => x.columnId === s.columns[0].id)
      .map((x) => x.title),
    ['Gama', 'Alfa']
  );
  db.close();
});
test('edição completa, duplicação, etiquetas, checklist, arquivar/restaurar e exclusão de coluna', () => {
  const db = new Store(dir()),
    s = seed(db),
    c = s.cards[0];
  db.dispatch({ type: 'label.create', boardId: c.boardId, title: 'Prioridade', color: '#447755' });
  const label = db.read().state.labels[0];
  db.dispatch({
    type: 'card.update',
    id: c.id,
    patch: {
      title: 'Novo título',
      description: '<script>alert(1)</script>\nTexto preservado',
      due: '2026-10-28',
      labelIds: [label.id],
      checklist: [{ id: randomUUID(), title: 'Tarefa', done: true }],
      completed: true,
    },
  });
  db.dispatch({ type: 'card.duplicate', id: c.id });
  const duplicate = db.read().state.cards.at(-1)!;
  assert.notEqual(duplicate.checklist[0].id, db.read().state.cards[0].checklist[0].id);
  assert.equal(duplicate.description, '<script>alert(1)</script>\nTexto preservado');
  db.dispatch({ type: 'card.archive', id: c.id, archived: true });
  db.dispatch({ type: 'board.update', id: c.boardId, patch: { archived: true } });
  db.dispatch({ type: 'board.update', id: c.boardId, patch: { archived: false } });
  assert.equal(db.read().state.cards.find((x) => x.id === c.id)!.archived, true);
  db.dispatch({ type: 'card.archive', id: c.id, archived: false });
  db.dispatch({ type: 'label.delete', id: label.id });
  assert.deepEqual(db.read().state.cards.find((x) => x.id === c.id)!.labelIds, []);
  assert.throws(() =>
    db.dispatch({ type: 'column.delete', id: s.columns[0].id, destinationId: null })
  );
  db.dispatch({ type: 'column.delete', id: s.columns[0].id, destinationId: s.columns[1].id });
  assert(db.read().state.cards.every((x) => x.columnId === s.columns[1].id));
  db.close();
});
test('exportação/reimportação preserva todo o conteúdo, preferências e ordem; backup recuperável', () => {
  const path = dir(),
    db = new Store(path);
  seed(db);
  db.dispatch({ type: 'settings.update', patch: { theme: 'dark', accent: '#123456' } });
  const original = db.read().state,
    exported = JSON.parse(JSON.stringify(exportData(original)));
  db.dispatch({ type: 'board.create', title: 'Dados anteriores à troca' });
  const previous = db.read().state;
  db.import(parseExport(exported), 'replace');
  assert.deepEqual(db.read().state, original);
  const backup = readdirSync(join(path, 'backups'))[0],
    restoreDir = dir();
  copyFileSync(join(path, 'backups', backup, 'grello.sqlite'), join(restoreDir, 'grello.sqlite'));
  const restored = new Store(restoreDir);
  assert.deepEqual(restored.read().state, previous);
  restored.close();
  db.close();
});
test('mesclar renova todos os IDs e preserva referências e dados atuais', () => {
  const db = new Store(dir());
  const s = seed(db);
  db.dispatch({ type: 'label.create', boardId: s.boards[0].id, title: 'Rótulo', color: '#123456' });
  db.dispatch({
    type: 'card.update',
    id: s.cards[0].id,
    patch: {
      labelIds: [db.read().state.labels[0].id],
      checklist: [{ id: randomUUID(), title: 'Tarefa', done: false }],
    },
  });
  const source = db.read().state;
  db.import(source, 'merge');
  const merged = db.read().state;
  assert.equal(merged.boards.length, 2);
  assert.equal(merged.cards.length, 6);
  assert.deepEqual(merged.cards.slice(0, 3), source.cards);
  assert.notEqual(merged.cards[3].id, source.cards[0].id);
  assert.equal(merged.cards[3].labelIds[0], merged.labels[1].id);
  assert.equal(merged.cards[3].boardId, merged.boards[1].id);
  validateState(merged);
  db.close();
});
test('importação inválida e ações inválidas não alteram o banco', () => {
  const db = new Store(dir()),
    s = seed(db),
    before = db.read();
  const invalid = structuredClone(exportData(s));
  invalid.data.cards[0].columnId = randomUUID();
  assert.throws(() => parseExport(invalid));
  assert.throws(() => parseExport({ ...exportData(s), version: 999 }));
  assert.throws(() => parseExport({}));
  assert.throws(() => JSON.parse('{oops'));
  const duplicate = structuredClone(s);
  duplicate.cards[0].id = duplicate.boards[0].id;
  assert.throws(() => db.import(duplicate, 'replace'));
  assert.throws(() =>
    db.dispatch({ type: 'card.update', id: s.cards[0].id, patch: { due: '2026-02-30' } })
  );
  assert.throws(() =>
    db.dispatch({ type: 'card.update', id: s.cards[0].id, patch: { title: ' ' } })
  );
  assert.deepEqual(db.read(), before);
  assert.equal(readdirSync(db.backups).length, 0);
  db.close();
});
test('migração v1 → v4 cria backup anterior e preserva entidades e preferências', () => {
  const path = dir(),
    file = join(path, 'grello.sqlite'),
    legacy = new DatabaseSync(file);
  legacy.exec(migrations[0]);
  legacy.exec('PRAGMA user_version=1');
  const b = {
    id: randomUUID(),
    title: 'Meu quadro antigo',
    accent: '#123456',
    background: '#ffffff',
    archived: false,
  };
  legacy.prepare('INSERT INTO entities VALUES (?,?,?)').run(b.id, 'board', JSON.stringify(b));
  legacy.close();
  const db = new Store(path);
  assert.deepEqual(db.read().state.boards, [b]);
  assert.equal(db.read().revision, 0);
  const backup = readdirSync(db.backups)[0],
    old = new DatabaseSync(join(db.backups, backup, 'grello.sqlite'));
  assert.equal(old.prepare('PRAGMA user_version').get()!.user_version, 1);
  old.close();
  db.close();
});
test('banco de versão futura é recusado sem perder dados', () => {
  const path = dir(),
    file = join(path, 'grello.sqlite'),
    db = new DatabaseSync(file);
  db.exec(
    "PRAGMA user_version=999; CREATE TABLE preserved(value TEXT); INSERT INTO preserved VALUES ('original')"
  );
  db.close();
  assert.throws(() => new Store(path), /versão mais nova/);
  const check = new DatabaseSync(file);
  assert.equal(check.prepare('SELECT value FROM preserved').get()!.value, 'original');
  check.close();
});

test('uma falha no backup impede a substituição e preserva os dados atuais', () => {
  const db = new Store(dir());
  seed(db);
  const before = db.read();
  db.backup = () => {
    throw new Error('Disco indisponível');
  };
  assert.throws(() => db.import(emptyState(), 'replace'), /Disco indisponível/);
  assert.deepEqual(db.read(), before);
  db.close();
});
test('falha de migração faz rollback e mantém backup da versão anterior', () => {
  const path = dir(),
    file = join(path, 'grello.sqlite');
  const legacy = new DatabaseSync(file);
  legacy.exec(migrations[0]);
  legacy.exec(
    "PRAGMA user_version=1; CREATE TABLE metadata (original TEXT); INSERT INTO metadata VALUES ('preservado')"
  );
  legacy.close();
  assert.throws(() => new Store(path));
  const check = new DatabaseSync(file);
  assert.equal(check.prepare('PRAGMA user_version').get()!.user_version, 1);
  assert.equal(check.prepare('SELECT original FROM metadata').get()!.original, 'preservado');
  check.close();
  assert.equal(readdirSync(join(path, 'backups')).length, 1);
});
