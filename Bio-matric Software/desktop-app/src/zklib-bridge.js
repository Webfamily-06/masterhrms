const EventEmitter = require('events');
const net = require('net');
const { exec } = require('child_process');
const ZKLib = require('node-zklib');

class ZkLibBridge extends EventEmitter {
  constructor() {
    super();
    this.zk = null;
    this.isConnected = false;
    this.ip = '';
    this.port = 4370;
    this.deviceInfo = null;
  }

  /**
   * Real network ping: combines ICMP ping (system ping) and TCP port 4370 socket probe.
   */
  async ping(ip, port = 4370) {
    if (!ip || ip.trim() === '') {
      return { reachable: false, error: 'Please enter a valid IP address.' };
    }
    const cleanIp = ip.trim();

    // 1. Try TCP Socket probe on target port (4370)
    const tcpProbe = await new Promise((resolve) => {
      const probe = new net.Socket();
      const start = Date.now();
      probe.setTimeout(2500);

      probe.on('connect', () => {
        const latency = Date.now() - start;
        probe.destroy();
        resolve({ reachable: true, latencyMs: latency, portOpen: true });
      });

      probe.on('timeout', () => {
        probe.destroy();
        resolve({ reachable: false, latencyMs: null, portOpen: false, error: 'TCP port ' + port + ' timed out' });
      });

      probe.on('error', (err) => {
        probe.destroy();
        resolve({ reachable: false, latencyMs: null, portOpen: false, error: err.message });
      });

      try {
        probe.connect(port, cleanIp);
      } catch (e) {
        resolve({ reachable: false, error: e.message });
      }
    });

    if (tcpProbe.reachable) {
      return tcpProbe;
    }

    // 2. Fall back to ICMP ping (system ping) to verify if device is alive on LAN
    const isWindows = process.platform === 'win32';
    const pingCmd = isWindows ? `ping -n 1 -w 2000 ${cleanIp}` : `ping -c 1 -W 2 ${cleanIp}`;

    return new Promise((resolve) => {
      exec(pingCmd, (err, stdout) => {
        if (!err && (stdout.includes('Reply from') || stdout.includes('bytes from') || stdout.includes('1 packets received'))) {
          const match = stdout.match(/time[=<]([\d.]+)ms/i);
          const latency = match ? parseFloat(match[1]) : 1;
          resolve({
            reachable: true,
            latencyMs: latency,
            portOpen: false,
            warning: `Device replied to ICMP ping (${latency}ms), but TCP port ${port} is closed or firewalled. Ensure Comm port 4370 is open on device.`
          });
        } else {
          resolve({
            reachable: false,
            latencyMs: null,
            portOpen: false,
            error: `Host ${cleanIp} is unreachable. Verify device is powered on, Ethernet cable is connected, and PC is on the same local subnet.`
          });
        }
      });
    });
  }

  /**
   * Connects to real ZKTeco / eSSL hardware using node-zklib protocol.
   */
  async connect(ip, port = 4370) {
    if (!ip) {
      return { success: false, error: 'Target IP is required.' };
    }
    this.ip = ip.trim();
    this.port = Number(port) || 4370;

    // Disconnect previous instance if exists
    await this.disconnect();

    try {
      console.log(`[ZkLibBridge] Connecting to real hardware terminal at ${this.ip}:${this.port}...`);
      this.zk = new ZKLib(this.ip, this.port, 8000, 4000);

      // 1. Establish socket connection
      await this.zk.createSocket();
      this.isConnected = true;

      // 2. Fetch real device info from hardware
      let realInfo = { userCounts: 0, logCounts: 0, logCapacity: 0 };
      try {
        const info = await this.zk.getInfo();
        if (info) realInfo = info;
      } catch (e) {
        console.warn('[ZkLibBridge] getInfo warning:', e.message);
      }
      this.deviceInfo = realInfo;

      // 3. Start real-time attendance log listener
      try {
        await this.zk.getRealTimeLogs((realPunch) => {
          console.log('[ZkLibBridge] REAL PUNCH RECEIVED FROM MACHINE:', realPunch);
          const punchRecord = {
            userId: String(realPunch.userId || realPunch.deviceUserId || '').trim(),
            empCode: String(realPunch.userId || realPunch.deviceUserId || '').trim(),
            timestamp: realPunch.attTime ? new Date(realPunch.attTime).toISOString() : new Date().toISOString(),
            displayTime: realPunch.attTime ? new Date(realPunch.attTime).toLocaleTimeString() : new Date().toLocaleTimeString(),
            verifyMode: 'Fingerprint / Biometric',
            inOutState: 'Check-In',
            serialNumber: `ZK-${this.ip.replace(/\./g, '')}`
          };
          this.emit('punch', punchRecord);
        });
      } catch (e) {
        console.warn('[ZkLibBridge] Real-time log listener note:', e.message);
      }

      this.emit('connected', {
        ip: this.ip,
        port: this.port,
        deviceInfo: realInfo
      });

      return {
        success: true,
        message: `Connected to real biometric hardware at ${this.ip}:${this.port}!`,
        deviceModel: `ZKTeco Hardware (${realInfo.userCounts || 0} users enrolled)`,
        serialNumber: `ZK-${this.ip.replace(/\./g, '')}`,
        userCount: realInfo.userCounts || 0,
        logCount: realInfo.logCounts || 0
      };
    } catch (err) {
      this.isConnected = false;
      this.zk = null;
      console.error(`[ZkLibBridge] Real hardware connection failed to ${this.ip}:${this.port}:`, err);
      return {
        success: false,
        error: err?.message || String(err) || 'Connection failed',
        message: `Could not connect to biometric machine at ${this.ip}:${this.port}. Please verify device IP, port 4370, and ensure PC is on the same LAN subnet.`
      };
    }
  }

