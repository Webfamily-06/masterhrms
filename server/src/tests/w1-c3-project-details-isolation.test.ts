import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { projectsRouter } from "../routes/projects.routes";

describe("W1-C3: Project Details Passport & Multi-Tenant Isolation", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w1_c3_tenant_alpha";
  const tenantBetaId = "w1_c3_tenant_beta";

  const alphaUserId = "w1_c3_alpha_user";
  const betaUserId = "w1_c3_beta_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@w1c3-projects.local",
    tenantId: tenantAlphaId,
    roles: ["admin", "hr_admin"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@w1c3-projects.local",
    tenantId: tenantBetaId,
    roles: ["admin", "hr_admin"],
  });

  let projectAlphaId: string;
  let projectBetaId: string;
  let taskId1: string;
  let taskId2: string;

  beforeAll(async () => {
    // 1. Setup tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha Projects Tenant", slug: "alpha-projects-tenant" },
      update: { name: "Alpha Projects Tenant" },
    });

    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta Projects Tenant", slug: "beta-projects-tenant" },
      update: { name: "Beta Projects Tenant" },
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "Alpha Projects Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "Beta Projects Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 2. Setup users, profiles, and roles
    for (const u of [
      { id: alphaUserId, email: "alpha@w1c3-projects.local", tenantId: tenantAlphaId },
      { id: betaUserId, email: "beta@w1c3-projects.local", tenantId: tenantBetaId },
    ]) {
      await prisma.user.upsert({
        where: { id: u.id },
        create: { id: u.id, email: u.email, passwordHash: "dummy" },
        update: {},
      });
      await prisma.profile.upsert({
        where: { userId: u.id },
        create: { userId: u.id, email: u.email, fullName: u.id, tenantId: u.tenantId },
        update: { tenantId: u.tenantId },
      });
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.userRole.create({
        data: { userId: u.id, role: "hr_admin", tenantId: u.tenantId },
      });
    }

    // 3. Clear existing test data
    await prisma.projectTask.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.project.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });

    // 4. Create Alpha Project with initial tasks
    const prjAlpha = await prisma.project.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Hospital Administration System",
        description: "Modernizing clinical workflows and appointment portals.",
        clientName: "EcoVision Healthcare",
        budget: 45000,
        priority: "high",
        status: "in_progress",
        startDate: new Date("2026-01-15"),
        dueDate: new Date("2026-11-15"),
        tasks: {
          create: [
            {
              tenantId: tenantAlphaId,
              title: "Patient appointment booking",
              description: "Appointment booking with doctor scheduling.",
              status: "todo",
              priority: "high",
              assignedTo: "Lewis",
            },
            {
              tenantId: tenantAlphaId,
              title: "Private chat module",
              description: "Real-time doctor patient consultation messaging.",
              status: "in_progress",
              priority: "medium",
              assignedTo: "Moseley",
            },
          ],
        },
      },
      include: { tasks: true },
    });
    projectAlphaId = prjAlpha.id;
    taskId1 = prjAlpha.tasks[0].id;
    taskId2 = prjAlpha.tasks[1].id;

    // 5. Create Beta Project
    const prjBeta = await prisma.project.create({
      data: {
        tenantId: tenantBetaId,
        name: "Beta Banking Portal",
        description: "Core banking platform overhaul.",
        clientName: "Beta Financials",
        budget: 80000,
        priority: "critical",
        status: "in_progress",
      },
    });
    projectBetaId = prjBeta.id;

    // 6. Spin up Express app
    const app = express();
    app.use(express.json());
    app.use("/api/projects", projectsRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.projectTask.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.project.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
  });

  it("1. Rejects unauthenticated request with 401", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`);
    expect(res.status).toBe(401);
  });

  it("2. Returns 404 for non-existent project ID", async () => {
    const res = await fetch(`${baseUrl}/api/projects/non-existent-proj-id-999`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Project not found");
  });

  it("3. Retrieves valid project details with tasks, stats, and team for Tenant Alpha", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.id).toBe(projectAlphaId);
    expect(body.name).toBe("Hospital Administration System");
    expect(body.clientName).toBe("EcoVision Healthcare");
    expect(body.budget).toBe(45000);
    expect(body.priority).toBe("high");
    expect(body.status).toBe("in_progress");
    expect(body.tasksCount.total).toBe(2);
    expect(body.tasksCount.completed).toBe(0);
    expect(body.tasksCount.inProgress).toBe(1);
    expect(body.tasksCount.todo).toBe(1);
    expect(body.tasks).toHaveLength(2);
    expect(body.team.length).toBeGreaterThanOrEqual(1);
  });

  it("4. Multi-Tenant Isolation: Tenant Beta cannot read Tenant Alpha's project (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("5. Multi-Tenant Isolation: Tenant Alpha cannot read Tenant Beta's project (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectBetaId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("6. Multi-Tenant Isolation: Tenant Beta cannot update Tenant Alpha's project (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({ name: "Malicious Project Name" }),
    });
    expect(res.status).toBe(404);
  });

  it("7. Multi-Tenant Isolation: Tenant Beta cannot add tasks to Tenant Alpha's project (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({
        title: "Cross Tenant Task",
        priority: "high",
      }),
    });
    expect(res.status).toBe(404);
  });

  it("8. Multi-Tenant Isolation: Tenant Beta cannot delete Tenant Alpha's project (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("9. Creates task under project for Tenant Alpha and updates task counts", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        title: "Video Consultation WebRTC Channel",
        description: "Secure HIPAA compliant video stream.",
        priority: "medium",
        status: "todo",
        assignee: "Sophie Martin",
        dueDate: "2026-07-15",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Video Consultation WebRTC Channel");
    expect(body.assignee).toBe("Sophie Martin");

    // Verify project task count is now 3
    const prjRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const prj = await prjRes.json();
    expect(prj.tasksCount.total).toBe(3);
  });

  it("10. Updates task status and recalculates live project progress", async () => {
    // Complete taskId1 and taskId2 (2 of 3 tasks done = 67% progress)
    const updateRes = await fetch(`${baseUrl}/api/projects/tasks/${taskId1}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(updateRes.status).toBe(200);

    const prjRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const prj = await prjRes.json();
    expect(prj.tasksCount.completed).toBe(1);
    expect(prj.progress).toBe(33); // 1/3 = 33%
  });

  it("11. Updates project metadata (PUT /api/projects/:id)", async () => {
    const updateRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        name: "Hospital Administration System Pro",
        budget: 55000,
        clientName: "EcoVision Global Health",
        priority: "critical",
      }),
    });
    expect(updateRes.status).toBe(200);
    const body = await updateRes.json();
    expect(body.name).toBe("Hospital Administration System Pro");
    expect(body.budget).toBe(55000);
    expect(body.clientName).toBe("EcoVision Global Health");
    expect(body.priority).toBe("critical");
  });

  it("12. Generates timesheet invoice from project (POST /api/projects/:id/generate-invoice)", async () => {
    const invRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/generate-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        hourlyRate: 2000,
        customHours: 50,
        taxPercent: 18,
        notes: "Sprint 1 Completed Deliverables for Hospital Administration",
      }),
    });
    expect(invRes.status).toBe(201);
    const inv = await invRes.json();
    expect(inv.id).toBeDefined();
    expect(inv.subtotal).toBe(100000);
    expect(inv.total).toBe(118000);

    // Verify invoice is scoped to tenantAlphaId
    const dbSale = await prisma.sale.findUnique({
      where: { id: inv.id },
    });
    expect(dbSale?.tenantId).toBe(tenantAlphaId);
    expect(Number(dbSale?.total)).toBe(118000);

    // Clean generated invoice
    await prisma.saleDetail.deleteMany({ where: { saleId: inv.id } });
    await prisma.sale.delete({ where: { id: inv.id } });
  });

  it("13. Deletes project task and project (DELETE /api/projects/:id)", async () => {
    const delTaskRes = await fetch(`${baseUrl}/api/projects/tasks/${taskId1}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(delTaskRes.status).toBe(200);

    const delPrjRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(delPrjRes.status).toBe(200);

    // Verify project no longer exists
    const checkRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(checkRes.status).toBe(404);
  });
});
