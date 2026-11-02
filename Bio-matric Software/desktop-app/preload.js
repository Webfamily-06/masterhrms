const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Terminal Hardware Actions
  connectTerminal: (ip, port) => ipcRenderer.invoke('terminal:connect', { ip, port }),
  disconnectTerminal: () => ipcRenderer.invoke('terminal:disconnect'),
  pingTerminal: (ip) => ipcRenderer.invoke('terminal:ping', ip),
  syncClock: () => ipcRenderer.invoke('terminal:sync-clock'),
  rebootTerminal: () => ipcRenderer.invoke('terminal:reboot'),
  testVoice: () => ipcRenderer.invoke('terminal:test-voice'),
  simulatePunch: (emp) => ipcRenderer.invoke('terminal:simulate-punch', emp),

  // Cloud Sync & ADMS
  pushPunchToCloud: (punch) => ipcRenderer.invoke('cloud:push-punch', punch),
  testAdmsHandshake: (sn) => ipcRenderer.invoke('cloud:test-adms', sn),
  getSyncStats: () => ipcRenderer.invoke('cloud:get-stats'),

  // Config Management
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),

  // Window Controls (macOS Traffic lights / frameless actions)
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Real-time Event Listeners
  onLivePunch: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('live:punch', handler);
    return () => ipcRenderer.removeListener('live:punch', handler);
  },
  onTerminalStatusChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal:status', handler);
    return () => ipcRenderer.removeListener('terminal:status', handler);
  }
});
