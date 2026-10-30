import { unzipSync, strFromU8 } from 'fflate';
import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const data = await mkdtemp(join(tmpdir(), 'grello-e2e-')),
  exportPath = join(data, 'export.grello'),
  invalidPath = join(data, 'invalid.json');
await mkdir('test-results', { recursive: true });
await writeFile(invalidPath, '{"format":"grello","version":999}');
const packaged = process.env.GRELLO_PACKAGED !== '0';
let app,
  p,
  errors = [];
const results = [];
async function launch() {
  app = await electron.launch({
    ...(packaged
      ? { executablePath: resolve('release/win-unpacked/Grello.exe'), args: [] }
      : { args: [resolve('.')] }),
    env: { ...process.env, GRELLO_E2E: '1', GRELLO_TEST_DATA: data },
    timeout: 60000,
  });
  p = await app.firstWindow();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.getByText('Meu espaço', { exact: true }).waitFor();
  await p.context().setOffline(true);
}
const dialog = () => p.getByRole('dialog').last();
const button = (name) => p.getByRole('button', { name, exact: true });
const db = async () => {
  const r = await p.evaluate(() => window.grello.load());
  assert(r.ok, r.error);
  return r.value.state;
};
const done = (message) => {
  results.push(message);
  console.log('PASS: ' + message);
};
async function newBoard(name) {
  await button('Novo quadro').click();
  await dialog().getByRole('textbox', { name: 'Nome do quadro' }).fill(name);
  await dialog().getByRole('button', { name: 'Criar quadro', exact: true }).click();
  await p.getByRole('heading', { name, exact: true }).waitFor();
}
async function newColumn(name) {
  const input = p.getByRole('textbox', { name: 'Nome da coluna', exact: true });
  if (!(await input.count())) await button('Adicionar coluna').click();
  await input.fill(name);
  await button('Adicionar coluna').click();
  await p.getByRole('region', { name, exact: true }).waitFor();
}
async function addCard(column, title) {
  const col = p.getByRole('region', { name: column, exact: true });
  const input = col.getByRole('textbox', { name: 'Título do cartão' });
  if (!(await input.count()))
    await col.getByRole('button', { name: 'Adicionar cartão', exact: true }).click();
  await input.fill(title);
  await col.getByRole('button', { name: 'Adicionar cartão', exact: true }).click();
  await button('Abrir cartão ' + title).waitFor();
}
async function openCard(title) {
  await button('Abrir cartão ' + title).click();
  await dialog().getByLabel('Título do cartão').waitFor();
}
async function closeCard() {
  await dialog().getByRole('button', { name: 'Concluir edição', exact: true }).click();
  await expect(p.getByRole('dialog')).toHaveCount(0);
}
async function settings() {
  await button('Configurações').click();
}
async function importFile(path) {
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
  }, path);
  await button('Importar dados').click();
}
try {
  await launch();
  await p.screenshot({ path: 'test-results/boas-vindas.png' });
  await newBoard('Minha semana');
  for (const c of ['Ideias', 'Em andamento', 'Concluído']) await newColumn(c);
  for (const c of ['Primeiro passo', 'Preparar viagem', 'Ler um livro']) await addCard('Ideias', c);
  done(
    'Criação de quadros, colunas e cartões offline no executável ' +
      (packaged ? 'empacotado' : 'de desenvolvimento')
  );
  const article = (title) => button('Abrir cartão ' + title).locator('..');
  await article('Ler um livro').dragTo(article('Primeiro passo'));
  await expect
    .poll(async () => {
      const s = await db();
      return s.cards.filter((c) => c.columnId === s.columns[0].id).map((c) => c.title);
    })
    .toEqual(['Ler um livro', 'Primeiro passo', 'Preparar viagem']);
  await article('Preparar viagem').dragTo(
    p.getByRole('region', { name: 'Em andamento', exact: true }).locator('.column-empty')
  );
  await expect(
    p
      .getByRole('region', { name: 'Em andamento', exact: true })
      .getByRole('button', { name: 'Abrir cartão Preparar viagem' })
  ).toBeVisible();
  done('Arrastar dentro da coluna e entre colunas altera a ordem persistida');
  await button('Etiquetas').click();
  await dialog().getByLabel('Nome da nova etiqueta').fill('Pessoal');
  await dialog().getByRole('button', { name: 'Criar', exact: true }).click();
  await dialog().getByLabel('Nome da etiqueta Pessoal', { exact: true }).fill('Pessoal e projetos');
  await dialog().getByRole('button', { name: 'Concluir', exact: true }).click();
  await openCard('Primeiro passo');
  await dialog().getByLabel('Título do cartão').fill('Planejar a semana');
  const description =
    'Organização de prioridades. <img src=x onerror="window.HACKED=true">\nTexto local sem execução.';
  await dialog().getByLabel('Descrição', { exact: true }).fill(description);
  await dialog().getByLabel('Prazo', { exact: true }).fill('2020-01-02');
  await dialog().getByText('Pessoal e projetos', { exact: true }).click();
  await dialog().getByLabel('Nova tarefa do checklist').fill('Escolher prioridades');
  await dialog().getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await dialog().getByLabel('Concluir Escolher prioridades').check();
  await dialog().getByLabel('Nova tarefa do checklist').fill('Reservar tempo livre');
  await dialog().getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await closeCard();
  let state = await db(),
    card = state.cards.find((c) => c.title === 'Planejar a semana');
  assert.equal(card.description, description);
  assert.equal(card.checklist.length, 2);
  assert(card.checklist[0].done);
  assert.equal(card.labelIds.length, 1);
  assert.equal(await p.evaluate(() => window.HACKED), undefined);
  await p.getByLabel('Pesquisar cartões').fill('organizacao');
  await expect(p.locator('.card')).toHaveCount(1);
  await button('Limpar filtros').click();
  await p.getByLabel('Filtrar por etiqueta').selectOption({ label: 'Pessoal e projetos' });
  await expect(p.locator('.card')).toHaveCount(1);
  await p.getByLabel('Filtrar por prazo').selectOption('overdue');
  await expect(p.locator('.card')).toHaveCount(1);
  await button('Limpar filtros').click();
  done('Edição, etiquetas, prazo, checklist e busca por descrição sem executar conteúdo');
  await openCard('Planejar a semana');
  await dialog().getByLabel('Marcar como concluído').check();
  await closeCard();
  await p.getByLabel('Filtrar por prazo').selectOption('done');
  await expect(p.locator('.card')).toHaveCount(1);
  await button('Limpar filtros').click();
  await openCard('Planejar a semana');
  await dialog().getByLabel('Coluna de destino').selectOption({ label: 'Concluído' });
  await dialog().getByRole('button', { name: 'Para o fim', exact: true }).click();
  await closeCard();
  done('Conclusão de cartões e movimento por menu');
  await openCard('Planejar a semana');
  await dialog().getByRole('button', { name: 'Duplicar cartão', exact: true }).click();
  await button('Abrir cartão Planejar a semana (cópia)').waitFor();
  await openCard('Planejar a semana (cópia)');
  await dialog().getByRole('button', { name: 'Arquivar cartão', exact: true }).click();
  await button('Itens arquivados').click();
  await dialog().getByRole('button', { name: 'Restaurar', exact: true }).click();
  await dialog().getByRole('button', { name: 'Fechar', exact: true }).click();
  await openCard('Planejar a semana (cópia)');
  await dialog().getByRole('button', { name: 'Excluir permanentemente', exact: true }).click();
  await dialog().getByRole('button', { name: 'Cancelar', exact: true }).click();
  await dialog().getByRole('button', { name: 'Excluir permanentemente', exact: true }).click();
  await dialog().getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(button('Abrir cartão Planejar a semana (cópia)')).toHaveCount(0);
  done('Duplicação, arquivamento/restauração e confirmação de exclusão');
  await button('Opções da coluna Ideias').click();
  await button('Renomear').click();
  await p.getByLabel('Novo nome da coluna').fill('A fazer');
  await button('Salvar nome').click();
  await button('Opções da coluna A fazer').click();
  await button('Mover à direita').click();
  await expect(p.locator('.column').first()).toHaveAttribute('aria-label', 'Em andamento');
  await button('Opções da coluna A fazer').click();
  await button('Excluir coluna…').click();
  await dialog()
    .getByLabel('Destino dos cartões da coluna')
    .selectOption({ label: 'Em andamento' });
  await dialog().getByRole('button', { name: 'Confirmar exclusão da coluna', exact: true }).click();
  await expect(p.getByRole('region', { name: 'A fazer', exact: true })).toHaveCount(0);
  assert.equal((await db()).cards.length, 3);
  done('Renomear, ordenar e excluir coluna transferindo seus cartões');
  await newBoard('Outro projeto');
  await button('Configurações do quadro').click();
  await dialog().getByLabel('Nome do quadro', { exact: true }).fill('Projetos pessoais');
  await dialog().getByRole('button', { name: 'Subir', exact: true }).click();
  await dialog().getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(p.locator('.board-link').first()).toContainText('Projetos pessoais');
  await button('Configurações do quadro').click();
  await dialog().getByRole('button', { name: 'Arquivar quadro', exact: true }).click();
  await dialog().getByRole('button', { name: 'Confirmar', exact: true }).click();
  await button('Itens arquivados').click();
  await dialog().getByRole('button', { name: 'Restaurar quadro', exact: true }).click();
  await dialog().getByRole('button', { name: 'Fechar', exact: true }).click();
  await p
    .getByRole('navigation', { name: 'Meus quadros' })
    .getByRole('button', { name: 'Minha semana' })
    .click();
  done('Renomear, ordenar, arquivar e restaurar quadros');
  await settings();
  await dialog().getByRole('button', { name: 'Escuro', exact: true }).click();
  await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
  await dialog().getByRole('button', { name: 'Fechar', exact: true }).click();
  await p.screenshot({ path: 'test-results/quadro-escuro.png' });
  await settings();
  await dialog().getByRole('button', { name: 'Claro', exact: true }).click();
  await dialog().getByRole('button', { name: 'Fechar', exact: true }).click();
  await button('Configurações do quadro').click();
  await dialog().getByLabel('Destaque #4b65a8', { exact: true }).click();
  await dialog().getByLabel('Fundo #eaf0fa', { exact: true }).click();
  await dialog().getByRole('button', { name: 'Concluir', exact: true }).click();
  await p.screenshot({ path: 'test-results/quadro-claro.png' });
  done('Temas claro/escuro e personalização de cor e fundo');
  const security = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0],
      p = w.webContents.getLastWebPreferences();
    return { node: p.nodeIntegration, isolation: p.contextIsolation, sandbox: p.sandbox };
  });
  assert.deepEqual(security, { node: false, isolation: true, sandbox: true });
  assert.equal(await p.evaluate(() => typeof window.require), 'undefined');
  await p.evaluate(() => window.open('https://example.com'));
  assert.equal(app.windows().length, 1);
  done('Isolamento, sandbox, ausência de Node na interface e bloqueio de novas janelas');
  await settings();
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, exportPath);
  await button('Exportar pacote completo').click();
  await p.getByText('Exportação salva com sucesso.', { exact: true }).waitFor();
  const exported = JSON.parse(strFromU8(unzipSync(await readFile(exportPath))['data.json']));
  assert.deepEqual(exported.data, await db());
  await importFile(invalidPath);
  await expect(p.getByRole('alert').first()).toContainText('Dados inválidos');
  assert.deepEqual(await db(), exported.data);
  await importFile(exportPath);
  await dialog().getByRole('button', { name: 'Mesclar dados', exact: true }).click();
  await expect.poll(async () => (await db()).boards.length).toBe(exported.data.boards.length * 2);
  await importFile(exportPath);
  await dialog().getByRole('button', { name: 'Substituir com backup', exact: true }).click();
  await dialog().getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect.poll(async () => (await db()).boards.length).toBe(exported.data.boards.length);
  assert.deepEqual(await db(), exported.data);
  assert((await readdir(join(data, 'backups'))).some((f) => f.includes('antes-importacao')));
  await dialog().getByRole('button', { name: 'Fechar', exact: true }).click();
  done('Exportação, importação inválida sem alterações, mesclagem e substituição com backup');
  await p
    .getByRole('navigation', { name: 'Meus quadros' })
    .getByRole('button', { name: 'Minha semana' })
    .click();
  await openCard('Planejar a semana');
  await dialog()
    .getByLabel('Descrição', { exact: true })
    .fill('Última edição salva ao fechar a janela.');
  const exited = new Promise((resolve) => app.process().once('exit', resolve));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await exited;
  await launch();
  state = await db();
  assert.equal(
    state.cards.find((c) => c.title === 'Planejar a semana').description,
    'Última edição salva ao fechar a janela.'
  );
  const expected = structuredClone(state);
  await app.close();
  await launch();
  assert.deepEqual(await db(), expected);
  done('Fechar imediatamente após editar e reabrir preserva conteúdo, ordem e preferências');
  assert.deepEqual(errors, []);
  await writeFile(
    'test-results/e2e.json',
    JSON.stringify({ passed: true, packaged, data, checks: results, errors }, null, 2)
  );
  console.log('ALL PASS: ' + results.length + ' cenários; dados isolados em ' + data);
} catch (e) {
  console.error(e);
  if (p && !p.isClosed()) await p.screenshot({ path: 'test-results/falha.png' }).catch(() => {});
  await writeFile(
    'test-results/e2e.json',
    JSON.stringify(
      { passed: false, packaged, data, checks: results, error: String(e), errors },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close().catch(() => {});
}
