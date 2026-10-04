import { app, BrowserWindow, ipcMain, Menu, nativeImage, net, protocol, screen, session, systemPreferences, Tray } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defaultSettings, validateSettings } from '../src/desktop-settings.js';
import type { DesktopSettings, CompanionStatus, DesktopCommand } from '../src/desktop-settings.js';

protocol.registerSchemesAsPrivileged([{ scheme: 'movebreak', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.setName('MoveBreak');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
let companion: BrowserWindow;
let settingsWindow: BrowserWindow | undefined;
let tray: Tray;
let settings: DesktopSettings = { ...defaultSettings };
let status: CompanionStatus = { monitoring: false, label: 'Camera not enabled' };
let quitting = false;
const settingsPath = () => join(app.getPath('userData'), 'settings.json');
const broadcast = () => [companion, settingsWindow].forEach((window) => window?.webContents.send('settings:changed', settings));
const command = (value: DesktopCommand) => companion.webContents.send('companion:command', value);
const trusted = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => event.sender === companion?.webContents || event.sender === settingsWindow?.webContents;

const showCompanion = () => {
  settings.showCompanion = true;
  if (companion.isMinimized()) companion.restore();
  companion.show(); broadcast(); refreshTray();
};
const openSettings = () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.show(); settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({ width: 450, height: 710, resizable: false, title: 'MoveBreak Settings', backgroundColor: '#f8f3e8', webPreferences: preferences() });
  void settingsWindow.loadURL('movebreak://app/index.html?surface=settings');
  settingsWindow.on('closed', () => { settingsWindow = undefined; });
  secureWindow(settingsWindow);
  settingsWindow.on('page-title-updated', (event) => event.preventDefault());
};
function preferences() {
  return { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' as const };
}
function secureWindow(window: BrowserWindow) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('movebreak://app/')) event.preventDefault(); });
}
function refreshTray() {
  if (!tray) return;
  const remaining = status.remainingSeconds;
  const next = remaining === undefined ? status.label : remaining >= 60 ? `${Math.ceil(remaining / 60)} min` : `${Math.ceil(remaining)} sec`;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'MoveBreak', enabled: false },
    { label: `Monitoring: ${status.monitoring ? 'On' : 'Off'}`, enabled: false },
    { label: `Next break: ${next}`, enabled: false },
    { type: 'separator' },
    { label: 'Open MoveBreak', click: showCompanion },
    { label: 'Settings…', click: openSettings },
    { label: status.monitoring ? 'Pause monitoring' : 'Resume monitoring', click: () => command(status.monitoring ? 'pause' : 'resume') },
    ...(settings.demoMode ? [{ label: 'Start demo break', enabled: status.monitoring, click: () => { showCompanion(); command('demo-break'); } }] : []),
    { type: 'separator' }, { label: 'Quit MoveBreak', click: () => app.quit() },
  ]));
}
const applySettings = (next: DesktopSettings) => {
  if (next.launchAtLogin !== settings.launchAtLogin && app.isPackaged) app.setLoginItemSettings({ openAtLogin: next.launchAtLogin });
  settings = { ...next, launchAtLogin: app.isPackaged && next.launchAtLogin };
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  companion.setAlwaysOnTop(settings.alwaysOnTop);
  if (settings.showCompanion) { if (companion.isMinimized()) companion.restore(); companion.show(); } else companion.hide();
  broadcast(); command('settings-saved'); refreshTray();
  return settings;
};
const registerIpc = () => {
  ipcMain.on('companion:window', (event, action: unknown) => {
    if (event.sender !== companion.webContents) return;
    if (action === 'hide') companion.close();
    else if (action === 'minimize') companion.minimize();
  });
  ipcMain.handle('settings:get', (event) => { if (trusted(event)) return settings; throw new Error('Untrusted window'); });
  ipcMain.handle('camera:granted', (event) => event.sender === companion.webContents && process.platform === 'darwin' && systemPreferences.getMediaAccessStatus('camera') === 'granted');
  ipcMain.handle('camera:request', async (event) => {
    if (event.sender !== companion.webContents) return false;
    return process.platform !== 'darwin' || await systemPreferences.askForMediaAccess('camera');
  });
  ipcMain.handle('startup:available', (event) => trusted(event) && app.isPackaged);
  ipcMain.handle('settings:save', (event, input: unknown) => {
    if (event.sender !== settingsWindow?.webContents) throw new Error('Settings window required');
    return applySettings(validateSettings(input));
  });
  ipcMain.on('companion:status', (event, input: CompanionStatus) => {
    if (event.sender !== companion.webContents || typeof input?.monitoring !== 'boolean' || typeof input.label !== 'string') return;
    status = { monitoring: input.monitoring, label: input.label.slice(0, 80), remainingSeconds: Number.isFinite(input.remainingSeconds) ? Math.max(0, input.remainingSeconds!) : undefined };
    refreshTray();
  });
};
const registerAssets = () => {
  const root = resolve(__dirname, '../../dist');
  protocol.handle('movebreak', (request) => {
    const url = new URL(request.url);
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (url.hostname !== 'app' || !file.startsWith(root + sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => contents === companion?.webContents && permission === 'media');
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => callback(contents === companion?.webContents && permission === 'media' && ('mediaTypes' in details && details.mediaTypes?.every((type: string) => type === 'video')) === true));
};
const createCompanion = () => {
  const area = screen.getPrimaryDisplay().workArea;
  companion = new BrowserWindow({ width: 320, height: 480, x: area.x + area.width - 340, y: area.y + area.height - 500, frame: false, movable: true, transparent: true, resizable: false, minimizable: true, fullscreenable: false, alwaysOnTop: settings.alwaysOnTop, show: settings.showCompanion, webPreferences: preferences() });
  secureWindow(companion);
  companion.webContents.on('context-menu', () => Menu.buildFromTemplate([{ label: 'Settings…', click: openSettings }]).popup({ window: companion }));
  companion.on('close', (event) => { if (!quitting) { event.preventDefault(); companion.hide(); settings.showCompanion = false; broadcast(); } });
  void companion.loadURL('movebreak://app/index.html');
};
const createTray = () => {
  const icon = nativeImage.createFromPath(join(__dirname, '../../electron/assets/movebreakTemplate.png'));
  if (icon.isEmpty()) throw new Error('MoveBreak tray icon could not load');
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('MoveBreak');
  if (process.platform === 'darwin') tray.setTitle('MoveBreak');
  refreshTray();
};
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (companion) showCompanion(); });
  void app.whenReady().then(() => {
    try { settings = validateSettings(JSON.parse(readFileSync(settingsPath(), 'utf8'))); } catch { settings = { ...defaultSettings }; }
    registerAssets(); createCompanion(); createTray(); registerIpc();
    if (process.platform === 'darwin') app.dock?.setMenu(Menu.buildFromTemplate([{ label: 'Settings…', click: openSettings }, { label: 'Open MoveBreak', click: showCompanion }]));
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'MoveBreak', submenu: [{ label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: openSettings }, { role: 'quit' }] }, { role: 'editMenu' }]));
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => {});
  app.on('activate', () => { if (companion) showCompanion(); });
}
