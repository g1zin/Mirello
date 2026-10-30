import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import { Store } from '../src/data/database';
import { migrations, SCHEMA_VERSION } from '../src/data/migrations';
import { inspectImage, assetName, sha256 } from '../src/data/images';
import { encodePackage, decodePackage } from '../src/data/package';
import {
  emptyScene,
  validateBundle,
  parseVisualDocument,
  visualDocument,
  type VisualElement,
} from '../src/shared/visual';
import { parseExport } from '../src/shared/model';
const dir = () => mkdtempSync(resolve('.tools/visual-unit-'));
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64'
);
function element(type: VisualElement['type'], patch: Partial<VisualElement> = {}): VisualElement {
  return {
    id: randomUUID(),
    type,
    x: 10,
    y: 20,
    width: 220,
    height: 130,
    angle: 0,
    strokeColor: '#375b82',
    backgroundColor: '#fff0b3',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    seed: 1,
    version: 1,
    versionNonce: 2,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...patch,
  };
}
function fixture() {
  const db = new Store(dir());
  db.dispatch({ type: 'board.create', title: 'Projeto fictício' });
  const boardId = db.read().state.boards[0].id;
  db.dispatch({ type: 'column.create', boardId, title: 'A fazer' });
  db.dispatch({
    type: 'card.create',
    columnId: db.read().state.columns[0].id,
    title: 'Tarefa original',
  });
  const card = db.read().state.cards[0],
    asset = inspectImage(png);
  db.addImage(asset, png);
  const reference = element('rectangle', {
    customData: { grelloKind: 'card', grelloCardId: card.id },
    link: 'grello-card:' + card.id,
  });
  const image = element('image', { fileId: asset.id, status: 'saved', scale: [1, 1], crop: null });
  const arrow = element('arrow', {
    points: [
      [0, 0],
      [200, 100],
    ],
    startBinding: { elementId: reference.id, focus: 0, gap: 1 },
    endBinding: { elementId: image.id, focus: 0, gap: 1 },
    lastCommittedPoint: null,
    startArrowhead: null,
    endArrowhead: 'arrow',
    elbowed: false,
  });
  const scene = {
    ...emptyScene(boardId),
    elements: [reference, image, arrow],
    view: { scrollX: 123, scrollY: -45, zoom: 0.7 },
  };
  db.saveVisual(scene);
  return { db, scene, asset, card };
}
test('JSON v2 aprovado permanece íntegro: importa tarefas e preferências, com quadro visual vazio', () => {
  const old = JSON.parse(readFileSync('docs/importacao/grello-exemplo.json', 'utf8'));
  assert.equal(old.version, 2);
  const expected = parseExport(old),
    bundle = parseVisualDocument(old),
    db = new Store(dir());
  db.importBundle(bundle, 'replace', new Map());
  assert.deepEqual(db.read().state, expected);
  assert.deepEqual(db.loadVisual(expected.boards[0].id).scene, emptyScene(expected.boards[0].id));
  assert.equal(db.read().state.cards.length, 3);
  assert.equal(db.read().state.cards.filter((c) => c.completed).length, 1);
  assert.deepEqual(bundle.visuals, []);
  assert.deepEqual(bundle.assets, []);
  db.close();
});
test('cena, ordem, viewport, imagens gerenciadas e referência sobrevivem ao reinício sem regravar tarefas', () => {
  const { db, scene, asset } = fixture(),
    path = db.directory,
    tasks = db.read();
  const rows = db.db.prepare('SELECT rowid,id,data FROM entities ORDER BY rowid').all();
  for (let i = 0; i < 4; i++)
    db.saveVisual({ ...scene, view: { ...scene.view, scrollX: 123 + i } });
  assert.deepEqual(db.read(), tasks);
  assert.deepEqual(db.db.prepare('SELECT rowid,id,data FROM entities ORDER BY rowid').all(), rows);
  db.saveVisual(scene);
  db.close();
  const reopened = new Store(path);
  assert.deepEqual(reopened.loadVisual(scene.boardId).scene, scene);
  assert.deepEqual(reopened.readImage(asset.id).bytes, png);
  reopened.close();
});
test('pacote completo preserva bytes, cena e cartões; mesclar remapeia recursos, elementos, conectores e referências', () => {
  const { db, scene, asset, card } = fixture(),
    packed = encodePackage(db.bundle(), (id) => db.readImage(id).bytes),
    parsed = decodePackage(packed);
  assert.deepEqual(parsed.bundle, db.bundle());
  assert.deepEqual(Buffer.from(parsed.files.get(asset.id)!), png);
  const target = new Store(dir());
  target.dispatch({ type: 'board.create', title: 'Preservar' });
  target.dispatch({
    type: 'settings.update',
    patch: {
      theme: 'dark',
      visualStyle: 'sky-cherry',
      decorationIntensity: 23,
      decorativeAnimations: false,
    },
  });
  const before = target.read().state;
  target.importBundle(parsed.bundle, 'merge', parsed.files);
  const state = target.read().state,
    visual = target.readScenes()[0],
    assets = target.readAssets();
  assert.deepEqual(state.settings, before.settings);
  assert.deepEqual(state.boards[0], before.boards[0]);
  assert.notEqual(visual.boardId, scene.boardId);
  assert.equal(visual.boardId, state.boards[1].id);
  assert.notEqual(visual.elements[0].id, scene.elements[0].id);
  assert.notEqual(assets[0].id, asset.id);
  assert.equal(visual.elements[0].customData!.grelloCardId, state.cards[0].id);
  assert.notEqual(state.cards[0].id, card.id);
  assert.equal(visual.elements[0].link, 'grello-card:' + state.cards[0].id);
  assert.equal(visual.elements[1].fileId, assets[0].id);
  assert.equal(visual.elements[2].startBinding!.elementId, visual.elements[0].id);
  assert.equal(visual.elements[2].endBinding!.elementId, visual.elements[1].id);
  assert.deepEqual(target.readImage(assets[0].id).bytes, png);
  assert.deepEqual(visual.view, scene.view);
  target.importBundle(parsed.bundle, 'merge', parsed.files);
  assert.equal(target.readScenes().length, 2);
  assert.equal(target.readAssets().length, 2);
  validateBundle(target.bundle());
  target.close();
  db.close();
});
test('excluir cartão deixa vínculo indisponível; excluir imagem visual não remove arquivo necessário ao desfazer', () => {
  const { db, scene, asset, card } = fixture();
  db.dispatch({ type: 'card.archive', id: card.id, archived: true });
  assert.equal(db.loadVisual(scene.boardId).scene.elements[0].customData!.grelloCardId, card.id);
  db.dispatch({ type: 'card.delete', id: card.id });
  validateBundle(db.bundle());
  const deleted = structuredClone(scene);
  deleted.elements[1].isDeleted = true;
  db.saveVisual(deleted);
  assert.deepEqual(db.readImage(asset.id).bytes, png);
  db.saveVisual(scene);
  assert.equal(db.loadVisual(scene.boardId).scene.elements[1].isDeleted, false);
  const target = new Store(dir());
  const p = decodePackage(encodePackage(db.bundle(), (id) => db.readImage(id).bytes));
  target.importBundle(p.bundle, 'merge', p.files);
  assert.notEqual(target.readScenes()[0].elements[0].customData!.grelloCardId, card.id);
  target.close();
  db.close();
});
test('backup anterior à substituição recupera banco, cena e todas as imagens', () => {
  const { db, scene, asset } = fixture(),
    before = db.bundle();
  db.import(
    parseExport(JSON.parse(readFileSync('docs/importacao/grello-exemplo.json', 'utf8'))),
    'replace'
  );
  const backup = join(
    db.backups,
    readdirSync(db.backups).find((n) => n.endsWith('.grello-backup'))!
  );
  const manifest = JSON.parse(readFileSync(join(backup, 'manifest.json'), 'utf8'));
  assert.equal(sha256(readFileSync(join(backup, 'grello.sqlite'))), manifest.database.sha256);
  assert.equal(
    sha256(readFileSync(join(backup, 'assets', assetName(asset)))),
    manifest.assets[0].sha256
  );
  const restoredDir = dir();
  cpSync(join(backup, 'grello.sqlite'), join(restoredDir, 'grello.sqlite'));
  cpSync(join(backup, 'assets'), join(restoredDir, 'assets'), { recursive: true });
  const restored = new Store(restoredDir);
  assert.deepEqual(restored.bundle(), before);
  assert.deepEqual(restored.loadVisual(scene.boardId).scene, scene);
  assert.deepEqual(restored.readImage(asset.id).bytes, png);
  restored.close();
  db.close();
});
test('migração 3 → 4 preserva estado, cria quadros vazios e backup completo anterior', () => {
  const path = dir(),
    old = new DatabaseSync(join(path, 'grello.sqlite'));
  for (const sql of migrations.slice(0, 3)) old.exec(sql);
  old.exec('PRAGMA user_version=3');
  const state = parseExport(
    JSON.parse(readFileSync('docs/importacao/grello-exemplo.json', 'utf8'))
  );
  for (const [kind, list] of [
    ['board', state.boards],
    ['column', state.columns],
    ['card', state.cards],
    ['label', state.labels],
  ] as const)
    for (const e of list)
      old.prepare('INSERT INTO entities VALUES (?,?,?)').run(e.id, kind, JSON.stringify(e));
  old.prepare('UPDATE preferences SET data=? WHERE id=1').run(JSON.stringify(state.settings));
  old.close();
  const db = new Store(path);
  assert.equal(SCHEMA_VERSION, 4);
  assert.deepEqual(db.read().state, state);
  assert.deepEqual(db.readScenes(), []);
  const backup = join(db.backups, readdirSync(db.backups)[0], 'grello.sqlite'),
    previous = new DatabaseSync(backup);
  assert.equal(previous.prepare('PRAGMA user_version').get()!.user_version, 3);
  previous.close();
  db.close();
});
test('pacotes inválidos e recursos ausentes são recusados sem alterar dados ou criar backup', () => {
  const { db } = fixture(),
    before = db.bundle(),
    packed = encodePackage(before, (id) => db.readImage(id).bytes);
  const entries = unzipSync(packed);
  for (const bad of [
    zipSync({ ...entries, '../escape.png': png }),
    zipSync({ ...entries, 'assets/unexpected.svg': strToU8('<svg/>') }),
    packed.subarray(0, packed.length - 6),
  ])
    assert.throws(() => decodePackage(bad));
  const corrupt = { ...entries, 'data.json': strToU8(strFromU8(entries['data.json']) + ' ') };
  assert.throws(() => decodePackage(zipSync(corrupt)));
  const unsafe = structuredClone(before);
  (unsafe.visuals[0].elements[0] as any).link = 'javascript:alert(1)';
  assert.throws(() => db.importBundle(unsafe, 'replace', new Map()));
  assert.throws(() => db.importBundle(before, 'replace', new Map()));
  assert.deepEqual(db.bundle(), before);
  assert.equal(readdirSync(db.backups).length, 0);
  assert.throws(() => inspectImage(strToU8('<svg/>')));
  db.backup = () => {
    throw Error('Disco indisponível');
  };
  const valid = decodePackage(packed);
  assert.throws(() => db.importBundle(valid.bundle, 'replace', valid.files), /Disco indisponível/);
  assert.deepEqual(db.bundle(), before);
  db.close();
});
test('documento v3 sem imagens importa sozinho e rejeita elementos ativos e propriedades desconhecidas', () => {
  const { db } = fixture();
  const bundle = db.bundle();
  bundle.assets = [];
  bundle.visuals[0].elements = bundle.visuals[0].elements.slice(0, 1);
  const doc = visualDocument(bundle);
  assert.deepEqual(parseVisualDocument(JSON.parse(JSON.stringify(doc))), bundle);
  for (const type of ['iframe', 'embeddable', 'magicframe']) {
    const invalid = structuredClone(doc);
    (invalid.visuals[0].elements[0] as any).type = type;
    assert.throws(() => parseVisualDocument(invalid));
  }
  const invalid = structuredClone(doc);
  (invalid.visuals[0].elements[0] as any).script = 'alert(1)';
  assert.throws(() => parseVisualDocument(invalid));
  db.close();
});

test('exportação recusa recursos acima do limite antes de carregá-los na memória', () => {
  const { db, asset } = fixture(),
    bundle = db.bundle();
  for (let i = 0; i < 13; i++)
    bundle.assets.push({ ...asset, id: randomUUID(), bytes: 20 * 1024 * 1024 });
  let reads = 0;
  assert.throws(
    () =>
      encodePackage(bundle, () => {
        reads++;
        return png;
      }),
    /limites do pacote/
  );
  assert.equal(reads, 0);
  db.close();
});
test('recursos não reutilizam IDs de tarefas, e imagem corrompida não é lida como válida', () => {
  const { db, asset } = fixture(),
    bundle = db.bundle();
  bundle.assets[0].id = bundle.tasks.boards[0].id;
  assert.throws(() => validateBundle(bundle));
  writeFileSync(join(db.assetsDirectory, assetName(asset)), 'corrompida');
  assert.throws(() => db.readImage(asset.id), /corrompida|incompleta/);
  db.close();
});
