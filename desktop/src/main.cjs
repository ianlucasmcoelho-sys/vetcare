const { app, BrowserWindow, ipcMain, protocol, session, Menu, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createClient } = require('./client.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const START_URL = 'app://vetcare/index.html';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'none'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-src 'none'";
if (!app.requestSingleInstanceLock()) app.quit();
else {
  let window;
  const client = createClient({ ...(app.isPackaged ? {} : { origin: process.env.VETCARE_DESKTOP_DEV_ORIGIN || 'https://vetcaresistema.com', development: true }) });
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    protocol.handle('app', async req => {
      const url = new URL(req.url), allowed = { '/index.html': 'text/html', '/app.js': 'text/javascript', '/styles.css': 'text/css' };
      if (url.hostname !== 'vetcare' || !allowed[url.pathname] || req.method !== 'GET') return new Response('', { status: 404 });
      return new Response(await fs.readFile(path.join(__dirname, '../ui', url.pathname.slice(1))), { headers: { 'Content-Type': `${allowed[url.pathname]}; charset=utf-8`, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' } });
    });
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    window = new BrowserWindow({ width: 1320, height: 880, minWidth: 760, minHeight: 600, title: 'VetCare Gestão', backgroundColor: '#f5f7f5', icon: path.join(__dirname, '../assets/icon.ico'),
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, webviewTag: false, devTools: !app.isPackaged, spellcheck: false } });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.on('will-attach-webview', event => event.preventDefault());
    session.defaultSession.on('will-download', (event, item) => {
      if (!item.getURL().startsWith('blob:app://vetcare/')) { event.preventDefault(); return; }
      item.setSaveDialogOptions({ title: 'Salvar relatório VetCare', defaultPath: path.join(app.getPath('documents'), path.basename(item.getFilename())), filters: [{ name: 'Planilha CSV', extensions: ['csv'] }] });
    });
    ipcMain.handle('vetcare:request', (event, route, options) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== START_URL) return { status: 403, data: { error: 'Acesso não autorizado.' } };
      return client.invoke(route, options);
    });
    await window.loadURL(START_URL);
  }).catch(() => { dialog.showErrorBox('VetCare Gestão', 'Não foi possível iniciar o aplicativo. Reinstale a versão atual.'); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
