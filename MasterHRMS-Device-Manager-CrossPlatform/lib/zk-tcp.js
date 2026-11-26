"use strict";
const net = require("net");

const USHRT_MAX = 65535;
const TCP_HEADER = Buffer.from([0x50, 0x50, 0x82, 0x7d]);

const CMD = {
  CONNECT: 1000,
  EXIT: 1001,
  ENABLEDEVICE: 1002,
  DISABLEDEVICE: 1003,
  RESTART: 1004,
  ACK_OK: 2000,
  ACK_ERROR: 2001,
  ACK_DATA: 2002,
  ACK_UNAUTH: 2005,
  PREPARE_DATA: 1500,
  DATA: 1501,
  FREE_DATA: 1502,
  DATA_WRRQ: 1503,
  DATA_RDY: 1504,
  OPTIONS_RRQ: 11,
  OPTIONS_WRQ: 12,
  ATTLOG_RRQ: 13,
  USERTEMP_RRQ: 9,
  GET_TIME: 201,
  SET_TIME: 202,
  GET_VERSION: 1100,
  GET_FREE_SIZES: 50,
};

function createChecksum(buf) {
  let chksum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i === buf.length - 1) {
      chksum += buf[i];
    } else {
      chksum += buf.readUInt16LE(i);
    }
    chksum %= USHRT_MAX;
  }
  chksum = USHRT_MAX - chksum - 1;
  return chksum < 0 ? chksum + USHRT_MAX : chksum;
}

function createTcpPacket(command, sessionId, replyId, data = Buffer.alloc(0)) {
  const payload = Buffer.alloc(8 + data.length);
  payload.writeUInt16LE(command, 0);
  payload.writeUInt16LE(0, 2);
  payload.writeUInt16LE(sessionId, 4);
  payload.writeUInt16LE(replyId, 6);
  if (data.length > 0) data.copy(payload, 8);
  const checksum = createChecksum(payload);
  payload.writeUInt16LE(checksum, 2);

  const nextReplyId = (replyId + 1) % USHRT_MAX;
  payload.writeUInt16LE(nextReplyId, 6);

  const packet = Buffer.alloc(8 + payload.length);
  TCP_HEADER.copy(packet, 0);
  packet.writeUInt32LE(payload.length, 4);
  payload.copy(packet, 8);
  return { packet, nextReplyId };
}

function decodeZkTime(t) {
  const second = t % 60;
  t = Math.floor(t / 60);
  const minute = t % 60;
  t = Math.floor(t / 60);
  const hour = t % 24;
  t = Math.floor(t / 24);
  const day = (t % 31) + 1;
  t = Math.floor(t / 31);
  const month = (t % 12) + 1;
  t = Math.floor(t / 12);
  const year = t + 2000;
  return new Date(year, month - 1, day, hour, minute, second);
}

function encodeZkTime(d) {
  return (
    (((d.getFullYear() - 2000) * 12 * 31 +
      d.getMonth() * 31 +
      (d.getDate() - 1)) *
      24 *
      60 *
      60) +
    (d.getHours() * 60 + d.getMinutes()) * 60 +
    d.getSeconds()
  );
}

function decodeVerifyMode(code) {
  if (code === 0 || code === 3) return "pin";
  if (code === 2 || code === 4) return "rfid";
  if (code === 15 || code === 25) return "face";
  return "fingerprint";
}

function decodePunchType(code) {
  if (code === 0) return "check_in";
  if (code === 1) return "check_out";
  return "auto";
}

