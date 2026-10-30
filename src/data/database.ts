import {
  emptyScene,
  validateScene,
  validateBundle,
  visualLimits,
  type VisualScene,
  type VisualAsset,
  type VisualBundle,
} from '../shared/visual';
import { mergeVisualBundle } from '../domain/visualMerge';
import { assetName, verifyImage, sha256 } from './images';
import { DatabaseSync } from 'node:sqlite';
import {
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
  lstatSync,
  writeFileSync,
  copyFileSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrate } from './migrations';
import { applyAction } from '../domain/actions';
import { emptyState, validateState, type Action, type State, type Snapshot } from '../shared/model';
export class Store {
  readonly db: DatabaseSync;
  readonly backups: string;
  readonly assetsDirectory: string;
  constructor(readonly directory: string) {
    mkdirSync(directory, { recursive: true });
    this.assetsDirectory = join(directory, 'assets');
    mkdirSync(this.assetsDirectory, { recursive: true });
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
  private write(
    state: State,
    visual?: { scenes: VisualScene[]; assets: VisualAsset[]; replace: boolean }
  ): Snapshot {
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
      if (visual) {
        if (visual.replace) this.db.exec('DELETE FROM visual_scenes; DELETE FROM visual_assets;');
        const sceneInsert = this.db.prepare('INSERT OR REPLACE INTO visual_scenes VALUES (?,?)');
        for (const scene of visual.scenes) sceneInsert.run(scene.boardId, JSON.stringify(scene));
        const assetInsert = this.db.prepare('INSERT OR REPLACE INTO visual_assets VALUES (?,?)');
        for (const asset of visual.assets) assetInsert.run(asset.id, JSON.stringify(asset));
      }
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
  readAssets(): VisualAsset[] {
    return this.db
      .prepare('SELECT data FROM visual_assets ORDER BY rowid')
      .all()
      .map((r) => JSON.parse(r.data as string));
  }
  readScenes(): VisualScene[] {
    return this.db
      .prepare('SELECT data FROM visual_scenes ORDER BY rowid')
      .all()
      .map((r) => JSON.parse(r.data as string));
  }
  bundle(): VisualBundle {
    return validateBundle({
      tasks: this.read().state,
      visuals: this.readScenes(),
      assets: this.readAssets(),
    });
  }
  loadVisual(boardId: string) {
    const tasks = this.read().state;
    if (!tasks.boards.some((b) => b.id === boardId)) throw Error('Quadro não encontrado.');
    const row = this.db.prepare('SELECT data FROM visual_scenes WHERE board_id=?').get(boardId);
    const scene = row
      ? validateScene(JSON.parse(row.data as string), tasks, this.readAssets())
      : emptyScene(boardId);
    const used = new Set(scene.elements.map((e) => e.fileId));
    return { scene, assets: this.readAssets().filter((a) => used.has(a.id)) };
  }
  saveVisual(input: unknown) {
    const scene = validateScene(input, this.read().state, this.readAssets());
    // A single row per debounced scene save; no task deletion/reinsertion on pointer movement.
    this.db
      .prepare('INSERT OR REPLACE INTO visual_scenes VALUES (?,?)')
      .run(scene.boardId, JSON.stringify(scene));
    return true;
  }
  readImage(id: string) {
    const asset = this.readAssets().find((a) => a.id === id);
    if (!asset) throw Error('Imagem local não encontrada.');
    const file = join(this.assetsDirectory, assetName(asset)),
      info = lstatSync(file);
    if (!info.isFile() || info.size !== asset.bytes)
      throw Error('A imagem local está corrompida ou incompleta. Restaure um backup.');
    const bytes = readFileSync(file);
    verifyImage(bytes, asset);
    return { asset, bytes };
  }
  private writeImage(asset: VisualAsset, bytes: Uint8Array) {
    verifyImage(bytes, asset);
    const path = join(this.assetsDirectory, assetName(asset));
    if (existsSync(path)) {
      verifyImage(readFileSync(path), asset);
      return;
    }
    const temp = path + '.' + randomUUID() + '.tmp';
    writeFileSync(temp, bytes, { flag: 'wx' });
    renameSync(temp, path);
  }
  addImage(asset: VisualAsset, bytes: Uint8Array) {
    if (this.readAssets().length >= visualLimits.assets)
      throw Error('Limite de 500 imagens atingido.');
    this.writeImage(asset, bytes);
    this.db.prepare('INSERT INTO visual_assets VALUES (?,?)').run(asset.id, JSON.stringify(asset));
    return asset;
  }
  import(state: State, mode: 'merge' | 'replace') {
    return this.importBundle(
      { tasks: validateState(state), visuals: [], assets: [] },
      mode,
      new Map()
    );
  }
  importBundle(input: VisualBundle, mode: 'merge' | 'replace', files: Map<string, Uint8Array>) {
    const valid = validateBundle(input);
    for (const a of valid.assets) {
      const bytes = files.get(a.id);
      if (!bytes) throw Error('Imagem ausente no pacote.');
      verifyImage(bytes, a);
    }
    const incoming = mode === 'merge' ? mergeVisualBundle(this.read().state, valid) : valid;
    const combinedAssets =
      mode === 'merge' ? [...this.readAssets(), ...incoming.assets] : incoming.assets;
    validateBundle({
      tasks: incoming.tasks,
      visuals: mode === 'merge' ? [...this.readScenes(), ...incoming.visuals] : incoming.visuals,
      assets: combinedAssets,
    });
    // Complete backup must succeed before replacement. Existing immutable images are never overwritten or removed.
    if (mode === 'replace') this.backup('antes-importacao');
    incoming.assets.forEach((asset, i) => this.writeImage(asset, files.get(valid.assets[i].id)!));
    return this.write(incoming.tasks, {
      scenes: incoming.visuals,
      assets: incoming.assets,
      replace: mode === 'replace',
    });
  }
  backup(reason = 'manual'): string {
    const name =
      new Date().toISOString().replace(/[:.]/g, '-') +
      '-' +
      reason +
      '-' +
      randomUUID().slice(0, 8) +
      '.grello-backup';
    const target = join(this.backups, name),
      stage = target + '.incomplete';
    mkdirSync(stage);
    mkdirSync(join(stage, 'assets'));
    this.db.prepare('VACUUM INTO ?').run(join(stage, 'grello.sqlite'));
    const entries = [];
    for (const entry of readdirSync(this.assetsDirectory, { withFileTypes: true })) {
      if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(entry.name)) continue;
      if (!entry.isFile() || entry.isSymbolicLink())
        throw Error('Recurso local inválido para backup.');
      const bytes = readFileSync(join(this.assetsDirectory, entry.name));
      copyFileSync(join(this.assetsDirectory, entry.name), join(stage, 'assets', entry.name));
      entries.push({ path: 'assets/' + entry.name, bytes: bytes.length, sha256: sha256(bytes) });
    }
    const database = readFileSync(join(stage, 'grello.sqlite'));
    writeFileSync(
      join(stage, 'manifest.json'),
      JSON.stringify(
        {
          format: 'grello-backup',
          version: 1,
          database: { path: 'grello.sqlite', bytes: database.length, sha256: sha256(database) },
          assets: entries,
        },
        null,
        2
      ),
      'utf8'
    );
    renameSync(stage, target);
    return target;
  }
  close() {
    this.db.close();
  }
}
