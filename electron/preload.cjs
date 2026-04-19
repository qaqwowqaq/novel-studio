const { clipboard, contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('novelStudio', {
  loadData: () => ipcRenderer.invoke('storage:load'),
  saveData: (data) => ipcRenderer.invoke('storage:save', data),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  readClipboardText: () => Promise.resolve(clipboard.readText()),
  writeClipboardText: (text) => Promise.resolve(clipboard.writeText(text)),
  getCodexStatus: () => ipcRenderer.invoke('codex:status'),
  runCodexPrompt: (payload) => ipcRenderer.invoke('codex:run', payload),
  cancelCodexPrompt: (requestId) => ipcRenderer.invoke('codex:cancel', { requestId }),
  setSecret: (key, value) => ipcRenderer.invoke('secret:set', { key, value }),
  getSecret: (key) => ipcRenderer.invoke('secret:get', { key }),
  deleteSecret: (key) => ipcRenderer.invoke('secret:delete', { key }),
  hasSecret: (key) => ipcRenderer.invoke('secret:has', { key }),
  updaterCheck: () => ipcRenderer.invoke('updater:check'),
  updaterState: () => ipcRenderer.invoke('updater:state'),
  updaterInstall: () => ipcRenderer.invoke('updater:install'),
  openReleasesPage: () => ipcRenderer.invoke('app:openReleases'),
  onUpdaterState: (handler) => {
    const listener = (_e, state) => handler(state);
    ipcRenderer.on('updater:state', listener);
    return () => ipcRenderer.removeListener('updater:state', listener);
  },
});
