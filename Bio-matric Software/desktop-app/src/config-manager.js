const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = this.resolveConfigDir();
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaultConfig = {
      terminalIp: '192.168.1.201',
      terminalPort: 4370,
      protocol: 'TCP',
      cloudUrl: 'https://masterhrms.com',
      admsPath: '/iclock',
      apiKey: 'bio_sec_9941a84f5093e800c14b306a',
      organizationId: '104',
      organizationName: 'Acme Global Corporation',
      location: 'Headquarters - Main Entrance (Turnstile #1)',
      pollIntervalSec: 3,
      autoSync: true,
      enableSsl: true,
      offlineQueueLimit: 50000
    };
    this.config = this.loadConfig();
  }

  resolveConfigDir() {
    try {
      // 1. If running inside Electron
      if (process.versions && process.versions.electron) {
        const { app } = require('electron');
        if (app && app.getPath) {
          return app.getPath('userData');
        }
      }
    } catch (_) {}

    // 2. Try project local data directory
    const localDir = path.join(__dirname, '..', 'data');
    try {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      return localDir;
    } catch (_) {}

    // 3. Fallback to tmpdir
    return path.join(os.tmpdir(), 'masterhrms-device-hub');
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf8');
        return { ...this.defaultConfig, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('[ConfigManager] Error reading config file, using defaults:', err.message);
    }
    return { ...this.defaultConfig };
  }

  saveConfig(newConfig) {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
      return { success: true, config: this.config };
    } catch (err) {
      console.error('[ConfigManager] Failed to write config:', err.message);
      return { success: false, error: err.message };
    }
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }
}

module.exports = new ConfigManager();
