import { _electron as electron } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const data = await mkdtemp(join(tmpdir(), 'grello-vertical-'));
await mkdir('test-results', { recursive: true });
let app;
async function launch() {
  app = await electron.launch({
    args: [resolve('.')],
    env: { ...process.env, GRELLO_E2E: '1', GRELLO_TEST_DATA: data },
    timeout: 30000,
  });
  const page = await app.firstWindow();
  page.on('pageerror', (e) => console.error('PAGE ERROR', e));
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  return page;
}
try {
  let p = await launch();
  await p.getByRole('button', { name: 'Criar meu primeiro quadro' }).click();
  await p.getByRole('textbox', { name: 'Nome do quadro' }).fill('Minha semana');
  await p.getByRole('dialog').getByRole('button', { name: 'Criar quadro', exact: true }).click();
  await p.getByRole('heading', { name: 'Minha semana', exact: true }).waitFor();
  await p.getByRole('button', { name: 'Adicionar coluna', exact: true }).click();
  await p.getByRole('textbox', { name: 'Nome da coluna', exact: true }).fill('Ideias');
  await p.getByRole('button', { name: 'Adicionar coluna', exact: true }).click();
  await p.getByRole('textbox', { name: 'Nome da coluna', exact: true }).fill('Fazendo');
  await p.getByRole('button', { name: 'Adicionar coluna', exact: true }).click();
  const col = p.getByRole('region', { name: 'Ideias', exact: true });
  await col.getByRole('button', { name: 'Adicionar cartão', exact: true }).click();
  await col.getByRole('textbox', { name: 'Título do cartão' }).fill('Primeiro passo');
  await col.getByRole('button', { name: 'Adicionar cartão', exact: true }).click();
  await p.getByRole('button', { name: 'Abrir cartão Primeiro passo', exact: true }).click();
  await p.getByLabel('Coluna de destino').selectOption({ label: 'Fazendo' });
  await p.getByRole('button', { name: 'Para o fim', exact: true }).click();
  await p.getByRole('button', { name: 'Concluir edição', exact: true }).click();
  await p
    .getByRole('region', { name: 'Fazendo', exact: true })
    .getByRole('button', { name: 'Abrir cartão Primeiro passo' })
    .waitFor();
  await p.screenshot({ path: 'test-results/vertical.png' });
  await app.close();
  p = await launch();
  await p
    .getByRole('region', { name: 'Fazendo', exact: true })
    .getByRole('button', { name: 'Abrir cartão Primeiro passo' })
    .waitFor();
  const result = await p.evaluate(() => window.grello.load());
  assert(result.ok);
  assert.equal(result.value.state.cards[0].columnId, result.value.state.columns[1].id);
  console.log(
    'PASS: quadro, duas colunas, cartão, movimento e reinício com persistência. SQLite ' + data
  );
  await writeFile('test-results/vertical.json', JSON.stringify({ passed: true, data }, null, 2));
} finally {
  if (app) await app.close();
}
