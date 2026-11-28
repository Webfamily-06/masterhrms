"use strict";
const { parentPort } = require("worker_threads");
const bcrypt = require("bcryptjs");

if (!parentPort) {
  throw new Error("password-worker.cjs must be executed inside a Worker thread");
}

parentPort.on("message", async (msg) => {
  const { id, op, password, hash, rounds } = msg || {};
  try {
    if (op === "compare") {
      const ok = await bcrypt.compare(String(password ?? ""), String(hash ?? ""));
      parentPort.postMessage({ id, ok: true, result: ok });
    } else if (op === "hash") {
      const hashed = await bcrypt.hash(String(password ?? ""), Number(rounds) || 10);
      parentPort.postMessage({ id, ok: true, result: hashed });
    } else {
      parentPort.postMessage({ id, ok: false, error: `Unknown op: ${op}` });
    }
  } catch (err) {
    parentPort.postMessage({ id, ok: false, error: err && err.message ? err.message : "Worker bcrypt error" });
  }
});
