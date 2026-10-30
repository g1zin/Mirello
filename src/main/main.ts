import { registerVisualIpc } from './visualIpc';
import { encodePackage, decodePackage } from '../data/package';
import { parseVisualDocument, type VisualBundle } from '../shared/visual';
import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu } from 'electron';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from '../data/database';
import { actionSchema, exportData, parseExport, type State } from '../shared/model';
import { demoData } from '../domain/demo';

protocol.registerSchemesAsPrivileged([
  { scheme: 'grello', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
const testDir = process.env.GRELLO_E2E === '1' ? process.env.GRELLO_TEST_DATA : undefined;
app.setPath('userData', testDir || join(app.getPath('appData'), 'Grello'));
if (!app.requestSingleInstanceLock()) {
  app.quit();
}
let win: BrowserWindow | null = null,
  store: Store;
let mayClose = false;
ipcMain.on('grello:close-ready', (event, ok) => {
  if (
    win &&
    event.sender === win.webContents &&
    event.senderFrame === win.webContents.mainFrame &&
    ok === true
  ) {
    mayClose = true;
    win.close();
  }
});
let pending: {
  token: string;
  state: VisualBundle;
  files: Map<string, Uint8Array>;
  expires: number;
} | null = null;
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
function friendly(e: unknown) {
  if (e instanceof z.ZodError)
    return 'Dados inválidos. Confira os campos ou selecione uma exportação compatível do Grello.';
  if (e instanceof SyntaxError) return 'O arquivo não contém um JSON válido.';
  const code = (e as NodeJS.ErrnoException)?.code;
  if (code === 'ENOSPC') return 'O disco está cheio. Libere espaço e tente novamente.';
  if (code === 'EACCES' || code === 'EPERM')
    return 'Não foi possível acessar a pasta. Verifique as permissões.';
  if (code === 'ENOENT') return 'O arquivo ou a pasta não foi encontrado.';
  return e instanceof Error ? e.message : 'Não foi possível concluir a operação.';
}
function handle(channel: string, fn: (...args: any[]) => unknown) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      if (
        !win ||
        event.sender !== win.webContents ||
        event.senderFrame !== win.webContents.mainFrame ||
        event.senderFrame.url !== 'grello://app/index.html'
      )
        throw new Error('Operação não autorizada.');
      return { ok: true, value: await fn(...args) };
    } catch (e) {
      console.error(channel, e);
      return { ok: false, error: friendly(e) };
    }
  });
}
app.whenReady().then(async () => {
  try {
    store = new Store(app.getPath('userData'));
    const renderer = resolve(__dirname, 'renderer');
    protocol.handle('grello', (request) => {
      const url = new URL(request.url),
        file = resolve(renderer, '.' + decodeURIComponent(url.pathname));
      if (url.host !== 'app' || (file !== renderer && !file.startsWith(renderer + sep)))
        return new Response('Acesso negado', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      title: 'Grello',
      width: 1440,
      height: 930,
      minWidth: 960,
      minHeight: 640,
      backgroundColor: '#f5f6f3',
      icon: join(__dirname, '../assets/icon.ico'),
      webPreferences: {
        preload: join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
      },
    });
    win.on('close', (event) => {
      if (!mayClose) {
        event.preventDefault();
        win?.webContents.send('grello:prepare-close');
      }
    });
    const notifyVisibility = () =>
      win?.webContents.send('grello:visibility', win.isVisible() && !win.isMinimized());
    win.on('minimize', notifyVisibility);
    win.on('restore', notifyVisibility);
    win.on('hide', notifyVisibility);
    win.on('show', notifyVisibility);
    win.webContents.on('did-finish-load', notifyVisibility);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.webContents.on('will-attach-webview', (event) => event.preventDefault());
    win.webContents.session.setPermissionRequestHandler((_wc, _p, callback) => callback(false));
    win.webContents.session.setPermissionCheckHandler(() => false);
    registerVisualIpc(handle, store, win);
    win.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, callback) => callback({ cancel: true })
    );
    handle('grello:load', () => store.read());
    handle('grello:dispatch', (raw) => store.dispatch(actionSchema.parse(raw)));
    handle('grello:export', async () => {
      const { filePath, canceled } = await dialog.showSaveDialog(win!, {
        title: 'Exportar meus dados',
        defaultPath: 'Grello-' + new Date().toISOString().slice(0, 10) + '.grello',
        filters: [{ name: 'Pacote completo Grello', extensions: ['grello'] }],
      });
      if (canceled || !filePath) return false;
      await writeFile(
        filePath,
        encodePackage(store.bundle(), (id) => store.readImage(id).bytes)
      );
      return true;
    });
    handle('grello:preview-import', async () => {
      pending = null;
      const { filePaths, canceled } = await dialog.showOpenDialog(win!, {
        title: 'Escolha uma exportação do Grello',
        properties: ['openFile'],
        filters: [{ name: 'Dados Grello', extensions: ['grello', 'json'] }],
      });
      if (canceled) return null;
      const size = (await stat(filePaths[0])).size;
      const isJson = filePaths[0].toLowerCase().endsWith('.json');
      if (size > (isJson ? 25 : 100) * 1024 * 1024)
        throw Error('O arquivo excede o limite: 25 MB para JSON ou 100 MB para pacote.');
      const content = await readFile(filePaths[0]);
      const loaded = isJson
        ? {
            bundle: parseVisualDocument(JSON.parse(content.toString('utf8'))),
            files: new Map<string, Uint8Array>(),
          }
        : decodePackage(content);
      if (isJson && loaded.bundle.assets.length)
        throw Error('Este JSON depende de imagens. Importe o pacote .grello completo.');
      // Decode every package image before presenting a valid preview. The store never accepts remote resources.
      for (const asset of loaded.bundle.assets) {
        const bytes = loaded.files.get(asset.id)!;
        const { nativeImage } = await import('electron');
        if (nativeImage.createFromBuffer(Buffer.from(bytes)).isEmpty())
          throw Error('O pacote contém uma imagem inválida.');
      }
      const state = loaded.bundle;
      pending = {
        token: randomUUID(),
        state,
        files: loaded.files,
        expires: Date.now() + 15 * 60 * 1000,
      };
      return {
        token: pending.token,
        visualBoards: state.visuals.length,
        assets: state.assets.length,
        legacy: isJson && !state.visuals.length,
        boards: state.tasks.boards.length,
        cards: state.tasks.cards.length,
        columns: state.tasks.columns.length,
      };
    });
    handle('grello:import', (token, mode) => {
      z.uuid().parse(token);
      z.enum(['merge', 'replace']).parse(mode);
      if (!pending || pending.token !== token || pending.expires < Date.now())
        throw new Error('Selecione o arquivo novamente para importar.');
      const result = store.importBundle(pending.state, mode, pending.files);
      pending = null;
      return result;
    });
    handle('grello:folder', async (which) => {
      const folder = z.enum(['data', 'backups']).parse(which);
      const error = await shell.openPath(folder === 'backups' ? store.backups : store.directory);
      if (error) throw new Error('Não foi possível abrir a pasta. ' + error);
      return true;
    });
    handle('grello:backup', () => {
      store.backup();
      return true;
    });
    handle('grello:demo', () => store.import(demoData(), 'merge'));
    await win.loadURL('grello://app/index.html');
    win.on('closed', () => {
      win = null;
    });
  } catch (e) {
    dialog.showErrorBox(
      'Não foi possível abrir o Grello',
      friendly(e) + '\nSeus dados não foram apagados.'
    );
    app.quit();
  }
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  if (store) store.close();
});
