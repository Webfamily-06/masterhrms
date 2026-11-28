import os from "os";
import path from "path";
import fs from "fs";
import { Worker } from "worker_threads";
import bcrypt from "bcryptjs";

/**
 * Valid pre-computed bcrypt hash (10 rounds) used for constant-time comparison
 * when a login email does not exist, neutralizing account-enumeration timing oracles (PENTEST-005).
 */
export const DUMMY_BCRYPT_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8dR0C2lY2o2l6b4v2k6E8F9xW1xK2e";

export class PasswordQueueOverloadedError extends Error {
  public readonly status = 503;
  public readonly code = "LOGIN_QUEUE_OVERLOADED";
  public readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds = 5) {
    super(message);
    this.name = "PasswordQueueOverloadedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface PendingJob {
  id: number;
  op: "compare" | "hash";
  password: string;
  hash?: string;
  rounds?: number;
  enqueuedAt: number;
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
  currentJob: PendingJob | null;
}

const MAX_WORKERS = Math.min(
  Math.max(2, Number(process.env.PASSWORD_WORKERS || Math.max(2, os.cpus().length - 1))),
  8
);
const MAX_QUEUE_SIZE = Math.max(100, Number(process.env.LOGIN_QUEUE_MAX_SIZE || 2000));
const QUEUE_TIMEOUT_MS = Math.max(3000, Number(process.env.LOGIN_QUEUE_TIMEOUT_MS || 25000));

function resolveWorkerScriptPath(): string | null {
  const candidates = [
    path.resolve(__dirname, "password-worker.cjs"),
    path.resolve(process.cwd(), "src", "lib", "password-worker.cjs"),
    path.resolve(process.cwd(), "server", "src", "lib", "password-worker.cjs"),
    path.resolve(process.cwd(), "dist", "lib", "password-worker.cjs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

class PasswordWorkerPool {
  private slots: WorkerSlot[] = [];
  private queue: PendingJob[] = [];
  private nextJobId = 1;
  private initialized = false;
  private workerScriptPath: string | null = null;

  private metrics = {
    completed: 0,
    shed: 0,
    timedOut: 0,
    totalWaitMs: 0,
    totalExecMs: 0,
  };

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;
    this.workerScriptPath = resolveWorkerScriptPath();
    if (!this.workerScriptPath) return;

    for (let i = 0; i < MAX_WORKERS; i++) {
      this.spawnSlot();
    }
  }

  private spawnSlot(): WorkerSlot | null {
    if (!this.workerScriptPath) return null;
    try {
      const worker = new Worker(this.workerScriptPath);
      const slot: WorkerSlot = { worker, busy: false, currentJob: null };

      worker.on("message", (msg: { id: number; ok: boolean; result?: any; error?: string }) => {
        const job = slot.currentJob;
        slot.currentJob = null;
        slot.busy = false;
        if (job) {
          clearTimeout(job.timeoutHandle);
          this.metrics.completed++;
          this.metrics.totalExecMs += Math.max(0, Date.now() - job.enqueuedAt);
          if (msg.ok) job.resolve(msg.result);
          else job.reject(new Error(msg.error || "Password worker error"));
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
    } catch {
      return null;
    }
  }

  private drain() {
    if (this.queue.length === 0) return;
    for (const slot of this.slots) {
      if (!slot.busy && this.queue.length > 0) {
        const job = this.queue.shift()!;
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

  public enqueue<T>(op: "compare" | "hash", password: string, hash?: string, rounds?: number): Promise<T> {
    this.ensureInitialized();

    // Fallback to async bcryptjs if worker script unavailable (e.g. bundled edge/mock env)
    if (this.slots.length === 0) {
      if (op === "compare") return bcrypt.compare(password, hash || DUMMY_BCRYPT_HASH) as Promise<T>;
      return bcrypt.hash(password, rounds || 10) as Promise<T>;
    }

    // Backpressure: gracefully shed load when queue is full instead of crashing with OOM
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.metrics.shed++;
      return Promise.reject(
        new PasswordQueueOverloadedError(
          "Authentication queue is temporarily saturated. Please retry in a few seconds.",
          5
        )
      );
    }

    return new Promise<T>((resolve, reject) => {
      const id = this.nextJobId++;
      const enqueuedAt = Date.now();
      const timeoutHandle = setTimeout(() => {
        const idx = this.queue.findIndex((j) => j.id === id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.metrics.timedOut++;
          reject(
            new PasswordQueueOverloadedError(
              "Authentication queue wait timed out under heavy load. Please retry.",
              5
            )
          );
        }
      }, QUEUE_TIMEOUT_MS);

      if (timeoutHandle.unref) timeoutHandle.unref();

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

  public getStats() {
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

export const passwordWorkerPool = new PasswordWorkerPool();

/**
 * Offloads bcrypt.compare to the multi-threaded worker pool with bounded queue backpressure.
 */
export function verifyPasswordQueued(password: string, hash: string | null | undefined): Promise<boolean> {
  const targetHash = hash && hash.startsWith("$2") ? hash : DUMMY_BCRYPT_HASH;
  return passwordWorkerPool.enqueue<boolean>("compare", password, targetHash);
}

/**
 * Offloads bcrypt.hash to the multi-threaded worker pool.
 */
export function hashPasswordQueued(password: string, rounds = 10): Promise<string> {
  return passwordWorkerPool.enqueue<string>("hash", password, undefined, rounds);
}

export function getLoginQueueStats() {
  return passwordWorkerPool.getStats();
}
