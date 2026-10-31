const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('vetcareDesktop', Object.freeze({
  request: (path, options) => ipcRenderer.invoke('vetcare:request', path, options)
}));
