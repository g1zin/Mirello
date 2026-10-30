import { contextBridge, ipcRenderer } from 'electron';
import type { Bridge } from '../shared/model';
const bridge: Bridge = {
  loadVisual: (id) => ipcRenderer.invoke('grello:visual-load', id),
  saveVisual: (scene) => ipcRenderer.invoke('grello:visual-save', scene),
  pickImages: () => ipcRenderer.invoke('grello:image-pick'),
  addImage: (bytes) => ipcRenderer.invoke('grello:image-add', bytes),
  clipboardImage: () => ipcRenderer.invoke('grello:image-clipboard'),
  readImage: (id) => ipcRenderer.invoke('grello:image-read', id),
  onVisibilityChanged: (callback) => {
    const handler = (_event: unknown, visible: unknown) => {
      if (typeof visible === 'boolean') callback(visible);
    };
    ipcRenderer.on('grello:visibility', handler);
    return () => ipcRenderer.removeListener('grello:visibility', handler);
  },
  onCloseRequested: (callback) => {
    const handler = () => {
      void callback()
        .then((ok) => ipcRenderer.send('grello:close-ready', ok))
        .catch(() => ipcRenderer.send('grello:close-ready', false));
    };
    ipcRenderer.on('grello:prepare-close', handler);
    return () => {
      ipcRenderer.removeListener('grello:prepare-close', handler);
    };
  },
  load: () => ipcRenderer.invoke('grello:load'),
  dispatch: (action) => ipcRenderer.invoke('grello:dispatch', action),
  exportFile: () => ipcRenderer.invoke('grello:export'),
  previewImport: () => ipcRenderer.invoke('grello:preview-import'),
  importFile: (token, mode) => ipcRenderer.invoke('grello:import', token, mode),
  openFolder: (which) => ipcRenderer.invoke('grello:folder', which),
  backup: () => ipcRenderer.invoke('grello:backup'),
  demo: () => ipcRenderer.invoke('grello:demo'),
};
contextBridge.exposeInMainWorld('grello', Object.freeze(bridge));
