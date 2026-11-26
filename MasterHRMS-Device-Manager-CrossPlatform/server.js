"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { ZkTcpClient } = require("./lib/zk-tcp");

const PORT = Number(process.env.DEVICE_MANAGER_PORT) || 4375;
const UI_FILE = path.join(__dirname, "ui", "index.html");
const ASSETS_DIR = path.join(__dirname, "ui", "assets");
const CONFIG_FILE = path.join(__dirname, "config.json");

const DEFAULT_CONFIG = {
  ip: "10.10.10.215",
  port: 4370,
  serverUrl: "https://www.masterhrms.com",
  autoSyncEnabled: true,
  intervalMinutes: 5,
  lastSyncAt: null,
  lastSyncStatus: "idle",
  lastSyncMessage: "Waiting for first background sync...",
  history: [],
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

let appConfig = loadConfig();
let autoSyncTimer = null;
let isAutoSyncRunning = false;

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig, null, 2), "utf8");
  } catch {}
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function postJsonToUrl(targetUrl, payloadObj, redirectsLeft = 4) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const lib = urlObj.protocol === "https:" ? https : http;
    const body = Buffer.from(JSON.stringify(payloadObj), "utf8");
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
        },
      },
      (resp) => {
        const status = resp.statusCode || 500;
        if ([301, 302, 307, 308].includes(status) && resp.headers.location && redirectsLeft > 0) {
          resp.resume();
          const nextUrl = new URL(resp.headers.location, targetUrl).toString();
          return postJsonToUrl(nextUrl, payloadObj, redirectsLeft - 1).then(resolve, reject);
        }
        const chunks = [];
        resp.on("data", (c) => chunks.push(c));
        resp.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status, body: json || text });
        });
      }
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function withZk(ip, port, fn) {
  const zk = new ZkTcpClient(ip, port, 8000);
  await zk.connect();
  try {
    return await fn(zk);
  } finally {
    await zk.disconnect();
  }
}

async function pullEnrichedBundle(ip, port) {
  return await withZk(ip, port, async (zk) => {
    const info = await zk.getCommSettings();
    const users = await zk.getUsers();
    const logs = await zk.getAttendanceLogs();

    const userMap = new Map(users.map((u) => [u.biometricId, u]));
    for (const l of logs) {
      let u = userMap.get(l.employeeCode);
      if (!u) {
        u = {
          biometricId: l.employeeCode,
          name: `User ${l.employeeCode}`,
          cardNumber: "",
          fingerprintCount: 0,
          hasFace: false,
          hasCard: false,
          hasPassword: false,
          authModes: [],
          privilege: "User",
          enabled: true,
        };
        userMap.set(l.employeeCode, u);
      }
      if (l.verificationMode === "face" && !u.authModes.includes("Face")) { u.hasFace = true; u.authModes.push("Face"); }
      if (l.verificationMode === "rfid" && !u.authModes.includes("RFID Card")) { u.hasCard = true; u.authModes.push("RFID Card"); }
      if (l.verificationMode === "pin" && !u.authModes.includes("PIN")) { u.hasPassword = true; u.authModes.push("PIN"); }
      if (l.verificationMode === "fingerprint" && !u.authModes.includes("Fingerprint")) { u.fingerprintCount = Math.max(u.fingerprintCount, 1); u.authModes.push("Fingerprint"); }
    }
    const enrichedUsers = Array.from(userMap.values()).map((u) => ({
      ...u,
      authModes: u.authModes.length ? u.authModes : ["Fingerprint"],
    }));
    return { info, users: enrichedUsers, logs };
  });
}

