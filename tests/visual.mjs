import { _electron as electron, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
const data = await mkdtemp(resolve('.tools/visual-e2e-'));
const output = resolve('test-results/visual');
await mkdir(output, { recursive: true });
const packaged = process.env.GRELLO_PACKAGED === '1';
const errors = [],
  consoleErrors = [],
  remote = [],
  checks = [];
let app, page, boardId, cardId;
const done = (t) => {
  checks.push(t);
  console.log('PASS: ' + t);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const modal = () => page.getByRole('dialog').last();
const bridge = async (method, ...args) => {
  const r = await page.evaluate(async ({ method, args }) => window.grello[method](...args), {
    method,
    args,
  });
  assert(r.ok, r.error);
  return r.value;
};
async function launch() {
  app = await electron.launch({
    ...(packaged
      ? { executablePath: resolve('release/win-unpacked/Grello.exe'), args: [] }
      : { args: [resolve('.')] }),
    env: { ...process.env, GRELLO_E2E: '1', GRELLO_TEST_DATA: data },
    timeout: 60000,
  });
  assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), data);
  page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) remote.push(r.url());
  });
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  await page.context().setOffline(true);
}
async function tab(name) {
  await page.getByRole('tab', { name, exact: true }).click();
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  if (name === 'Quadro visual') await expect(button('Nota')).toBeEnabled();
}
async function flush() {
  await tab('Tarefas');
  const result = await bridge('loadVisual', boardId);
  await tab('Quadro visual');
  return result.scene;
}
async function scene() {
  return (await bridge('loadVisual', boardId)).scene;
}
async function point(x, y) {
  const box = await page.locator('.visual-editor .excalidraw').boundingBox();
  const s = await scene();
  return {
    x: box.x + (x + s.view.scrollX) * s.view.zoom,
    y: box.y + (y + s.view.scrollY) * s.view.zoom,
  };
}
async function drag(from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.mouse.up();
}
async function pick(path) {
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
  }, path);
}
async function exportTo(path) {
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, path);
  assert.equal(await bridge('exportFile'), true);
}
async function preview(path) {
  await pick(path);
  return bridge('previewImport');
}
try {
  await launch();
  await button('Novo quadro').click();
  await modal()
    .getByRole('textbox', { name: 'Nome do quadro' })
    .fill('Catower Defense — referências fictícias');
  await modal().getByRole('button', { name: 'Criar quadro', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Catower Defense — referências fictícias', exact: true })
    .waitFor();
  let state = (await bridge('load')).state;
  boardId = state.boards[0].id;
  state = (await bridge('dispatch', { type: 'column.create', boardId, title: 'Planejamento' }))
    .state;
  state = (
    await bridge('dispatch', {
      type: 'card.create',
      columnId: state.columns[0].id,
      title: 'Definir uma torre de exemplo',
    })
  ).state;
  cardId = state.cards[0].id;
  // The renderer reloads once after fixture seeding; subsequent content creation uses the real editor.
  await page.reload();
  await page
    .getByRole('heading', { name: 'Catower Defense — referências fictícias', exact: true })
    .waitFor();
  await tab('Quadro visual');
  console.log(
    'TOOLS',
    JSON.stringify(
      await page.locator('.excalidraw input[type=radio]').evaluateAll((es) =>
        es.map((e) => ({
          test: e.dataset.testid,
          label: e.getAttribute('aria-label'),
          value: e.value,
        }))
      )
    )
  );
  await button('Nota').click();
  await page
    .getByLabel('Conteúdo da nota')
    .fill('Referência fictícia\nTorres, jardim e caminhos tranquilos');
  await modal().getByRole('button', { name: 'Adicionar nota', exact: true }).click();
  let s = await flush();
  assert.equal(s.elements.filter((e) => !e.isDeleted).length, 2);
  let note = s.elements.find((e) => e.customData?.grelloKind === 'note');
  assert.notEqual(s.elements.find((e) => e.type === 'text').strokeColor, note.backgroundColor);
  let p = await point(note.x + note.width / 2, note.y + note.height - 10);
  await drag(p, { x: p.x - 270, y: p.y - 100 });
  s = await flush();
  note = s.elements.find((e) => e.customData?.grelloKind === 'note');
  await button('Vincular cartão').click();
  await modal().getByRole('textbox', { name: 'Pesquisar cartão' }).fill('torre');
  await modal()
    .getByRole('button', { name: /Definir uma torre de exemplo/ })
    .click();
  s = await flush();
  let ref = s.elements.find((e) => e.customData?.grelloCardId === cardId);
  assert(ref);
  p = await point(ref.x + ref.width / 2, ref.y + ref.height - 8);
  await drag(p, { x: p.x + 190, y: p.y + 70 });
  s = await flush();
  ref = s.elements.find((e) => e.customData?.grelloCardId === cardId);
  done('Nota legível, vínculo pesquisável e persistência ao alternar abas');
  // A real connector is drawn from the note edge to the card-reference edge.
  await page.getByTestId('toolbar-arrow').locator('..').click();
  const start = await point(note.x + note.width, note.y + note.height / 2),
    end = await point(ref.x, ref.y + ref.height / 2);
  await drag(start, end);
  s = await flush();
  let arrow = s.elements.find((e) => e.type === 'arrow' && !e.isDeleted);
  assert(arrow?.startBinding && arrow?.endBinding, 'Conector deve ligar nota e cartão');
  const oldPoints = JSON.stringify(arrow.points);
  p = await point(ref.x + ref.width / 2, ref.y + ref.height - 8);
  await page.getByTestId('toolbar-selection').locator('..').click();
  await drag(p, { x: p.x + 40, y: p.y - 30 });
  s = await flush();
  arrow = s.elements.find((e) => e.id === arrow.id);
  assert.notEqual(JSON.stringify(arrow.points), oldPoints);
  assert(arrow.startBinding && arrow.endBinding);
  done('Conector vinculado acompanha o elemento quando movido');
  await button('Aumentar zoom').click();
  await button('Aumentar zoom').click();
  s = await flush();
  assert(s.view.zoom > 1);
  assert.notEqual(s.view.scrollX, 0);
  // Select the reference and explicitly open the existing task detail panel.
  ref = s.elements.find((e) => e.customData?.grelloCardId === cardId);
  p = await point(ref.x + ref.width / 2, ref.y + ref.height - 8);
  await page.mouse.click(p.x, p.y);
  await button('Abrir cartão').click();
  const beforeView = s.view;
  await modal().getByLabel('Título do cartão', { exact: true }).fill('Torre de exemplo revisada');
  await modal().getByRole('checkbox', { name: 'Marcar como concluído' }).check();
  await modal().getByRole('button', { name: 'Fechar', exact: true }).click();
  s = await flush();
  assert.deepEqual(s.view, beforeView);
  assert(
    s.elements.some(
      (e) =>
        e.type === 'text' &&
        e.originalText?.includes('Torre de exemplo revisada') &&
        e.originalText?.includes('Concluído')
    )
  );
  done(
    'Detalhes existentes editam a tarefa original e atualizam a referência sem mudar o viewport'
  );
  // This JSON example has no images and can be imported on its own.
  await flush();
  const noImagePackage = join(data, 'without-images.grello');
  await exportTo(noImagePackage);
  await mkdir('docs/importacao', { recursive: true });
  const entries = unzipSync(await readFile(noImagePackage));
  await writeFile(
    'docs/importacao/grello-exemplo-visual.json',
    JSON.stringify(JSON.parse(strFromU8(entries['data.json'])), null, 2) + '\n'
  );
  // Locally generated fictitious image fixtures, with no network or real user files.
  const fixtures = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 330;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#dceaf4';
    ctx.fillRect(0, 0, 600, 330);
    ctx.fillStyle = '#8da77b';
    ctx.beginPath();
    ctx.ellipse(300, 330, 380, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e6a8bb';
    for (const [x, y, r] of [
      [90, 130, 65],
      [500, 115, 80],
      [430, 170, 50],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#365347';
    ctx.font = '22px sans-serif';
    ctx.fillText('Jardim imaginário · referência fictícia', 85, 290);
    return Object.fromEntries(
      ['png', 'jpeg', 'webp'].map((type) => [type, c.toDataURL('image/' + type)])
    );
  });
  const paths = {};
  for (const [type, url] of Object.entries(fixtures)) {
    paths[type] = join(data, 'original.' + (type === 'jpeg' ? 'jpg' : type));
    await writeFile(paths[type], Buffer.from(url.split(',')[1], 'base64'));
  }
  await pick(paths.png);
  await button('Imagem').click();
  await expect
    .poll(
      async () => (await flush()).elements.filter((e) => e.type === 'image' && !e.isDeleted).length
    )
    .toBe(1);
  s = await scene();
  let image = s.elements.find((e) => e.type === 'image' && !e.isDeleted);
  p = await point(image.x + image.width / 2, image.y + image.height / 2);
  await drag(p, { x: p.x - 100, y: p.y + 80 });
  s = await flush();
  image = s.elements.find((e) => e.id === image.id);
  // Resize with the editor's default corner handle; images preserve aspect ratio without Shift.
  p = await point(image.x + image.width, image.y + image.height);
  await drag(p, { x: p.x - 60, y: p.y - 20 });
  s = await flush();
  image = s.elements.find((e) => e.id === image.id);
  assert(Math.abs(image.width / image.height - 600 / 330) < 0.03);
  // Drop a real File payload; paths are deliberately not exposed to the renderer.
  const dropBytes = Array.from(await readFile(paths.jpeg));
  const drop = await page.evaluateHandle((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], 'jardim.jpg', { type: 'image/jpeg' }));
    return dt;
  }, dropBytes);
  await page
    .locator('.visual-editor')
    .dispatchEvent('drop', { dataTransfer: drop, clientX: 550, clientY: 560 });
  await drop.dispose();
  await expect
    .poll(
      async () => (await flush()).elements.filter((e) => e.type === 'image' && !e.isDeleted).length
    )
    .toBe(2);
  // Model the system clipboard with a fictitious image in this isolated test process only.
  await app.evaluate(
    ({ clipboard, ClipboardItem }, bytes) => {
      clipboard.read = async () => [
        new ClipboardItem({
          'image/webp': new Blob([new Uint8Array(bytes)], { type: 'image/webp' }),
        }),
      ];
    },
    Array.from(await readFile(paths.webp))
  );
  await button('Colar imagem').click();
  await expect
    .poll(
      async () => (await flush()).elements.filter((e) => e.type === 'image' && !e.isDeleted).length
    )
    .toBe(3);
  // WebP accepted by the same file picker and validation path.
  await pick(paths.webp);
  await button('Imagem').click();
  await expect
    .poll(
      async () => (await flush()).elements.filter((e) => e.type === 'image' && !e.isDeleted).length
    )
    .toBe(4);
  s = await scene();
  image = s.elements.filter((e) => e.type === 'image' && !e.isDeleted).at(-1);
  p = await point(image.x + image.width / 2, image.y + image.height / 2);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.press('Delete');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+Shift+z');
  await page.keyboard.press('Control+z');
  s = await flush();
  assert(s.elements.some((e) => e.id === image.id && !e.isDeleted));
  assert((await bridge('readImage', image.fileId)).dataURL.startsWith('data:image/png;base64,'));
  for (const path of Object.values(paths)) await unlink(path);
  done('PNG/JPEG/WebP, seleção, arraste, colagem isolada, proporção e desfazer/refazer de imagem');
  // Pan, zoom and restart immediately after a freehand gesture, without waiting for debounce.
  await page.getByTestId('toolbar-freedraw').locator('..').click();
  const box = await page.locator('.visual-editor').boundingBox();
  await drag(
    { x: box.x + box.width - 160, y: box.y + 90 },
    { x: box.x + box.width - 70, y: box.y + 180 }
  );
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await expect.poll(() => app.windows().length).toBe(0);
  await app.close();
  app = null;
  await launch();
  await tab('Quadro visual');
  s = await flush();
  assert(s.elements.some((e) => e.type === 'freedraw' && !e.isDeleted));
  assert.equal(s.elements.filter((e) => e.type === 'image' && !e.isDeleted).length, 4);
  for (const e of s.elements.filter((e) => e.type === 'image'))
    assert((await bridge('readImage', e.fileId)).dataURL);
  done(
    'Desenhar e fechar imediatamente; reabertura com imagens independentes dos arquivos originais'
  );
  // Card archive/delete keeps the visual reference and makes missing originals explicit.
  await tab('Tarefas');
  await bridge('dispatch', { type: 'card.archive', id: cardId, archived: true });
  await page.reload();
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  await tab('Quadro visual');
  s = await flush();
  assert(s.elements.some((e) => e.originalText?.includes('Arquivado')));
  await tab('Tarefas');
  await bridge('dispatch', { type: 'card.delete', id: cardId });
  await page.reload();
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  await tab('Quadro visual');
  s = await flush();
  assert(s.elements.some((e) => e.originalText?.includes('Cartão indisponível')));
  // Restore the fictitious task from the JSON example for the distributable reference package.
  const example = JSON.parse(await readFile('docs/importacao/grello-exemplo-visual.json', 'utf8'));
  const importedCard = example.data.cards[0];
  await tab('Tarefas');
  let recreated = (
    await bridge('dispatch', {
      type: 'card.create',
      columnId: importedCard.columnId,
      title: importedCard.title,
    })
  ).state.cards.at(-1);
  await bridge('dispatch', {
    type: 'card.update',
    id: recreated.id,
    patch: { completed: true, description: 'Tarefa fictícia para demonstrar referências visuais.' },
  });
  let updated = await bridge('loadVisual', boardId);
  for (const e of updated.scene.elements)
    if (e.customData?.grelloCardId === cardId) {
      e.customData.grelloCardId = recreated.id;
      e.link = 'grello-card:' + recreated.id;
    }
  await bridge('saveVisual', updated.scene);
  cardId = recreated.id;
  await page.reload();
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  await tab('Quadro visual');
  await flush();
  // Arrange only the fictitious fixture for useful, uncluttered screenshots.
  await tab('Tarefas');
  const layout = await bridge('loadVisual', boardId),
    elements = layout.scene.elements;
  const move = (container, x, y) => {
    const dx = x - container.x,
      dy = y - container.y;
    container.x = x;
    container.y = y;
    for (const child of elements.filter((e) => e.containerId === container.id)) {
      child.x += dx;
      child.y += dy;
    }
  };
  move(
    elements.find((e) => e.customData?.grelloKind === 'note'),
    90,
    80
  );
  move(
    elements.find((e) => e.customData?.grelloCardId),
    700,
    95
  );
  let firstImage = true;
  for (const e of elements.filter((e) => e.type === 'image')) {
    if (firstImage) {
      e.x = 90;
      e.y = 340;
      e.width = 560;
      e.height = 308;
      firstImage = false;
    } else e.isDeleted = true;
  }
  const connector = elements.find((e) => e.type === 'arrow');
  connector.x = 340;
  connector.y = 175;
  connector.points = [
    [0, 0],
    [360, -5],
  ];
  connector.width = 360;
  connector.height = 5;
  for (const e of elements.filter((e) => e.type === 'freedraw')) {
    e.x = 800;
    e.y = 370;
  }
  layout.scene.view = { scrollX: 0, scrollY: 0, zoom: 0.8 };
  await bridge('saveVisual', layout.scene);
  await tab('Quadro visual');
  await flush();
  const packagePath = resolve('docs/importacao/grello-exemplo-visual.grello');
  await exportTo(packagePath);
  const before = (await bridge('load')).state,
    oldScene = await scene();
  let result = await preview(packagePath);
  await bridge('importFile', result.token, 'merge');
  state = (await bridge('load')).state;
  const incoming = state.boards.at(-1),
    incomingScene = (await bridge('loadVisual', incoming.id)).scene;
  const importedRef = incomingScene.elements.find((e) => e.customData?.grelloCardId);
  assert.equal(importedRef.customData.grelloCardId, state.cards.at(-1).id);
  assert.notEqual(importedRef.customData.grelloCardId, cardId);
  assert.notEqual(
    incomingScene.elements.find((e) => e.type === 'image').fileId,
    oldScene.elements.find((e) => e.type === 'image').fileId
  );
  assert.deepEqual(state.settings, before.settings);
  const invalid = join(data, 'invalid.grello');
  await writeFile(invalid, Buffer.from('not a zip'));
  await pick(invalid);
  const invalidResult = await page.evaluate(() => window.grello.previewImport());
  assert.equal(invalidResult.ok, false);
  assert.deepEqual((await bridge('load')).state, state);
  done(
    'Exportação e mesclagem pelo IPC real, imagens remapeadas, cartões vinculados e pacote inválido sem alteração'
  );
  // Original JSON remains accepted without changing the existing visual document.
  result = await preview(resolve('docs/importacao/grello-exemplo.json'));
  const previousVisual = await scene();
  await bridge('importFile', result.token, 'merge');
  assert.deepEqual(await scene(), previousVisual);
  state = (await bridge('load')).state;
  assert.equal((await bridge('loadVisual', state.boards.at(-1).id)).scene.elements.length, 0);
  done('JSON 1.1.1/formato 2 importado com quadro visual vazio e sem perda das tarefas existentes');
  // Capture both visual styles and modes with fictional content.
  await tab('Tarefas');
  for (const b of state.boards.filter((b) => b.id !== boardId))
    await bridge('dispatch', { type: 'board.update', id: b.id, patch: { archived: true } });
  for (const visualStyle of ['original', 'sky-cherry'])
    for (const theme of ['light', 'dark']) {
      await tab('Tarefas');
      await bridge('dispatch', { type: 'settings.update', patch: { visualStyle, theme } });
      await page.reload();
      await page.getByText('Meu espaço', { exact: true }).waitFor();
      await tab('Quadro visual');
      await button('Enquadrar todo o conteúdo').click();
      await flush();
      await expect(page.locator('.visual-save')).toContainText('Quadro salvo');
      await page.screenshot({ path: join(output, visualStyle + '-' + theme + '.png') });
    }
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 720));
  await page.screenshot({ path: join(output, 'janela-menor.png') });
  assert((await page.locator('.visual-editor').boundingBox()).width > 500);
  const security = await app.evaluate(({ BrowserWindow }) => {
    const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { sandbox: p.sandbox, node: p.nodeIntegration, isolation: p.contextIsolation };
  });
  assert.deepEqual(security, { sandbox: true, node: false, isolation: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(remote, []);
  done('Temas, janela menor, sandbox e execução offline sem solicitações remotas');
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify({ passed: true, packaged, checks, errors, consoleErrors, remote }, null, 2)
  );
} catch (e) {
  if (page && !page.isClosed())
    await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
  console.error('PAGE ERRORS', errors, 'CONSOLE ERRORS', consoleErrors.slice(0, 5));
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify(
      { passed: false, packaged, checks, error: String(e), errors, consoleErrors, remote },
      null,
      2
    )
  );
  throw e;
} finally {
  if (app) await app.evaluate(({ app }) => app.exit()).catch(() => {});
}