class ZkTcpClient {
  constructor(ip, port = 4370, timeoutMs = 8000) {
    this.ip = String(ip || "").trim();
    this.port = Number(port) || 4370;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.sessionId = 0;
    this.replyId = 0;
    this._recvBuf = Buffer.alloc(0);
    this._pendingResolve = null;
    this._pendingReject = null;
    this._pendingTimer = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const sock = new net.Socket();
      this.socket = sock;
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          sock.destroy();
          reject(new Error(`Connection timed out (${this.ip}:${this.port})`));
        }
      }, this.timeoutMs);

      sock.on("data", (chunk) => {
        this._recvBuf = Buffer.concat([this._recvBuf, chunk]);
        this._tryDeliverPacket();
      });

      sock.on("error", (err) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new Error(`TCP error (${this.ip}:${this.port}): ${err.message}`));
        } else if (this._pendingReject) {
          const rej = this._pendingReject;
          this._clearPending();
          rej(err);
        }
      });

      sock.connect(this.port, this.ip, async () => {
        clearTimeout(timer);
        try {
          this.sessionId = 0;
          this.replyId = USHRT_MAX - 1;
          const res = await this._executeCmd(CMD.CONNECT);
          if (res.command === CMD.ACK_OK || res.command === CMD.ACK_UNAUTH) {
            this.sessionId = res.sessionId;
            settled = true;
            resolve(true);
          } else {
            settled = true;
            reject(new Error(`Device rejected connection (code ${res.command})`));
          }
        } catch (err) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  _clearPending() {
    if (this._pendingTimer) clearTimeout(this._pendingTimer);
    this._pendingTimer = null;
    this._pendingResolve = null;
    this._pendingReject = null;
  }

  _tryDeliverPacket() {
    if (!this._pendingResolve) return;
    while (this._recvBuf.length >= 16) {
      const idx = this._recvBuf.indexOf(TCP_HEADER);
      if (idx === -1) {
        this._recvBuf = Buffer.alloc(0);
        return;
      }
      if (idx > 0) this._recvBuf = this._recvBuf.subarray(idx);
      if (this._recvBuf.length < 8) return;

      const payloadLen = this._recvBuf.readUInt32LE(4);
      if (this._recvBuf.length < 8 + payloadLen) return;

      const payload = this._recvBuf.subarray(8, 8 + payloadLen);
      this._recvBuf = this._recvBuf.subarray(8 + payloadLen);

      const command = payload.readUInt16LE(0);
      const sessionId = payload.readUInt16LE(4);
      const replyId = payload.readUInt16LE(6);
      const data = payload.subarray(8);

      const res = this._pendingResolve;
      this._clearPending();
      res({ command, sessionId, replyId, data });
      return;
    }
  }

  _waitPacket(timeoutMs = this.timeoutMs) {
    return new Promise((resolve, reject) => {
      this._pendingResolve = resolve;
      this._pendingReject = reject;
      this._pendingTimer = setTimeout(() => {
        this._clearPending();
        reject(new Error("Device response timed out"));
      }, timeoutMs);
      this._tryDeliverPacket();
    });
  }

  async _executeCmd(command, data = Buffer.alloc(0), timeoutMs = this.timeoutMs) {
    const { packet, nextReplyId } = createTcpPacket(command, this.sessionId, this.replyId, data);
    this.replyId = nextReplyId;
    this.socket.write(packet);
    return await this._waitPacket(timeoutMs);
  }

  async disconnect() {
    try {
      if (this.socket && !this.socket.destroyed) {
        await this._executeCmd(CMD.EXIT, Buffer.alloc(0), 1500).catch(() => {});
        this.socket.destroy();
      }
    } catch {}
  }

  async getOption(key) {
    try {
      const res = await this._executeCmd(CMD.OPTIONS_RRQ, Buffer.from(key + "\0", "ascii"));
      if (res.command !== CMD.ACK_OK && res.command !== CMD.ACK_DATA) return "";
      const raw = res.data.toString("ascii").replace(/\0/g, "").trim();
      const eq = raw.indexOf("=");
      return eq >= 0 ? raw.slice(eq + 1).trim() : raw;
    } catch {
      return "";
    }
  }

  async setOption(key, value) {
    const res = await this._executeCmd(CMD.OPTIONS_WRQ, Buffer.from(`${key}=${value}\0`, "ascii"));
    return res.command === CMD.ACK_OK;
  }

  async getFirmwareVersion() {
    try {
      const res = await this._executeCmd(CMD.GET_VERSION);
      return res.data.toString("ascii").replace(/\0/g, "").trim();
    } catch {
      return "";
    }
  }

  async getDeviceTime() {
    const res = await this._executeCmd(CMD.GET_TIME);
    if (res.data.length < 4) throw new Error("Invalid time payload");
    return decodeZkTime(res.data.readUInt32LE(0));
  }

  async setDeviceTime(date = new Date()) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(encodeZkTime(date), 0);
    const res = await this._executeCmd(CMD.SET_TIME, buf);
    return res.command === CMD.ACK_OK;
  }

  async restartDevice() {
    const res = await this._executeCmd(CMD.RESTART, Buffer.alloc(0), 3000);
    return res.command === CMD.ACK_OK;
  }

  async getCommSettings() {
    const serialNumber = await this.getOption("~SerialNumber");
    const firmwareVersion = await this.getFirmwareVersion();
    const mac = await this.getOption("MAC");
    const platform = await this.getOption("~Platform");
    const ipAddress = await this.getOption("IPAddress");
    const netMask = await this.getOption("NetMask");
    const gateway = await this.getOption("GATEIPAddress");
    const dns = await this.getOption("DNS");
    const dhcp = await this.getOption("DHCP");
    const tcpPort = await this.getOption("TCPPort");
    const admsUrl = await this.getOption("ICLOCKSVRURL");
    const admsPort = await this.getOption("IclockSvrPort");
    const pushTable = await this.getOption("PushTableDesc");
    const suffixDesc = await this.getOption("suffixDesc");
    return {
      serialNumber,
      firmwareVersion,
      mac,
      platform,
      ipAddress: ipAddress || this.ip,
      netMask,
      gateway,
      dns,
      dhcp,
      tcpPort,
      admsUrl,
      admsPort,
      pushTable,
      suffixDesc,
    };
  }

  async _readLargeData(reqHeaderBuf) {
    const res = await this._executeCmd(CMD.DATA_WRRQ, reqHeaderBuf, 15000);
    if (res.command === CMD.ACK_DATA) {
      return res.data;
    }
    if (res.command !== CMD.ACK_OK) {
      return Buffer.alloc(0);
    }

    const totalSize = res.data.length >= 5 ? res.data.readUInt32LE(1) : 0;
    if (!totalSize) return Buffer.alloc(0);

    const chunks = [];
    let received = 0;
    const MAX_CHUNK = 0xffc0;

    while (received < totalSize) {
      const remain = Math.min(MAX_CHUNK, totalSize - received);
      const req = Buffer.alloc(8);
      req.writeUInt32LE(received, 0);
      req.writeUInt32LE(remain, 4);

      const first = await this._executeCmd(CMD.DATA_RDY, req, 15000);
      if (first.command === CMD.ACK_DATA) {
        chunks.push(first.data);
        received += first.data.length;
      } else if (first.command === CMD.PREPARE_DATA) {
        let subLen = first.data.length >= 4 ? first.data.readUInt32LE(0) : remain;
        let subGot = 0;
        while (subGot < subLen) {
          const pkt = await this._waitPacket(15000);
          if (pkt.command === CMD.DATA) {
            chunks.push(pkt.data);
            subGot += pkt.data.length;
            received += pkt.data.length;
          } else if (pkt.command === CMD.ACK_OK) {
            break;
          }
        }
        // Consume trailing ACK_OK if pending
        await this._waitPacket(1000).catch(() => {});
      } else {
        break;
      }
    }

    await this._executeCmd(CMD.FREE_DATA, Buffer.alloc(0), 2000).catch(() => {});
    return Buffer.concat(chunks);
  }

  async getUsers() {
    await this._executeCmd(CMD.DISABLEDEVICE, Buffer.alloc(0), 3000).catch(() => {});
    try {
      const req = Buffer.from([0x01, 0x09, 0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const raw = await this._readLargeData(req);
      if (raw.length < 4) return [];
      const data = raw.subarray(4);
      const users = [];
      const recSize = 72;
      for (let off = 0; off + recSize <= data.length; off += recSize) {
        const chunk = data.subarray(off, off + recSize);
        const uid = chunk.readUInt16LE(0);
        const role = chunk.readUInt8(2);
        const password = chunk.subarray(3, 11).toString("ascii").replace(/\0/g, "").trim();
        const name = chunk.subarray(11, 35).toString("utf8").replace(/\0/g, "").trim();
        const cardNumInt = chunk.readUInt32LE(35);
        const userId = chunk.subarray(48, 57).toString("ascii").replace(/\0/g, "").trim() || String(uid);
        const cardNumber = cardNumInt > 0 ? String(cardNumInt) : "";
        const hasCard = cardNumInt > 0;
        const hasPassword = password.length > 0;
        const authModes = [];
        if (hasCard) authModes.push("RFID Card");
        if (hasPassword) authModes.push("PIN");

        users.push({
          uid,
          biometricId: userId,
          name: name || `User ${userId}`,
          cardNumber,
          fingerprintCount: 0,
          hasFace: false,
          hasCard,
          hasPassword,
          authModes,
          privilege: role >= 14 ? "Admin" : "User",
          enabled: true,
        });
      }
      return users;
    } finally {
      await this._executeCmd(CMD.ENABLEDEVICE, Buffer.alloc(0), 3000).catch(() => {});
    }
  }

  async getAttendanceLogs() {
    await this._executeCmd(CMD.DISABLEDEVICE, Buffer.alloc(0), 3000).catch(() => {});
    try {
      const req = Buffer.from([0x01, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const raw = await this._readLargeData(req);
      if (raw.length < 4) return [];
      const data = raw.subarray(4);
      const logs = [];
      const recSize = 40;
      for (let off = 0; off + recSize <= data.length; off += recSize) {
        const chunk = data.subarray(off, off + recSize);
        const employeeCode = chunk.subarray(2, 26).toString("ascii").replace(/\0/g, "").trim();
        const verifyCode = chunk.readUInt8(26);
        const timeInt = chunk.readUInt32LE(27);
        const inOutCode = chunk.readUInt8(31);
        if (!employeeCode) continue;
        const punchTime = decodeZkTime(timeInt);
        if (Number.isNaN(punchTime.getTime())) continue;
        logs.push({
          employeeCode,
          punchTime: punchTime.toISOString(),
          punchTimeLocal: punchTime.toLocaleString("en-IN"),
          verificationMode: decodeVerifyMode(verifyCode),
          punchType: decodePunchType(inOutCode),
        });
      }
      return logs;
    } finally {
      await this._executeCmd(CMD.ENABLEDEVICE, Buffer.alloc(0), 3000).catch(() => {});
    }
  }
}

module.exports = { ZkTcpClient };
