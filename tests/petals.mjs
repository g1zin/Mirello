import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const data = await mkdtemp(resolve('.tools/petals-e2e-')),
  out = resolve('test-results/petals');
await mkdir(out, { recursive: true });
const packaged = process.env.GRELLO_PACKAGED === '1',
  checks = [],
  samples = [],
  errors = [];
const app = await electron.launch({
  ...(packaged
    ? { executablePath: resolve('release/win-unpacked/Mirello.exe'), args: [] }
    : { args: [resolve('.')] }),
  env: { ...process.env, GRELLO_E2E: '1', GRELLO_TEST_DATA: data },
  timeout: 60000,
});
let page;
const done = (s) => {
  checks.push(s);
  console.log('PASS: ' + s);
};
async function call(method, ...args) {
  const r = await page.evaluate(async ({ method, args }) => window.grello[method](...args), {
    method,
    args,
  });
  assert(r.ok, r.error);
  return r.value;
}
const particleState = () =>
  page.locator('.falling-petal').evaluateAll((es) =>
    es.map((e) => ({
      transform: getComputedStyle(e).transform,
      opacity: getComputedStyle(e).opacity,
      play: getComputedStyle(e).animationPlayState,
      duration: parseFloat(getComputedStyle(e).animationDuration),
      delay: parseFloat(getComputedStyle(e).animationDelay),
      time: e.getAnimations()[0]?.currentTime,
      visibility: getComputedStyle(e).visibility,
    }))
  );
try {
  assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), data);
  page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByText('Meu espaço', { exact: true }).waitFor();
  await page.context().setOffline(true);
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
  }, resolve('docs/importacao/grello-exemplo-visual.json'));
  const preview = await call('previewImport');
  await call('importFile', preview.token, 'merge');
  for (const theme of ['light', 'dark']) {
    await call('dispatch', {
      type: 'settings.update',
      patch: {
        theme,
        visualStyle: 'sky-cherry',
        decorationIntensity: 80,
        decorativeAnimations: true,
      },
    });
    await page.reload();
    await page.getByText('Meu espaço', { exact: true }).waitFor();
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'running');
    const initial = await particleState();
    assert.equal(initial.length, 5);
    assert(
      initial.every(
        (p) => p.duration >= 15 && p.duration <= 25 && p.delay < 0 && p.play === 'running'
      )
    );
    assert(new Set(initial.map((p) => p.duration)).size >= 4);
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(15000);
      const current = await particleState();
      samples.push({ theme, elapsed: (i + 1) * 15, particles: current });
      assert(current.some((p, j) => p.transform !== initial[j].transform));
      console.log('OBSERVAÇÃO: ' + theme + ' ' + (i + 1) * 15 + 's de queda contínua');
      if (i === 2 || i === 5)
        await page.screenshot({ path: join(out, theme + '-' + (i + 1) * 15 + 's.png') });
    }
    const keyframes = await page
      .locator('.falling-petal')
      .first()
      .evaluate((e) => e.getAnimations()[0].effect.getKeyframes());
    assert.equal(Number(keyframes[0].opacity), 0);
    assert.equal(Number(keyframes.at(-1).opacity), 0);
    const geometry = await page.locator('.sidebar').evaluate((e) => ({
      width: e.clientWidth,
      scroll: e.scrollWidth,
      overflow: getComputedStyle(e.querySelector('.falling-petals')).overflow,
      pointer: getComputedStyle(e.querySelector('.falling-petals')).pointerEvents,
    }));
    assert.equal(geometry.width, geometry.scroll);
    assert.equal(geometry.overflow, 'hidden');
    assert.equal(geometry.pointer, 'none');
    done(
      theme +
        ': 90 segundos, mais de três ciclos completos, trajetórias distintas e bordas transparentes'
    );
  }
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  const modal = page.getByRole('dialog').last();
  await modal.getByRole('checkbox', { name: 'Animações decorativas' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
  assert((await particleState()).every((p) => p.play === 'paused' && p.visibility === 'hidden'));
  await modal.getByRole('checkbox', { name: 'Animações decorativas' }).click();
  await modal.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
  assert((await particleState()).every((p) => p.opacity === '0'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'running');
  for (const action of ['minimize', 'hide']) {
    await app.evaluate(
      ({ BrowserWindow }, action) => BrowserWindow.getAllWindows()[0][action](),
      action
    );
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'paused');
    const first = await particleState();
    await page.waitForTimeout(350);
    const second = await particleState();
    // CSS may complete its pending pause on the next frame. Over 350 ms the
    // timeline must stay within one frame, then remain fixed on the next sample.
    assert(second.every((p, i) => Math.abs(p.time - first[i].time) < 40));
    await page.waitForTimeout(150);
    const settled = await particleState();
    assert(settled.every((p, i) => Math.abs(p.time - second[i].time) < 1));
    await app.evaluate(({ BrowserWindow }, action) => {
      const w = BrowserWindow.getAllWindows()[0];
      if (action === 'minimize') w.restore();
      else w.show();
    }, action);
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'running');
  }
  done(
    'Controles funcionam; opção desativada, movimento reduzido, minimização e ocultação interrompem a queda'
  );
  assert.deepEqual(errors, []);
  await writeFile(
    join(out, 'results.json'),
    JSON.stringify({ passed: true, packaged, checks, samples, errors }, null, 2)
  );
} catch (e) {
  await writeFile(
    join(out, 'results.json'),
    JSON.stringify({ passed: false, packaged, checks, error: String(e), errors }, null, 2)
  );
  throw e;
} finally {
  await app.evaluate(({ app }) => app.exit()).catch(() => {});
}
