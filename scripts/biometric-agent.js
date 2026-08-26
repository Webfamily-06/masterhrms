/**
 * MASTER HRMS & ERP — 24/7 LOCAL BIOMETRIC TCP/IP SYNC EDGE AGENT
 * -----------------------------------------------------------------
 * This lightweight daemon runs on any computer/server inside your office Local Area Network (LAN).
 * It communicates with local biometric machines (ZKTeco, eSSL, Realtime, etc. on Port 4370)
 * using the binary ZK Protocol and continuously pushes real-time punch logs to your Cloud HRMS Server.
 *
 * HOW TO RUN:
 * 1. Configure CLOUD_SERVER_URL and your office device IP addresses below.
 * 2. Run: `node scripts/biometric-agent.js`
 */

const net = require("net");
const http = require("http");
const https = require("https");

const CONFIG = {
  // Cloud Master HRMS Server Endpoint
  cloudServerUrl: process.env.CLOUD_SERVER_URL || "http://localhost:4000/api/public/biometric/push",
  tenantApiKey: process.env.TENANT_API_KEY || "your_tenant_api_key_here",

  // Local Biometric Machines on Office LAN
  devices: [
    {
      name: "Main Office Biometric Clock",
      ip: process.env.DEVICE_IP || "192.168.1.201",
      port: Number(process.env.DEVICE_PORT) || 4370,
      pollIntervalMs: 5000, // Query device every 5 seconds
    },
  ],
};

const COMMANDS = {
  CMD_CONNECT: 1000,
  CMD_EXIT: 1001,
  CMD_ATTLOG_RRQ: 1503,
  CMD_PREPARE_DATA: 1500,
  CMD_DATA: 1501,
  CMD_ACK_OK: 2000,
};

const USHRT_MAX = 65535;

function createHeader(command, checkSum, sessionCode, replyCode, data) {
  const buf = Buffer.alloc(8 + (data ? data.length : 0));
  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(checkSum, 2);
  buf.writeUInt16LE(sessionCode, 4);
  buf.writeUInt16LE(replyCode, 6);
  if (data) data.copy(buf, 8);
  return buf;
}

function createChecksum(packet) {
  let checkSum = 0;
  for (let i = 0; i < packet.length; i += 2) {
    if (i === 2) continue;
    if (i + 1 < packet.length) checkSum += packet.readUInt16LE(i);
    else checkSum += packet[i];
  }
  while (checkSum > USHRT_MAX) {
    checkSum = (checkSum & 0xffff) + (checkSum >> 16);
  }
  return ~checkSum & 0xffff;
}

function wrapTcpPacket(payload) {
  const tcpHeader = Buffer.alloc(8);
  tcpHeader.writeUInt32LE(0x5050827d, 0);
  tcpHeader.writeUInt32LE(payload.length, 4);
  return Buffer.concat([tcpHeader, payload]);
}

