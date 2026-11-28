"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordWorkerPool = exports.PasswordQueueOverloadedError = exports.DUMMY_BCRYPT_HASH = void 0;
exports.verifyPasswordQueued = verifyPasswordQueued;
exports.hashPasswordQueued = hashPasswordQueued;
exports.getLoginQueueStats = getLoginQueueStats;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const worker_threads_1 = require("worker_threads");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Valid pre-computed bcrypt hash (10 rounds) used for constant-time comparison
 * when a login email does not exist, neutralizing account-enumeration timing oracles (PENTEST-005).
 */
exports.DUMMY_BCRYPT_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8dR0C2lY2o2l6b4v2k6E8F9xW1xK2e";
class PasswordQueueOverloadedError extends Error {
    status = 503;
    code = "LOGIN_QUEUE_OVERLOADED";
    retryAfterSeconds;
    constructor(message, retryAfterSeconds = 5) {
        super(message);
        this.name = "PasswordQueueOverloadedError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
exports.PasswordQueueOverloadedError = PasswordQueueOverloadedError;
const MAX_WORKERS = Math.min(Math.max(2, Number(process.env.PASSWORD_WORKERS || Math.max(2, os_1.default.cpus().length - 1))), 8);
const MAX_QUEUE_SIZE = Math.max(100, Number(process.env.LOGIN_QUEUE_MAX_SIZE || 2000));
const QUEUE_TIMEOUT_MS = Math.max(3000, Number(process.env.LOGIN_QUEUE_TIMEOUT_MS || 25000));
function resolveWorkerScriptPath() {
    const candidates = [
        path_1.default.resolve(__dirname, "password-worker.cjs"),
        path_1.default.resolve(process.cwd(), "src", "lib", "password-worker.cjs"),
        path_1.default.resolve(process.cwd(), "server", "src", "lib", "password-worker.cjs"),
        path_1.default.resolve(process.cwd(), "dist", "lib", "password-worker.cjs"),
    ];
    for (const c of candidates) {
        if (fs_1.default.existsSync(c))
            return c;
    }
    return null;
}
class PasswordWorkerPool {
    slots = [];
    queue = [];
    nextJobId = 1;
    initialized = false;
    workerScriptPath = null;
    metrics = {
        completed: 0,
        shed: 0,
        timedOut: 0,
        totalWaitMs: 0,
        totalExecMs: 0,
    };
    ensureInitialized() {
        if (this.initialized)
            return;
        this.initialized = true;
        this.workerScriptPath = resolveWorkerScriptPath();
        if (!this.workerScriptPath)
            return;
        for (let i = 0; i < MAX_WORKERS; i++) {
            this.spawnSlot();
        }
    }
    spawnSlot() {
        if (!this.workerScriptPath)
            return null;
        try {
            const worker = new worker_threads_1.Worker(this.workerScriptPath);
            const slot = { worker, busy: false, currentJob: null };
            worker.on("message", (msg) => {
                const job = slot.currentJob;
                slot.currentJob = null;
                slot.busy = false;
                if (job) {
                    clearTimeout(job.timeoutHandle);
                    this.metrics.completed++;
                    this.metrics.totalExecMs += Math.max(0, Date.now() - job.enqueuedAt);
                    if (msg.ok)
                        job.resolve(msg.result);
                    else
                        job.reject(new Error(msg.error || "Password worker error"));
                }
                this.drain();
            });
            worker.on("error", (err) => {
                const job = slot.currentJob;
                slot.currentJob = null;
                slot.busy = false;
                if (job) {
                    clearTimeout(job.timeoutHandle);
                    job.reject(err);
                }
                // Replace crashed worker
                this.slots = this.slots.filter((s) => s !== slot);
                this.spawnSlot();
                this.drain();
            });
            worker.unref();
            this.slots.push(slot);
            return slot;
        }
        catch {
            return null;
        }
    }
    drain() {
        if (this.queue.length === 0)
            return;
        for (const slot of this.slots) {
            if (!slot.busy && this.queue.length > 0) {
                const job = this.queue.shift();
                slot.busy = true;
                slot.currentJob = job;
                this.metrics.totalWaitMs += Math.max(0, Date.now() - job.enqueuedAt);
                slot.worker.postMessage({
                    id: job.id,
                    op: job.op,
                    password: job.password,
                    hash: job.hash,
                    rounds: job.rounds,
                });
            }
        }
    }
    enqueue(op, password, hash, rounds) {
        this.ensureInitialized();
        // Fallback to async bcryptjs if worker script unavailable (e.g. bundled edge/mock env)
        if (this.slots.length === 0) {
            if (op === "compare")
                return bcryptjs_1.default.compare(password, hash || exports.DUMMY_BCRYPT_HASH);
            return bcryptjs_1.default.hash(password, rounds || 10);
        }
        // Backpressure: gracefully shed load when queue is full instead of crashing with OOM
        if (this.queue.length >= MAX_QUEUE_SIZE) {
            this.metrics.shed++;
            return Promise.reject(new PasswordQueueOverloadedError("Authentication queue is temporarily saturated. Please retry in a few seconds.", 5));
        }
        return new Promise((resolve, reject) => {
            const id = this.nextJobId++;
            const enqueuedAt = Date.now();
            const timeoutHandle = setTimeout(() => {
                const idx = this.queue.findIndex((j) => j.id === id);
                if (idx !== -1) {
                    this.queue.splice(idx, 1);
                    this.metrics.timedOut++;
                    reject(new PasswordQueueOverloadedError("Authentication queue wait timed out under heavy load. Please retry.", 5));
                }
            }, QUEUE_TIMEOUT_MS);
            if (timeoutHandle.unref)
                timeoutHandle.unref();
            this.queue.push({
                id,
                op,
                password,
                hash,
                rounds,
                enqueuedAt,
                resolve,
                reject,
                timeoutHandle,
            });
            this.drain();
        });
    }
    getStats() {
        const active = this.slots.filter((s) => s.busy).length;
        const completed = this.metrics.completed;
        return {
            workers: this.slots.length || MAX_WORKERS,
            initialized: this.initialized,
            active,
            queued: this.queue.length,
            maxQueueSize: MAX_QUEUE_SIZE,
            completed,
            shed: this.metrics.shed,
            timedOut: this.metrics.timedOut,
            avgWaitMs: completed > 0 ? Math.round(this.metrics.totalWaitMs / completed) : 0,
            avgTotalMs: completed > 0 ? Math.round(this.metrics.totalExecMs / completed) : 0,
        };
    }
}
exports.passwordWorkerPool = new PasswordWorkerPool();
/**
 * Offloads bcrypt.compare to the multi-threaded worker pool with bounded queue backpressure.
 */
function verifyPasswordQueued(password, hash) {
    const targetHash = hash && hash.startsWith("$2") ? hash : exports.DUMMY_BCRYPT_HASH;
    return exports.passwordWorkerPool.enqueue("compare", password, targetHash);
}
/**
 * Offloads bcrypt.hash to the multi-threaded worker pool.
 */
function hashPasswordQueued(password, rounds = 10) {
    return exports.passwordWorkerPool.enqueue("hash", password, undefined, rounds);
}
function getLoginQueueStats() {
    return exports.passwordWorkerPool.getStats();
}
