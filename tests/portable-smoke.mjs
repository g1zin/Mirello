import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const data = await mkdtemp(join(tmpdir(), 'grello-portable-'));
await mkdir('test-results', { recursive: true });
let browser, child;
async function launch() {
  const socket = createServer();
  await new Promise((r) => socket.listen(0, '127.0.0.1', r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  child = spawn(
    resolve('release/Grello-Portatil-1.2.0.exe'),
    ['--remote-debugging-port=' + port, '--remote-debugging-address=127.0.0.1'],
    {
      env: { ...process.env, GRELLO_E2E: '1', GRELLO_TEST_DATA: data },
      windowsHide: true,
      stdio: 'ignore',
    }
  );
  let connected = false;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      if (r.ok) {
        connected = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(connected, 'O portátil não abriu o canal de verificação em 120 segundos.');
  browser = await chromium.connectOverCDP('http://127.0.0.1:' + port);
  let page = browser.contexts()[0].pages()[0];
  if (!page) page = await browser.contexts()[0].waitForEvent('page');
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  await page.context().setOffline(true);
  return page;
}
async function close(page) {
  const exit = new Promise((r) => child.once('exit', r));
  await page.evaluate(() => window.close());
  await exit;
  await browser.close().catch(() => {});
  browser = null;
}
try {
  let page = await launch();
  await page.getByRole('button', { name: 'Criar meu primeiro quadro' }).click();
  await page.getByRole('textbox', { name: 'Nome do quadro' }).fill('Teste portátil');
  await page.getByRole('dialog').getByRole('button', { name: 'Criar quadro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Teste portátil', exact: true })).toBeVisible();
  const result = await page.evaluate(() => window.grello.load());
  assert(result.ok);
  assert.equal(result.value.state.boards[0].title, 'Teste portátil');
  await page.getByRole('tab', { name: 'Quadro visual', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nota', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Nota', exact: true }).click();
  await page
    .getByLabel('Conteúdo da nota', { exact: true })
    .fill('Nota fictícia do portátil offline');
  await page.getByRole('button', { name: 'Adicionar nota', exact: true }).click();
  await page.getByRole('tab', { name: 'Tarefas', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Tarefas', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  const visual = await page.evaluate(async () => {
    const s = await window.grello.load();
    return window.grello.loadVisual(s.value.state.boards[0].id);
  });
  assert(visual.ok);
  assert.equal(visual.value.scene.elements.length, 2);
  await page.screenshot({ path: 'test-results/portatil.png' });
  await close(page);
  page = await launch();
  await expect(page.getByRole('heading', { name: 'Teste portátil', exact: true })).toBeVisible();
  const reopened = await page.evaluate(async () => {
    const s = await window.grello.load();
    return window.grello.loadVisual(s.value.state.boards[0].id);
  });
  assert(reopened.ok);
  assert(
    reopened.value.scene.elements.some(
      (e) => e.originalText === 'Nota fictícia do portátil offline'
    )
  );
  await close(page);
  await writeFile(
    'test-results/portable.json',
    JSON.stringify({ passed: true, data, restarted: true }, null, 2)
  );
  console.log(
    'PASS: portátil inicia offline, cria quadro e nota visual, grava SQLite e preserva após reiniciar.'
  );
} catch (error) {
  await writeFile(
    'test-results/portable.json',
    JSON.stringify({ passed: false, error: String(error), data }, null, 2)
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) {
    const p = browser.contexts()[0]?.pages()[0];
    if (p) await p.evaluate(() => window.close()).catch(() => {});
    await browser.close().catch(() => {});
  }
}
