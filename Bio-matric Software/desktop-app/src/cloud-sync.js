const https = require('https');
const http = require('http');
const { URL } = require('url');
const configManager = require('./config-manager');

class CloudSync {
  constructor() {
    this.offlineQueue = [];
    this.isFlushing = false;
    this.syncStats = {
      totalPushes: 0,
      successfulPushes: 0,
      failedPushes: 0,
      lastPushTime: null,
      lastLatencyMs: 14
    };
  }

  // Push punch event to MasterHRMS backend API
  async pushPunch(punchRecord) {
    const config = configManager.getAll();
    const endpointUrl = `${config.cloudUrl}/api/public/biometric/push`;
    const payload = {
      serialNumber: punchRecord.serialNumber || 'BKR02437198',
      userId: punchRecord.userId,
      employeeCode: punchRecord.empCode,
      name: punchRecord.name,
      timestamp: punchRecord.timestamp,
      verifyMode: punchRecord.verifyMode,
      inOutState: punchRecord.inOutState || 'Check-In',
      location: config.location
    };

    const startTime = Date.now();
    try {
      const response = await this.httpRequest(endpointUrl, 'POST', payload, {
        'Content-Type': 'application/json',
        'x-biometric-key': config.apiKey,
        'User-Agent': 'MasterHRMS-Biometric-Hub/2.5'
      });

      const latency = Date.now() - startTime;
      this.syncStats.totalPushes++;
      this.syncStats.successfulPushes++;
      this.syncStats.lastLatencyMs = latency;
      this.syncStats.lastPushTime = new Date().toISOString();

      return {
        success: true,
        statusCode: response.statusCode,
        latencyMs: latency,
        data: response.body
      };
    } catch (err) {
      console.warn('[CloudSync] Direct push failed, buffering record offline:', err.message);
      this.syncStats.totalPushes++;
      this.syncStats.failedPushes++;
      this.offlineQueue.push(punchRecord);

      return {
        success: false,
        buffered: true,
        queueSize: this.offlineQueue.length,
        error: err.message
      };
    }
  }

  // Flush offline queue when connection is restored
  async flushOfflineQueue() {
    if (this.isFlushing || this.offlineQueue.length === 0) return { count: 0 };
    this.isFlushing = true;
    let flushedCount = 0;

    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue[0];
      const res = await this.pushPunch(item);
      if (res.success) {
        this.offlineQueue.shift();
        flushedCount++;
      } else {
        break; // Stop flushing if still offline
      }
    }

    this.isFlushing = false;
    return { count: flushedCount, remaining: this.offlineQueue.length };
  }

  // Test ADMS Handshake (GET /iclock/cdata?SN=...)
  async testAdmsHandshake(serialNumber) {
    const config = configManager.getAll();
    const sn = serialNumber || 'BKR02437198';
    const testUrl = `${config.cloudUrl}${config.admsPath}/cdata?SN=${encodeURIComponent(sn)}&table=ATTLOG`;

    const startTime = Date.now();
    try {
      const res = await this.httpRequest(testUrl, 'GET', null, {
        'User-Agent': 'iClock-ADMS-Firmware/6.60'
      });
      return {
        success: true,
        statusCode: res.statusCode,
        latencyMs: Date.now() - startTime,
        url: testUrl,
        body: res.body
      };
    } catch (err) {
      return {
        success: false,
        url: testUrl,
        error: err.message
      };
    }
  }

  // Pure Node.js zero-dependency HTTP/HTTPS client
  httpRequest(urlString, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(urlString);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method,
          headers: headers,
          timeout: 6000
        };

        const req = client.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body
            });
          });
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });

        req.on('error', (e) => {
          reject(e);
        });

        if (data) {
          req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  getStats() {
    return {
      ...this.syncStats,
      offlineQueueLength: this.offlineQueue.length
    };
  }
}

module.exports = new CloudSync();