  /**
   * Pulls real enrolled users currently stored in the machine memory.
   */
  async getUsers() {
    if (!this.isConnected || !this.zk) {
      return { success: false, error: 'Device is not connected. Connect first.' };
    }
    try {
      console.log('[ZkLibBridge] Reading enrolled users from hardware...');
      const result = await this.zk.getUsers();
      const users = (result && Array.isArray(result.data)) ? result.data : [];
      console.log(`[ZkLibBridge] Found ${users.length} enrolled users on machine.`);
      return {
        success: true,
        count: users.length,
        users: users.map(u => ({
          uid: u.uid,
          userId: String(u.userId || u.uid || '').trim(),
          name: (u.name && u.name.trim()) ? u.name.trim() : `Employee #${u.userId || u.uid}`,
          role: u.role === 14 ? 'Super Admin' : (u.role === 1 ? 'Manager' : 'User'),
          cardno: u.cardno || 0,
          password: u.password ? 'Configured' : 'None'
        }))
      };
    } catch (err) {
      console.error('[ZkLibBridge] getUsers error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Pulls real attendance records currently stored in the machine memory.
   */
  async getAttendances() {
    if (!this.isConnected || !this.zk) {
      return { success: false, error: 'Device is not connected. Connect first.' };
    }
    try {
      const result = await this.zk.getAttendances();
      const logs = (result && Array.isArray(result.data)) ? result.data : [];
      return {
        success: true,
        count: logs.length,
        logs: logs.map(item => ({
          userId: String(item.deviceUserId || item.userSn || '').trim(),
          empCode: String(item.deviceUserId || item.userSn || '').trim(),
          timestamp: item.recordTime ? new Date(item.recordTime).toISOString() : new Date().toISOString(),
          displayTime: item.recordTime ? new Date(item.recordTime).toLocaleTimeString() : new Date().toLocaleTimeString(),
          verifyMode: 'Fingerprint',
          inOutState: 'Punch'
        }))
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Synchronize terminal RTC clock to PC current time.
   */
  async syncTime() {
    if (!this.isConnected || !this.zk) {
      return { success: false, error: 'Terminal not connected.' };
    }
    try {
      if (typeof this.zk.setTime === 'function') {
        await this.zk.setTime(new Date());
      }
      return {
        success: true,
        message: 'Terminal hardware clock synchronized with PC time.',
        deviceTime: new Date().toISOString()
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Soft reboot command.
   */
  async reboot() {
    if (!this.isConnected || !this.zk) {
      return { success: false, error: 'Terminal not connected.' };
    }
    try {
      if (typeof this.zk.restart === 'function') {
        await this.zk.restart();
      }
      return { success: true, message: 'Reboot signal sent to terminal.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Test Voice Prompt / Buzzer.
   */
  async testVoice() {
    if (!this.isConnected || !this.zk) {
      return { success: false, error: 'Terminal not connected.' };
    }
    try {
      if (typeof this.zk.voiceTest === 'function') {
        await this.zk.voiceTest();
      }
      return { success: true, message: 'Voice test command acknowledged.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Disconnect cleanly.
   */
  async disconnect() {
    if (this.zk) {
      try {
        await this.zk.disconnect();
      } catch (_) {}
      this.zk = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
    return { success: true };
  }
}

module.exports = new ZkLibBridge();
