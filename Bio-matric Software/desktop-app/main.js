const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const zklib = require('./src/zklib-bridge');
const cloudSync = require('./src/cloud-sync');
const configManager = require('./src/config-manager');

let mainWindow = null;
let tray = null;

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1020,
    minHeight: 700,
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    icon: path.join(__dirname, 'assets', isMac ? 'favicon.ico' : 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'favicon.ico');
  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MasterHRMS Biometric Hub', enabled: false },
      { type: 'separator' },
      { label: 'Show Window', click: () => { if (mainWindow) mainWindow.show(); } },
      { label: 'Simulate Punch', click: () => { zklib.simulatePunch(); } },
      { label: 'Flush Offline Buffer', click: () => { cloudSync.flushOfflineQueue(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('MasterHRMS Biometric Hub v2.5 — Online');
    tray.setContextMenu(contextMenu);
  } catch (e) {
    console.log('[Tray] Tray icon initialization skipped:', e.message);
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // Terminal Connections
  ipcMain.handle('terminal:connect', async (event, { ip, port }) => {
    return await zklib.connect(ip, port);
  });

  ipcMain.handle('terminal:disconnect', () => {
    return zklib.disconnect();
  });

  ipcMain.handle('terminal:ping', async (event, ip) => {
    return await zklib.ping(ip);
  });

  ipcMain.handle('terminal:sync-clock', async () => {
    return await zklib.syncTime();
  });

  ipcMain.handle('terminal:reboot', async () => {
    return await zklib.reboot();
  });

  ipcMain.handle('terminal:test-voice', async () => {
    return await zklib.testVoice();
  });

  ipcMain.handle('terminal:simulate-punch', (event, emp) => {
    return zklib.simulatePunch(emp);
  });

  // Cloud Actions
  ipcMain.handle('cloud:push-punch', async (event, punch) => {
    return await cloudSync.pushPunch(punch);
  });

  ipcMain.handle('cloud:test-adms', async (event, sn) => {
    return await cloudSync.testAdmsHandshake(sn);
  });

  ipcMain.handle('cloud:get-stats', () => {
    return cloudSync.getStats();
  });

  // Config
  ipcMain.handle('config:get', () => {
    return configManager.getAll();
  });

  ipcMain.handle('config:save', (event, newConfig) => {
    return configManager.saveConfig(newConfig);
  });

  // Window Controls
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Auto-Forward live punches to cloud and renderer
  zklib.on('punch', async (punchRecord) => {
    // 1. Send to cloud
    const cloudRes = await cloudSync.pushPunch(punchRecord);
    // 2. Broadcast to renderer UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('live:punch', {
        punch: punchRecord,
        syncResult: cloudRes
      });
    }
  });

  zklib.on('connected', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:status', { connected: true, ...data });
    }
  });

  zklib.on('disconnected', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:status', { connected: false });
    }
  });
}

// App Lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
