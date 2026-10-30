import { dialog, nativeImage, clipboard, type BrowserWindow } from 'electron';
import { basename } from 'node:path';
import { stat, readFile } from 'node:fs/promises';
import { z } from 'zod';
import { Store } from '../data/database';
import { inspectImage } from '../data/images';
import { idSchema } from '../shared/model';
import { visualLimits } from '../shared/visual';
export function registerVisualIpc(
  handle: (name: string, fn: (...args: any[]) => unknown) => void,
  store: Store,
  win: BrowserWindow
) {
  const add = (raw: unknown) => {
    if (!(raw instanceof Uint8Array) || raw.byteLength > visualLimits.storedImageBytes)
      throw Error('Use uma imagem de até 10 MB.');
    inspectImage(raw, undefined, visualLimits.storedImageBytes);
    const image = nativeImage.createFromBuffer(Buffer.from(raw));
    if (image.isEmpty()) throw Error('Não foi possível abrir esta imagem PNG, JPEG ou WebP.');
    // Decode and normalize to remove metadata, active payloads and dependencies on source files.
    const bytes = image.toPNG(),
      asset = inspectImage(bytes, undefined, visualLimits.storedImageBytes);
    return store.addImage(asset, bytes);
  };
  handle('grello:visual-load', (raw) => store.loadVisual(idSchema.parse(raw)));
  handle('grello:visual-save', (raw) => store.saveVisual(raw));
  handle('grello:image-add', add);
  handle('grello:image-pick', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Adicionar imagens ao quadro visual',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled) return [];
    z.array(z.string()).max(20).parse(result.filePaths);
    const assets = [];
    for (const path of result.filePaths) {
      const info = await stat(path);
      if (!info.isFile() || info.size > visualLimits.imageBytes)
        throw Error('Cada imagem deve ter até 10 MB.');
      const bytes = await readFile(path);
      inspectImage(bytes);
      assets.push({ name: basename(path), bytes: new Uint8Array(bytes) });
    }
    return assets;
  });
  handle('grello:image-clipboard', async () => {
    const items = await clipboard.read();
    for (const item of items)
      for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
        if (!item.types.includes(type)) continue;
        const blob = await item.getType(type);
        if (!(blob instanceof Blob) || blob.size > visualLimits.imageBytes)
          throw Error('A imagem da área de transferência excede 10 MB.');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        inspectImage(bytes);
        return { name: 'imagem-colada.' + type.split('/')[1], bytes };
      }
    return null;
  });
  handle('grello:image-read', (raw) => {
    const { asset, bytes } = store.readImage(idSchema.parse(raw));
    return { asset, dataURL: 'data:' + asset.mime + ';base64,' + bytes.toString('base64') };
  });
}