// ── Background Auto-Sync Scheduler ──────────────────────────────────────────
async function runBackgroundAutoSync(trigger = "scheduled") {
  if (isAutoSyncRunning) return { ok: false, skipped: true, message: "Sync already in progress." };
  if (!appConfig.ip || !appConfig.serverUrl) {
    return { ok: false, message: "Device IP and Master HRMS Server URL are required." };
  }

  isAutoSyncRunning = true;
  const startedAt = new Date().toISOString();
  try {
    const bundle = await pullEnrichedBundle(appConfig.ip, appConfig.port);
    const sn = bundle.info?.serialNumber;
    if (!sn) throw new Error("Device did not return a Serial Number.");

    const base = String(appConfig.serverUrl).trim().replace(/\/+$/, "");
    const resp = await postJsonToUrl(`${base}/api/public/biometric/device-sync-bundle`, {
      serialNumber: sn,
      users: bundle.users,
      logs: bundle.logs,
    });

    const ok = resp.status === 200;
    const msg = ok
      ? (resp.body?.message || `Synced ${bundle.users.length} users & ${bundle.logs.length} logs (SN: ${sn})`)
      : (resp.body?.error || `Server returned HTTP ${resp.status}`);

    appConfig.lastSyncAt = new Date().toISOString();
    appConfig.lastSyncStatus = ok ? "success" : "error";
    appConfig.lastSyncMessage = msg;
    appConfig.history = [
      { at: appConfig.lastSyncAt, trigger, status: appConfig.lastSyncStatus, message: msg },
      ...(appConfig.history || []),
    ].slice(0, 20);
    saveConfig();
    console.log(`[AUTO-SYNC ${trigger.toUpperCase()}] ${appConfig.lastSyncStatus}: ${msg}`);
    return { ok, message: msg, response: resp.body };
  } catch (err) {
    appConfig.lastSyncAt = startedAt;
    appConfig.lastSyncStatus = "error";
    appConfig.lastSyncMessage = err.message || "Auto-sync failed";
    appConfig.history = [
      { at: startedAt, trigger, status: "error", message: appConfig.lastSyncMessage },
      ...(appConfig.history || []),
    ].slice(0, 20);
    saveConfig();
    console.warn(`[AUTO-SYNC ${trigger.toUpperCase()}] ERROR: ${appConfig.lastSyncMessage}`);
    return { ok: false, error: appConfig.lastSyncMessage };
  } finally {
    isAutoSyncRunning = false;
  }
}

function scheduleAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  if (!appConfig.autoSyncEnabled) return;
  const mins = Math.max(1, Number(appConfig.intervalMinutes) || 5);
  autoSyncTimer = setInterval(() => {
    runBackgroundAutoSync("scheduled");
  }, mins * 60 * 1000);
}

scheduleAutoSync();

