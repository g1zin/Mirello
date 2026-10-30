import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const data = await mkdtemp(join(tmpdir(), 'grello-sky-cherry-'));
const output = 'test-results/appearance';
await mkdir(output, { recursive: true });
const packaged = process.env.GRELLO_PACKAGED === '1';
const checks = [],
  errors = [];
let app, page;
const dialog = () => page.getByRole('dialog').last();
const button = (name) => page.getByRole('button', { name, exact: true });
async function launch() {
  app = await electron.launch({
    ...(packaged
      ? { executablePath: resolve('release/win-unpacked/Mirello.exe'), args: [] }
      : { args: [resolve('.')] }),
    env: { ...process.env, GRELLO_E2E: '1', GRELLO_TEST_DATA: data },
    timeout: 60000,
  });
  page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  assert.equal(await page.title(), 'Mirello');
  assert.equal(await app.evaluate(({ app }) => app.getName()), 'Mirello');
  await expect(page.locator('.brand')).toContainText('mirello.');
  await expect(page.locator('.brand-monogram').first()).toBeVisible();
  assert(!(await page.locator('.brand svg.lucide-leaf').count()));
  assert.notEqual(
    await page
      .locator('.brand-monogram')
      .first()
      .evaluate((e) => getComputedStyle(e).maskImage),
    'none'
  );
  await page.context().setOffline(true);
}
async function settings() {
  await button('Configurações').click();
}
async function closeSettings() {
  await dialog().getByRole('button', { name: 'Fechar', exact: true }).click();
}
async function state() {
  const r = await page.evaluate(() => window.grello.load());
  assert(r.ok, r.error);
  return r.value.state;
}
const pass = (s) => {
  checks.push(s);
  console.log('PASS: ' + s);
};
async function selectStyle(style, mode) {
  await settings();
  await dialog()
    .getByRole('button', { name: style === 'original' ? /^Original/ : /^Céu e Cerejeiras/ })
    .click();
  await dialog()
    .getByRole('button', { name: mode === 'light' ? 'Claro' : 'Escuro', exact: true })
    .click();
  await closeSettings();
  await expect(page.locator('html')).toHaveAttribute('data-visual-style', style);
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
}
async function screenshot(name) {
  // Wait for CSS landscape resources to decode, without relying on a fixed animation delay.
  await page.evaluate(async () => {
    const value = getComputedStyle(document.querySelector('.cover-painting')).backgroundImage;
    const match = value.match(/url\(["']?(.*?)["']?\)/);
    if (match) {
      const img = new Image();
      img.src = match[1];
      await img.decode();
    }
  });
  await page.screenshot({ path: output + '/' + name + '.png' });
}
async function assertUsable() {
  const names = ['Pesquisar cartões', 'Filtrar por etiqueta', 'Filtrar por prazo'];
  for (const name of names) {
    const rect = await page.getByLabel(name, { exact: true }).boundingBox(),
      size =
        page.viewportSize() ||
        (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })));
    assert(
      rect &&
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= size.width + 1 &&
        rect.y + rect.height <= size.height + 1,
      'Control clipped: ' + name
    );
  }
  await expect(button('Configurações')).toBeVisible();
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('.card-open'),
      root = getComputedStyle(document.documentElement);
    const luminance = (c) => {
      const rgb = c
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((x) => x / 255)
        .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const text = getComputedStyle(card).color,
      bg = getComputedStyle(card.closest('.card')).backgroundColor,
      a = luminance(text),
      b = luminance(bg);
    return {
      opacity: getComputedStyle(card).opacity,
      contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      font: root.getPropertyValue('--font'),
      decorations: [...document.querySelectorAll('.visual-decoration')].every(
        (el) => getComputedStyle(el).pointerEvents === 'none'
      ),
    };
  });
  assert.equal(metrics.opacity, '1');
  assert(metrics.contrast >= 4.5, 'Insufficient card contrast ' + metrics.contrast);
  assert(metrics.decorations);
  assert(metrics.font.includes('Segoe UI'));
  await page.getByLabel('Pesquisar cartões', { exact: true }).focus();
  const ring = await page.locator('.search').evaluate((e) => getComputedStyle(e).outlineWidth);
  assert.notEqual(ring, '0px');
  await page.getByRole('heading', { name: 'Semana tranquila', exact: true }).click();
}
try {
  await launch();
  await page.evaluate(async () => {
    const send = async (a) => {
      const r = await window.grello.dispatch(a);
      if (!r.ok) throw Error(r.error);
      return r.value.state;
    };
    let s = await send({ type: 'board.create', title: 'Semana tranquila' }),
      b = s.boards[0];
    await send({
      type: 'board.update',
      id: b.id,
      patch: { accent: '#b35b6d', background: '#f8ecee' },
    });
    await send({ type: 'settings.update', patch: { accent: '#b35b6d' } });
    for (const title of ['Ideias', 'Em andamento', 'Concluído'])
      s = await send({ type: 'column.create', boardId: b.id, title });
    s = await send({ type: 'label.create', boardId: b.id, title: 'Pessoal', color: '#b35b6d' });
    s = await send({ type: 'label.create', boardId: b.id, title: 'Bem-estar', color: '#347568' });
    for (const [index, title] of [
      'Preparar a próxima semana',
      'Reservar tempo para ler',
      'Planejar meu próximo projeto',
      'Caminhar ao ar livre',
      'Guardar boas ideias',
    ].entries()) {
      s = await send({
        type: 'card.create',
        columnId: s.columns[index < 2 ? 0 : index < 4 ? 1 : 2].id,
        title,
      });
      s = await send({
        type: 'card.update',
        id: s.cards.at(-1).id,
        patch: {
          description:
            index === 0
              ? 'Três prioridades, um passo de cada vez.'
              : index === 2
                ? 'Anotar ideias e escolher um próximo passo.'
                : '',
          labelIds: [s.labels[index % 2].id],
          completed: index === 4,
          checklist:
            index === 0
              ? [
                  { id: crypto.randomUUID(), title: 'Separar as prioridades', done: true },
                  { id: crypto.randomUUID(), title: 'Reservar espaço para descansar', done: false },
                ]
              : [],
        },
      });
    }
  });
  await page.reload();
  await page.getByRole('heading', { name: 'Semana tranquila', exact: true }).waitFor();
  const baseline = await state();
  assert.equal(baseline.settings.visualStyle, 'original');
  pass('Estilo Original continua padrão e cores existentes permanecem armazenadas');
  for (const style of ['original', 'sky-cherry'])
    for (const mode of ['light', 'dark']) {
      await selectStyle(style, mode);
      await assertUsable();
      if (mode === 'dark') {
        for (const target of [
          page.locator('.card').first(),
          button('Configurações'),
          page.getByLabel('Filtrar por etiqueta', { exact: true }),
        ]) {
          const before = await target.evaluate((e) => ({
            width: e.clientWidth,
            height: e.clientHeight,
          }));
          await target.hover();
          const ring = await target.evaluate((e) => {
            const c = getComputedStyle(e);
            return {
              width: c.outlineWidth,
              offset: c.outlineOffset,
              color: c.outlineColor,
              expected: getComputedStyle(document.documentElement)
                .getPropertyValue('--hover-outline')
                .trim(),
              size: { width: e.clientWidth, height: e.clientHeight },
            };
          });
          assert.equal(ring.width, '1px');
          assert.equal(ring.offset, '-1px');
          assert.notEqual(ring.color, 'rgba(0, 0, 0, 0)');
          assert.deepEqual(ring.size, before);
        }
        await page.locator('.card').first().hover();
        await screenshot((style === 'original' ? 'original' : 'cherry') + '-dark-hover-card');
        await button('Configurações').hover();
        await screenshot((style === 'original' ? 'original' : 'cherry') + '-dark-hover-control');
        await page.keyboard.press('Tab');
        const focusedRing = await page
          .locator(':focus-visible')
          .first()
          .evaluate((e) => getComputedStyle(e).outlineWidth);
        assert.equal(focusedRing, '3px');
      }
      await page.mouse.move(800, 140);
      await screenshot((style === 'original' ? 'original' : 'cherry') + '-' + mode);
      assert.deepEqual((await state()).boards, baseline.boards);
    }
  pass(
    'Original e Céu e Cerejeiras nos dois modos: capturas, controles visíveis, contraste e foco'
  );
  if (process.argv.includes('--preview')) {
    console.log('Preview screenshots ready.');
  } else {
    await selectStyle('sky-cherry', 'light');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].maximize());
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized())
      )
      .toBe(true);
    await assertUsable();
    await screenshot('cherry-light-maximized');
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.unmaximize();
      w.setSize(1060, 740);
    });
    await assertUsable();
    await screenshot('cherry-light-small');
    await selectStyle('sky-cherry', 'dark');
    await assertUsable();
    await screenshot('cherry-dark-small');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 930));
    pass('Janela maximizada e janela menor: busca, filtros e navegação sem cortes');
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.target?.closest('.visual-decoration'))
        .map((a) => ({
          region: a.effect.target.closest('.visual-decoration').dataset.decorationRegion,
          state: a.playState,
        }))
    );
    assert.equal(running.length, 8);
    assert.equal(running.filter((a) => a.region === 'brand').length, 3);
    assert.equal(running.filter((a) => a.region === 'sidebar').length, 5);
    assert(running.every((a) => ['brand', 'sidebar'].includes(a.region) && a.state === 'running'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
    assert.equal(
      await page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.effect?.target?.closest('.visual-decoration'))
            .length
      ),
      0
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'running');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'running');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'running');
    pass(
      'Movimento limitado à marca e à lateral; reduzir movimento, minimizar e ocultar pausam as animações'
    );
    await settings();
    await dialog().getByLabel('Animações decorativas', { exact: true }).uncheck();
    await dialog().getByLabel('Intensidade da decoração', { exact: true }).focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state()).settings.decorationIntensity).toBe(0);
    await screenshot('settings-zero-decoration');
    await closeSettings();
    await expect(page.locator('html')).toHaveAttribute('data-decorations', 'off');
    const cardOpacity = await page
      .locator('.card-open')
      .first()
      .evaluate((e) => getComputedStyle(e).opacity);
    assert.equal(cardOpacity, '1');
    assert(
      await page
        .locator('.visual-decoration')
        .evaluateAll((list) => list.every((e) => getComputedStyle(e).display === 'none'))
    );
    await screenshot('cherry-no-decoration');
    await settings();
    await dialog().getByLabel('Intensidade da decoração', { exact: true }).focus();
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('ArrowRight');
      await expect.poll(async () => (await state()).settings.decorationIntensity).toBe((i + 1) * 5);
      await expect(dialog().getByLabel('Intensidade da decoração', { exact: true })).toHaveValue(
        String((i + 1) * 5)
      );
    }
    await closeSettings();
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
    pass(
      'Intensidade zero remove as camadas, preserva conteúdo opaco; opção de animações desativada'
    );
    const beforeOrder = await state(),
      moved = beforeOrder.cards.find((c) => c.title === 'Reservar tempo para ler'),
      target = beforeOrder.cards.find((c) => c.title === 'Planejar meu próximo projeto');
    await button('Abrir cartão Reservar tempo para ler')
      .locator('..')
      .dragTo(button('Abrir cartão Planejar meu próximo projeto').locator('..'));
    await expect
      .poll(async () => (await state()).cards.find((c) => c.id === moved.id).columnId)
      .toBe(target.columnId);
    await button('Abrir cartão Preparar a próxima semana').click();
    await dialog()
      .getByLabel('Descrição', { exact: true })
      .fill('Minhas prioridades num jardim tranquilo.');
    await screenshot('cherry-details');
    await dialog().getByRole('button', { name: 'Concluir edição', exact: true }).click();
    await page.getByLabel('Pesquisar cartões', { exact: true }).fill('jardim tranquilo');
    await expect(page.locator('.card')).toHaveCount(1);
    await button('Limpar filtros').click();
    await page
      .getByLabel('Filtrar por etiqueta', { exact: true })
      .selectOption({ label: 'Bem-estar' });
    await expect(page.locator('.card')).toHaveCount(2);
    await button('Limpar filtros').click();
    pass(
      'Arrastar, editar detalhes, pesquisar descrição e filtrar etiquetas com a decoração ativa'
    );
    const persisted = await state();
    await app.close();
    await launch();
    assert.deepEqual(await state(), persisted);
    await expect(page.locator('html')).toHaveAttribute('data-visual-style', 'sky-cherry');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
    await settings();
    await dialog()
      .getByRole('button', { name: 'Voltar à aparência original', exact: true })
      .click();
    await closeSettings();
    await expect(page.locator('html')).toHaveAttribute('data-visual-style', 'original');
    assert.deepEqual((await state()).boards, baseline.boards);
    assert.equal((await state()).settings.theme, 'dark');
    assert.equal((await state()).settings.accent, '#b35b6d');
    assert.equal(
      await page
        .locator('.workspace')
        .evaluate((e) => getComputedStyle(e).getPropertyValue('--accent').trim()),
      '#b35b6d'
    );
    pass(
      'Preferências e conteúdo persistem ao reiniciar; voltar ao Original restaura as cores sem alterar modo'
    );
  }
  assert.deepEqual(errors, []);
  await writeFile(
    output + '/results.json',
    JSON.stringify({ passed: true, packaged, data, checks, errors }, null, 2)
  );
  console.log('ALL PASS: ' + checks.length + ' appearance checks.');
} catch (error) {
  console.error(error);
  if (page && !page.isClosed())
    await page.screenshot({ path: output + '/failure.png' }).catch(() => {});
  await writeFile(
    output + '/results.json',
    JSON.stringify({ passed: false, packaged, data, checks, errors, error: String(error) }, null, 2)
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close().catch(() => {});
}