function decodeZkTime(timeVal) {
  const second = timeVal % 60;
  timeVal = Math.floor(timeVal / 60);
  const minute = timeVal % 60;
  timeVal = Math.floor(timeVal / 60);
  const hour = timeVal % 24;
  timeVal = Math.floor(timeVal / 24);
  const day = (timeVal % 31) + 1;
  timeVal = Math.floor(timeVal / 31);
  const month = timeVal % 12;
  timeVal = Math.floor(timeVal / 12);
  const year = timeVal + 2000;

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Send punch log securely to Cloud HRMS Server
 */
function pushToCloud(punchData) {
  const payload = JSON.stringify(punchData);
  const isHttps = CONFIG.cloudServerUrl.startsWith("https");
  const client = isHttps ? https : http;

  const url = new URL(CONFIG.cloudServerUrl);
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "x-biometric-key": CONFIG.tenantApiKey,
    },
  };

  const req = client.request(options, (res) => {
    let responseBody = "";
    res.on("data", (chunk) => (responseBody += chunk));
    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[CLOUD SYNC SUCCESS] Staff: ${punchData.employeeCode} | Time: ${punchData.punchTime} | Mode: ${punchData.verificationMode}`);
      } else {
        console.error(`[CLOUD SYNC ERROR] Code ${res.statusCode}: ${responseBody}`);
      }
    });
  });

  req.on("error", (err) => {
    console.error(`[CLOUD NETWORK FAILED] Could not reach cloud server: ${err.message}`);
  });

  req.write(payload);
  req.end();
}

/**
 * Connect to device on LAN Port 4370 and pull unread logs
 */
function pullAndSyncDevice(device) {
  const socket = new net.Socket();
  socket.setTimeout(4000);
  let sessionCode = 0;
  let replyNumber = 0;
  let receivedDataBuffer = Buffer.alloc(0);

  socket.connect(device.port, device.ip, () => {
    let rawPacket = createHeader(COMMANDS.CMD_CONNECT, 0, 0, 0);
    rawPacket.writeUInt16LE(createChecksum(rawPacket), 2);
    socket.write(wrapTcpPacket(rawPacket));
  });

  socket.on("data", (data) => {
    if (data.length < 8) return;

    let payload = data;
    if (data.readUInt32LE(0) === 0x5050827d && data.length >= 16) {
      payload = data.subarray(8);
    }

    const replyCode = payload.readUInt16LE(0);
    sessionCode = payload.readUInt16LE(4);
    replyNumber = payload.readUInt16LE(6);

    if (replyCode === COMMANDS.CMD_ACK_OK && receivedDataBuffer.length === 0) {
      // Send CMD_ATTLOG_RRQ to read device memory
      let reqPacket = createHeader(COMMANDS.CMD_ATTLOG_RRQ, 0, sessionCode, replyNumber);
      reqPacket.writeUInt16LE(createChecksum(reqPacket), 2);
      socket.write(wrapTcpPacket(reqPacket));
      return;
    }

    if (replyCode === COMMANDS.CMD_PREPARE_DATA || replyCode === COMMANDS.CMD_DATA || payload.length > 16) {
      const chunk = payload.length > 16 ? payload.subarray(8) : payload;
      receivedDataBuffer = Buffer.concat([receivedDataBuffer, chunk]);

      const RECORD_SIZE = 40;
      while (receivedDataBuffer.length >= RECORD_SIZE) {
        const recBuf = receivedDataBuffer.subarray(0, RECORD_SIZE);
        receivedDataBuffer = receivedDataBuffer.subarray(RECORD_SIZE);

        try {
          const rawPin = recBuf.subarray(0, 24).toString("utf8").replace(/\0/g, "").trim();
          const verifyType = recBuf.readUInt8(28) || 1;
          const timeInt = recBuf.readUInt32LE(32);

          if (rawPin && timeInt > 0) {
            const punchTime = decodeZkTime(timeInt);
            let verifyModeName = "fingerprint";
            if (verifyType === 15 || verifyType === 20) verifyModeName = "face";
            else if (verifyType === 4 || verifyType === 3) verifyModeName = "rfid";

            pushToCloud({
              employeeCode: rawPin,
              punchTime: punchTime.toISOString(),
              verificationMode: verifyModeName,
              punchType: "auto",
            });
          }
        } catch {}
      }
    }

    if (replyCode === COMMANDS.CMD_ACK_OK && receivedDataBuffer.length === 0) {
      let exitPacket = createHeader(COMMANDS.CMD_EXIT, 0, sessionCode, replyNumber);
      exitPacket.writeUInt16LE(createChecksum(exitPacket), 2);
      socket.write(wrapTcpPacket(exitPacket));
      socket.destroy();
    }
  });

  socket.on("error", (err) => {
    socket.destroy();
  });

  socket.on("timeout", () => {
    socket.destroy();
  });
}

console.log("==========================================================");
console.log("⚡ MASTER HRMS — 24/7 LOCAL BIOMETRIC EDGE GATEWAY ACTIVE");
console.log(`📡 Target Cloud Server: ${CONFIG.cloudServerUrl}`);
console.log(`🔌 Monitoring ${CONFIG.devices.length} Local Devices on Port 4370`);
console.log("==========================================================");

CONFIG.devices.forEach((device) => {
  console.log(`[${device.name}] Polling ${device.ip}:${device.port} every ${device.pollIntervalMs / 1000}s...`);
  pullAndSyncDevice(device);
  setInterval(() => pullAndSyncDevice(device), device.pollIntervalMs);
});

module.exports = { CONFIG, pushToCloud, pullAndSyncDevice };
