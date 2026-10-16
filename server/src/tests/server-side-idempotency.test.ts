import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import http from "http";
import express from "express";
import { notesRouter } from "../routes/notes.routes";
import { projectsRouter } from "../routes/projects.routes";
import { meAttendanceRouter } from "../routes/me-attendance.routes";
import { rawPrisma } from "../prisma";
import { IdempotencyService } from "../services/idempotency.service";
import { generateToken } from "../lib/jwt";

function createServerInstance() {
  const app = express();
  app.use(express.json());

  app.use("/api/notes", notesRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/v1/me/attendance", meAttendanceRouter);

  return http.createServer(app);
}

async function apiRequest(
  server: http.Server,
  path: string,
  token: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
) {
  const address = server.address() as any;
  const url = `http://127.0.0.1:${address.port}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: data,
  };
}

describe("Batch 5D Residual Audit Finding F-04: Server-Side Idempotency Suite", () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let tokenA: string;
  let tokenB: string;

  let server: http.Server;

  beforeAll(async () => {
    // 1. Create Tenant A and User A
    const tenantA = await rawPrisma.tenant.create({
      data: {
        name: "Idemp-Tenant-Alpha",
        slug: `idemp-alpha-${Date.now()}`,
      },
    });
    tenantAId = tenantA.id;

    const userA = await rawPrisma.user.create({
      data: {
        email: `idemp-a-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            tenant: { connect: { id: tenantAId } },
            fullName: "Alice Tester",
          },
        },
      },
    });
    userAId = userA.id;
    tokenA = generateToken({
      userId: userAId,
      email: userA.email,
      tenantId: tenantAId,
      roles: ["employee"],
    });

    // 2. Create Tenant B and User B
    const tenantB = await rawPrisma.tenant.create({
      data: {
        name: "Idemp-Tenant-Beta",
        slug: `idemp-beta-${Date.now()}`,
      },
    });
    tenantBId = tenantB.id;

    const userB = await rawPrisma.user.create({
      data: {
        email: `idemp-b-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            tenant: { connect: { id: tenantBId } },
            fullName: "Bob Tester",
          },
        },
      },
    });
    userBId = userB.id;
    tokenB = generateToken({
      userId: userBId,
      email: userB.email,
      tenantId: tenantBId,
      roles: ["employee"],
    });

    server = createServerInstance();
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Cleanup created test records
    await rawPrisma.workspaceNote.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await rawPrisma.projectTask.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await rawPrisma.setting.deleteMany({
      where: {
        scope: "TENANT",
        scopeId: { in: [tenantAId, tenantBId] },
        group: "idempotency",
      },
    }).catch(() => {});
    await rawPrisma.profile.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    }).catch(() => {});
    await rawPrisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    }).catch(() => {});
    await rawPrisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
  });

  beforeEach(async () => {
    IdempotencyService.clearMemoryLocks();

    await rawPrisma.workspaceNote.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await rawPrisma.projectTask.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await rawPrisma.setting.deleteMany({
      where: {
        scope: "TENANT",
        scopeId: { in: [tenantAId, tenantBId] },
        group: "idempotency",
      },
    });
  });

  afterEach(async () => {
    IdempotencyService.clearMemoryLocks();
    await rawPrisma.workspaceNote.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await rawPrisma.projectTask.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await rawPrisma.setting.deleteMany({
      where: {
        scope: "TENANT",
        scopeId: { in: [tenantAId, tenantBId] },
        group: "idempotency",
      },
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DUPLICATE MUTATION PREVENTION
  // ──────────────────────────────────────────────────────────────────────────
  it("should prevent duplicate note creation when replaying with the same idempotency key", async () => {
    const key = `key-note-dedup-${Date.now()}`;
    const payload = {
      title: "Offline Strategy Note",
      content: "Important business plan drafted while offline.",
      tag: "strategy",
    };

    // First request: Should create note
    const res1 = await apiRequest(server, "/api/notes", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: payload,
    });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.title).toBe("Offline Strategy Note");
    const createdNoteId = res1.body.data.id;

    // Verify 1 note exists in database
    const countAfterFirst = await rawPrisma.workspaceNote.count({
      where: { tenantId: tenantAId },
    });
    expect(countAfterFirst).toBe(1);

    // Second request: Replay with identical key and payload
    const res2 = await apiRequest(server, "/api/notes", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: payload,
    });

    expect(res2.status).toBe(201);
    expect(res2.headers["x-idempotent-replay"]).toBe("true");
    expect(res2.body.data.id).toBe(createdNoteId);
    expect(res2.body.data.title).toBe("Offline Strategy Note");

    // CRITICAL: Database must STILL have exactly 1 note (no duplicate created!)
    const countAfterSecond = await rawPrisma.workspaceNote.count({
      where: { tenantId: tenantAId },
    });
    expect(countAfterSecond).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PAYLOAD MISMATCH DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  it("should reject request with HTTP 409 Conflict if idempotency key is reused with different payload", async () => {
    const key = `key-mismatch-${Date.now()}`;

    // Request 1: Original payload
    const res1 = await apiRequest(server, "/api/notes", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: { title: "Original Title", content: "Original Content" },
    });

    expect(res1.status).toBe(201);

    // Request 2: Reusing SAME key with DIFFERENT payload
    const res2 = await apiRequest(server, "/api/notes", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: { title: "Tampered Title", content: "Completely different content" },
    });

    expect(res2.status).toBe(409);
    expect(res2.body.code).toBe("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH");
    expect(res2.body.error).toMatch(/different request payload/i);

    // Ensure only 1 note exists
    const notes = await rawPrisma.workspaceNote.findMany({ where: { tenantId: tenantAId } });
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe("Original Title");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CONCURRENT REQUEST PROTECTION
  // ──────────────────────────────────────────────────────────────────────────
  it("should block concurrent requests using the same idempotency key with 409 Conflict", async () => {
    const key = `key-concurrent-${Date.now()}`;
    const payload = { title: "Concurrent Task Note", content: "Draft" };

    // Acquire lock manually to simulate in-flight request
    await IdempotencyService.checkAndLock(tenantAId, key, payload);

    // Simultaneous second request while first is in-progress
    const res = await apiRequest(server, "/api/notes", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: payload,
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONCURRENT_REQUEST_IN_PROGRESS");
    expect(res.body.error).toMatch(/currently in progress/i);

    // Release lock and commit
    IdempotencyService.unlock(tenantAId, key);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. CROSS-TENANT ISOLATION
  // ──────────────────────────────────────────────────────────────────────────
  it("should isolate idempotency keys strictly by tenant boundary", async () => {
    const sharedKey = `shared-offline-uuid-12345`;
    const payloadA = { title: "Tenant A Note", content: "Private to Tenant A" };
    const payloadB = { title: "Tenant B Note", content: "Private to Tenant B" };

    // Tenant A creates note with key
    const resA = await apiRequest(server, "/api/notes", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": sharedKey },
      body: payloadA,
    });
    expect(resA.status).toBe(201);
    expect(resA.body.data.title).toBe("Tenant A Note");

    // Tenant B uses the EXACT SAME key with their own payload
    // Tenant B must NOT be blocked, must NOT receive Tenant A's cached response
    const resB = await apiRequest(server, "/api/notes", tokenB, {
      method: "POST",
      headers: { "X-Idempotency-Key": sharedKey },
      body: payloadB,
    });

    expect(resB.status).toBe(201);
    expect(resB.body.data.title).toBe("Tenant B Note");
    expect(resB.body.data.id).not.toBe(resA.body.data.id);

    // Both tenants have their independent notes
    const notesA = await rawPrisma.workspaceNote.findMany({ where: { tenantId: tenantAId } });
    const notesB = await rawPrisma.workspaceNote.findMany({ where: { tenantId: tenantBId } });
    expect(notesA.length).toBe(1);
    expect(notesB.length).toBe(1);
    expect(notesA[0].title).toBe("Tenant A Note");
    expect(notesB[0].title).toBe("Tenant B Note");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. TASK CREATION IDEMPOTENCY
  // ──────────────────────────────────────────────────────────────────────────
  it("should enforce idempotency on task creation under /api/projects/tasks", async () => {
    const key = `key-task-${Date.now()}`;
    const payload = {
      title: "Deploy PWA Offline Service Worker",
      priority: "high",
      status: "todo",
    };

    // First request
    const res1 = await apiRequest(server, "/api/projects/tasks", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: payload,
    });

    expect(res1.status).toBe(201);
    const taskId = res1.body.id;

    // Count in DB
    const count1 = await rawPrisma.projectTask.count({ where: { tenantId: tenantAId } });
    expect(count1).toBe(1);

    // Replay with same key
    const res2 = await apiRequest(server, "/api/projects/tasks", tokenA, {
      method: "POST",
      headers: { "X-Idempotency-Key": key },
      body: payload,
    });

    expect(res2.status).toBe(201);
    expect(res2.headers["x-idempotent-replay"]).toBe("true");
    expect(res2.body.id).toBe(taskId);

    // Count in DB must still be 1
    const count2 = await rawPrisma.projectTask.count({ where: { tenantId: tenantAId } });
    expect(count2).toBe(1);
  });
});