const MIME = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = (req.url || "/").split("?")[0];

    if (req.method === "GET" && (urlPath === "/" || urlPath === "/index.html")) {
      const html = fs.readFileSync(UI_FILE, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (req.method === "GET" && urlPath.startsWith("/assets/")) {
      const safeName = path.basename(urlPath);
      const filePath = path.join(ASSETS_DIR, safeName);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(safeName).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "public, max-age=3600" });
        return fs.createReadStream(filePath).pipe(res);
      }
      return sendJson(res, 404, { error: "Asset not found" });
    }

    if (req.method === "GET" && urlPath === "/api/system") {
      return sendJson(res, 200, {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        nodeVersion: process.version,
        protocol: "Pure TCP ZKTeco Protocol (Zero DLL — Windows / macOS / Linux)",
      });
    }

    if (req.method === "GET" && urlPath === "/api/autosync/status") {
      return sendJson(res, 200, {
        ok: true,
        isRunning: isAutoSyncRunning,
        config: appConfig,
      });
    }

    if (req.method !== "POST") {
      return sendJson(res, 404, { error: "Not found" });
    }

    const body = await readJsonBody(req);

    if (urlPath === "/api/autosync/config") {
      if (body.ip !== undefined) appConfig.ip = String(body.ip).trim();
      if (body.port !== undefined) appConfig.port = Number(body.port) || 4370;
      if (body.serverUrl !== undefined) appConfig.serverUrl = String(body.serverUrl).trim();
      if (body.autoSyncEnabled !== undefined) appConfig.autoSyncEnabled = Boolean(body.autoSyncEnabled);
      if (body.intervalMinutes !== undefined) appConfig.intervalMinutes = Math.max(1, Number(body.intervalMinutes) || 5);
      saveConfig();
      scheduleAutoSync();
      return sendJson(res, 200, { ok: true, config: appConfig });
    }

    if (urlPath === "/api/autosync/run-now") {
      if (body.ip) appConfig.ip = String(body.ip).trim();
      if (body.port) appConfig.port = Number(body.port) || 4370;
      if (body.serverUrl) appConfig.serverUrl = String(body.serverUrl).trim();
      saveConfig();
      const result = await runBackgroundAutoSync("manual");
      return sendJson(res, result.ok ? 200 : 500, { ...result, config: appConfig });
    }

    if (urlPath === "/api/device/connect") {
      appConfig.ip = String(body.ip || appConfig.ip).trim();
      appConfig.port = Number(body.port) || 4370;
      saveConfig();
      const info = await withZk(appConfig.ip, appConfig.port, (zk) => zk.getCommSettings());
      return sendJson(res, 200, { ok: true, info });
    }

    if (urlPath === "/api/device/update-adms") {
      const result = await withZk(body.ip, body.port, async (zk) => {
        if (body.netMask) await zk.setOption("NetMask", body.netMask.trim());
        if (body.gateway) await zk.setOption("GATEIPAddress", body.gateway.trim());
        if (body.dns) await zk.setOption("DNS", body.dns.trim());
        if (body.admsPort) await zk.setOption("IclockSvrPort", String(body.admsPort).trim());
        if (body.admsUrl) await zk.setOption("ICLOCKSVRURL", body.admsUrl.trim());
        return await zk.getCommSettings();
      });
      return sendJson(res, 200, { ok: true, info: result, message: "Device settings updated. Click Restart Device to apply." });
    }

    if (urlPath === "/api/device/restart") {
      await withZk(body.ip, body.port, (zk) => zk.restartDevice());
      return sendJson(res, 200, { ok: true, message: "Device restart command sent successfully." });
    }

    if (urlPath === "/api/device/time/get") {
      const dt = await withZk(body.ip, body.port, (zk) => zk.getDeviceTime());
      return sendJson(res, 200, { ok: true, deviceTime: dt.toLocaleString("en-IN"), iso: dt.toISOString() });
    }

    if (urlPath === "/api/device/time/sync") {
      const now = new Date();
      await withZk(body.ip, body.port, (zk) => zk.setDeviceTime(now));
      return sendJson(res, 200, { ok: true, syncedTo: now.toLocaleString("en-IN") });
    }

    if (urlPath === "/api/device/option/get") {
      const value = await withZk(body.ip, body.port, (zk) => zk.getOption(String(body.key || "").trim()));
      return sendJson(res, 200, { ok: true, key: body.key, value });
    }

    if (urlPath === "/api/device/option/set") {
      const ok = await withZk(body.ip, body.port, (zk) => zk.setOption(String(body.key || "").trim(), String(body.value || "").trim()));
      return sendJson(res, 200, { ok, key: body.key, value: body.value });
    }

    if (urlPath === "/api/device/pull-users-logs") {
      const data = await pullEnrichedBundle(body.ip, body.port);
      return sendJson(res, 200, { ok: true, ...data });
    }

    if (urlPath === "/api/cloud/test-server") {
      const base = String(body.serverUrl || appConfig.serverUrl).trim().replace(/\/+$/, "");
      const resp = await postJsonToUrl(`${base}/api/public/biometric/server-time`, { client: "MasterHRMS-CrossPlatform-Manager" });
      return sendJson(res, resp.status, { ok: resp.status === 200, response: resp.body });
    }

    if (urlPath === "/api/cloud/push-bundle") {
      const base = String(body.serverUrl || appConfig.serverUrl).trim().replace(/\/+$/, "");
      appConfig.serverUrl = base;
      saveConfig();
      const resp = await postJsonToUrl(`${base}/api/public/biometric/device-sync-bundle`, {
        serialNumber: body.serialNumber,
        users: body.users || [],
        logs: body.logs || [],
      });
      return sendJson(res, resp.status, { ok: resp.status === 200, response: resp.body });
    }

    return sendJson(res, 404, { error: "Unknown endpoint" });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || "Unexpected error" });
  }
});

function openBrowser(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`\n  Master HRMS Biometric Device Manager is ALREADY running at ${url}`);
    console.log(`  Opening browser...\n`);
    if (!process.env.NO_OPEN_BROWSER && !process.argv.includes("--background")) {
      openBrowser(url);
    }
    setTimeout(() => process.exit(0), 600);
    return;
  }
  console.error("Server error:", err);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`\n  Master HRMS Biometric Device Manager (Cross-Platform Background Daemon)`);
  console.log(`  UI URL     : ${url}`);
  console.log(`  OS         : ${process.platform} (${process.arch}) | Zero-DLL Pure TCP`);
  console.log(`  Auto-Sync  : ${appConfig.autoSyncEnabled ? `ENABLED (every ${appConfig.intervalMinutes} min)` : "PAUSED"}\n`);

  if (!process.env.NO_OPEN_BROWSER && !process.argv.includes("--background")) {
    openBrowser(url);
  }
});
