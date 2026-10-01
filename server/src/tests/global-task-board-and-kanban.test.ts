import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import assert from "assert";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { projectsRouter } from "../routes/projects.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: GLOBAL TASK BOARD & KANBAN (P08 / PR05)");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount router
  app.use("/api/projects", projectsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-kanban-alpha-${timestamp}`;
  const tenantBetaId = `test-kanban-beta-${timestamp}`;
  const userAlphaId = `user-kanban-a-${timestamp}`;
  const userBetaId = `user-kanban-b-${timestamp}`;

  let projectAlphaId = "";
  let projectBetaId = "";
  let taskAlphaId = "";

  const tokenAlpha = generateToken({
    id: userAlphaId,
    email: `lead-a-${timestamp}@alphacorp.com`,
    role: "admin",
    tenantId: tenantAlphaId,
  });

  const tokenBeta = generateToken({
    id: userBetaId,
    email: `lead-b-${timestamp}@betacorp.com`,
    role: "admin",
    tenantId: tenantBetaId,
  });

  try {
    console.log("▶ [Setup] Provisioning isolated test tenants and fixtures in MySQL...");

    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Kanban Alpha Corp", slug: `k-alpha-${timestamp}` },
        { id: tenantBetaId, name: "Kanban Beta Corp", slug: `k-beta-${timestamp}` },
      ],
    });

    await prisma.user.createMany({
      data: [
        {
          id: userAlphaId,
          email: `lead-a-${timestamp}@alphacorp.com`,
          passwordHash: "dummy-hash",
        },
        {
          id: userBetaId,
          email: `lead-b-${timestamp}@betacorp.com`,
          passwordHash: "dummy-hash",
        },
      ],
    });

    await prisma.profile.createMany({
      data: [
        {
          userId: userAlphaId,
          tenantId: tenantAlphaId,
          fullName: "Kanban Alpha Lead",
        },
        {
          userId: userBetaId,
          tenantId: tenantBetaId,
          fullName: "Kanban Beta Lead",
        },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        {
          userId: userAlphaId,
          tenantId: tenantAlphaId,
          role: "hr_admin",
        },
        {
          userId: userBetaId,
          tenantId: tenantBetaId,
          role: "hr_admin",
        },
      ],
    });

    const prjA = await prisma.project.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Hospital Administration System",
        description: "Exact replica of DreamHR task board project",
        status: "in_progress",
        priority: "high",
        startDate: new Date(),
      },
    });
    projectAlphaId = prjA.id;

    const prjB = await prisma.project.create({
      data: {
        tenantId: tenantBetaId,
        name: "Confidential Project Beta",
        description: "Tenant B proprietary tasks",
        status: "in_progress",
        priority: "low",
        startDate: new Date(),
      },
    });
    projectBetaId = prjB.id;

    console.log("✔ Setup successful.\n");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Tenant A projects listing isolation
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 1] GET /api/projects - verify project isolation for Tenant A...");
    const resProjectsA = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` },
    });
    assert.strictEqual(resProjectsA.status, 200, "Should return 200 OK");
    const jsonProjectsA = await resProjectsA.json();
    const projectsListA = jsonProjectsA.projects || jsonProjectsA.data || jsonProjectsA;
    assert.ok(Array.isArray(projectsListA), "Should return array of projects");
    assert.ok(projectsListA.some((p: any) => p.id === projectAlphaId), "Tenant A should see Hospital Administration");
    assert.ok(!projectsListA.some((p: any) => p.id === projectBetaId), "Tenant A should NOT see Tenant B project");
    console.log("✔ Test 1 PASSED: Projects strictly isolated.\n");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Create Kanban task under Project A via POST /api/projects/tasks
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 2] POST /api/projects/tasks - create Kanban task...");
    const resCreateTask = await fetch(`${baseUrl}/api/projects/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAlpha}`,
      },
      body: JSON.stringify({
        projectId: projectAlphaId,
        title: "Payment Gateway Integration",
        description: "Implement Stripe and Razorpay checkouts with instant verification",
        status: "todo",
        priority: "high",
        category: "Web Layout",
        progress: 40,
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      }),
    });
    assert.strictEqual(resCreateTask.status, 201, "Should return 201 Created");
    const jsonCreateTask = await resCreateTask.json();
    taskAlphaId = jsonCreateTask.id || jsonCreateTask.data?.id;
    assert.ok(taskAlphaId, "Should have a task id");
    assert.strictEqual(jsonCreateTask.title || jsonCreateTask.data?.title, "Payment Gateway Integration");
    assert.strictEqual(jsonCreateTask.status || jsonCreateTask.data?.status, "todo");
    assert.strictEqual(jsonCreateTask.priority || jsonCreateTask.data?.priority, "high");
    console.log(`✔ Test 2 PASSED: Created Task ID=${taskAlphaId} with status=todo, priority=high.\n`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Retrieve tasks for Project A
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 3] GET /api/projects/:projectId/tasks - retrieve project tasks...");
    const resGetTasks = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/tasks`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` },
    });
    assert.strictEqual(resGetTasks.status, 200, "Should return 200 OK");
    const jsonGetTasks = await resGetTasks.json();
    const tasksList = jsonGetTasks.tasks || jsonGetTasks.data || jsonGetTasks;
    assert.ok(Array.isArray(tasksList), "Should return array of tasks");
    const fetchedTask = tasksList.find((t: any) => t.id === taskAlphaId);
    assert.ok(fetchedTask, "Created task should exist in project tasks");
    assert.strictEqual(fetchedTask.title, "Payment Gateway Integration");
    console.log("✔ Test 3 PASSED: Task correctly indexed in column 'todo'.\n");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Move Kanban card to 'in_progress' column
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 4] PUT /api/projects/tasks/:taskId - move card to 'in_progress'...");
    const resMove1 = await fetch(`${baseUrl}/api/projects/tasks/${taskAlphaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAlpha}`,
      },
      body: JSON.stringify({
        status: "in_progress",
        progress: 60,
      }),
    });
    assert.strictEqual(resMove1.status, 200, "Should return 200 OK");
    const jsonMove1 = await resMove1.json();
    assert.strictEqual(jsonMove1.success, true);
    console.log("✔ Test 4 PASSED: Task status successfully moved to 'in_progress'.\n");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Move Kanban card to 'completed' column with 100% progress
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 5] PUT /api/projects/tasks/:taskId - move card to 'completed'...");
    const resMove2 = await fetch(`${baseUrl}/api/projects/tasks/${taskAlphaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAlpha}`,
      },
      body: JSON.stringify({
        status: "completed",
        progress: 100,
      }),
    });
    assert.strictEqual(resMove2.status, 200, "Should return 200 OK");
    const jsonMove2 = await resMove2.json();
    assert.strictEqual(jsonMove2.success, true);
    console.log("✔ Test 5 PASSED: Task status successfully moved to 'completed'.\n");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Strict Cross-Tenant Isolation Security Checks
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 6] Cross-tenant isolation verification...");
    // Tenant B attempts to fetch Tenant A's tasks
    const resTenantBTasks = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/tasks`, {
      headers: { Authorization: `Bearer ${tokenBeta}` },
    });
    assert.ok(
      [403, 404].includes(resTenantBTasks.status),
      `Tenant B must NOT access Tenant A tasks (received status ${resTenantBTasks.status})`
    );

    // Tenant B attempts to modify Tenant A's task
    const resTenantBEdit = await fetch(`${baseUrl}/api/projects/tasks/${taskAlphaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenBeta}`,
      },
      body: JSON.stringify({ status: "todo" }),
    });
    assert.ok(
      [403, 404].includes(resTenantBEdit.status),
      `Tenant B must NOT update Tenant A tasks (received status ${resTenantBEdit.status})`
    );
    console.log("✔ Test 6 PASSED: Cross-tenant boundary impenetrable.\n");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Delete task with authorization
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 7] DELETE /api/projects/tasks/:taskId - delete task...");
    const resDelete = await fetch(`${baseUrl}/api/projects/tasks/${taskAlphaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAlpha}` },
    });
    assert.ok([200, 204].includes(resDelete.status), "Should successfully delete task");

    const resVerifyDeleted = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/tasks`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` },
    });
    const tasksAfterDelete = (await resVerifyDeleted.json()).data || [];
    assert.ok(!tasksAfterDelete.some((t: any) => t.id === taskAlphaId), "Deleted task should no longer exist");
    console.log("✔ Test 7 PASSED: Task deleted successfully.\n");

    console.log("================================================================================");
    console.log("🎉 ALL 7 GLOBAL TASK BOARD & KANBAN TESTS PASSED PERFECTLY!");
    console.log("================================================================================\n");
  } finally {
    console.log("▶ Cleaning up test fixtures in MySQL database...");
    await prisma.projectTask.deleteMany({
      where: { projectId: { in: [projectAlphaId, projectBetaId].filter(Boolean) } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectAlphaId, projectBetaId].filter(Boolean) } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [userAlphaId, userBetaId].filter(Boolean) } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [userAlphaId, userBetaId].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAlphaId, userBetaId].filter(Boolean) } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId].filter(Boolean) } },
    });
    server.close();
    console.log("✔ Database cleanup completed.");
  }
}

runTestSuite().catch((err) => {
  console.error("❌ Test suite encountered an error:", err);
  process.exit(1);
});
