import { generateToken } from "./lib/jwt";
import { prisma } from "./prisma";

const BASE_URL = "http://localhost:4000/api";

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log("=== Starting W1-C3 Project Details Passport Automated Verification ===");

  const timestamp = Date.now();
  const tenantA_id = `tenant-proj-a-${timestamp}`;
  const tenantB_id = `tenant-proj-b-${timestamp}`;



  // Create or find User A
  const userA = await prisma.user.create({
    data: {
      email: `admin-a-${timestamp}@example.com`,
      passwordHash: "dummyhash",
      profile: {
        create: {
          fullName: "Admin Alpha",
          tenantId: tenantA_id,
        },
      },
      roles: {
        create: {
          role: "hr_admin",
          tenantId: tenantA_id,
        },
      },
    },
  });

  // Create or find User B
  const userB = await prisma.user.create({
    data: {
      email: `admin-b-${timestamp}@example.com`,
      passwordHash: "dummyhash",
      profile: {
        create: {
          fullName: "Admin Beta",
          tenantId: tenantB_id,
        },
      },
      roles: {
        create: {
          role: "hr_admin",
          tenantId: tenantB_id,
        },
      },
    },
  });

  const tokenA = generateToken({
    userId: userA.id,
    email: userA.email,
    tenantId: tenantA_id,
    roles: ["admin"],
    permissions: ["projects.read", "projects.write", "projects.delete", "invoices.read", "invoices.write"],
  });

  const tokenB = generateToken({
    userId: userB.id,
    email: userB.email,
    tenantId: tenantB_id,
    roles: ["admin"],
    permissions: ["projects.read", "projects.write", "projects.delete", "invoices.read", "invoices.write"],
  });

  // 1. Unauthorized Access Blocked (HTTP 401)
  try {
    const unauthRes = await fetch(`${BASE_URL}/projects/any-project-id`);
    if (unauthRes.status === 401) {
      results.push({ name: "1. Unauthorized Access Blocked (HTTP 401)", passed: true });
    } else {
      results.push({
        name: "1. Unauthorized Access Blocked",
        passed: false,
        details: `Expected 401, got ${unauthRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "1. Unauthorized Access Blocked", passed: false, details: err.message });
  }

  // 2. Tenant A: Create Project
  let projectA_Id: string | null = null;
  try {
    const createRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: "Hospital Administration System",
        description: "Modernizing clinical workflows and appointment portals.",
        clientName: "EcoVision Healthcare",
        budget: 45000,
        priority: "high",
        startDate: "2026-01-15",
        dueDate: "2026-11-15",
      }),
    });

    if (createRes.status === 201) {
      const data = await createRes.json();
      projectA_Id = data.id;
      results.push({
        name: "2. Tenant A Project Creation",
        passed: true,
        details: `Created Project ID: ${projectA_Id}`,
      });
    } else {
      const err = await createRes.text();
      results.push({
        name: "2. Tenant A Project Creation",
        passed: false,
        details: `Status ${createRes.status}: ${err}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "2. Tenant A Project Creation", passed: false, details: err.message });
  }

  if (!projectA_Id) {
    console.error("FATAL: Project A creation failed, aborting remaining tests.");
    console.table(results);
    process.exit(1);
  }

  // 3. Tenant A: Retrieve Project Details by ID (GET /api/projects/:id)
  try {
    const getRes = await fetch(`${BASE_URL}/projects/${projectA_Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    if (getRes.status === 200) {
      const p = await getRes.json();
      const valid =
        p.id === projectA_Id &&
        p.name === "Hospital Administration System" &&
        p.tasksCount !== undefined &&
        Array.isArray(p.tasks) &&
        Array.isArray(p.team);
      results.push({
        name: "3. Valid Project Detail Retrieval (GET /api/projects/:id)",
        passed: valid,
        details: `Name: ${p.name}, Status: ${p.status}, TasksCount: ${JSON.stringify(p.tasksCount)}`,
      });
    } else {
      results.push({
        name: "3. Valid Project Detail Retrieval",
        passed: false,
        details: `Expected 200, got ${getRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "3. Valid Project Detail Retrieval", passed: false, details: err.message });
  }

  // 4. Nonexistent Project Returns 404
  try {
    const nonExistentRes = await fetch(`${BASE_URL}/projects/proj-does-not-exist-999`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (nonExistentRes.status === 404) {
      results.push({ name: "4. Nonexistent Project Returns 404", passed: true });
    } else {
      results.push({
        name: "4. Nonexistent Project Returns 404",
        passed: false,
        details: `Expected 404, got ${nonExistentRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "4. Nonexistent Project Returns 404", passed: false, details: err.message });
  }

  // 5. Cross-Tenant Isolation: Tenant B cannot read Tenant A's project
  try {
    const crossRes = await fetch(`${BASE_URL}/projects/${projectA_Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (crossRes.status === 404) {
      results.push({
        name: "5. Cross-Tenant GET Blocked (Tenant B cannot read Tenant A's project)",
        passed: true,
      });
    } else {
      results.push({
        name: "5. Cross-Tenant GET Blocked",
        passed: false,
        details: `Expected 404, got ${crossRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "5. Cross-Tenant GET Blocked", passed: false, details: err.message });
  }

  // 6. Cross-Tenant Isolation: Tenant B cannot update Tenant A's project
  try {
    const crossUpdateRes = await fetch(`${BASE_URL}/projects/${projectA_Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: "Hacked Project" }),
    });
    if (crossUpdateRes.status === 404) {
      results.push({
        name: "6. Cross-Tenant PUT Blocked (Tenant B cannot update Tenant A's project)",
        passed: true,
      });
    } else {
      results.push({
        name: "6. Cross-Tenant PUT Blocked",
        passed: false,
        details: `Expected 404, got ${crossUpdateRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "6. Cross-Tenant PUT Blocked", passed: false, details: err.message });
  }

  // 7. Tenant A: Create Tasks under Project
  let taskId1: string | null = null;
  let taskId2: string | null = null;
  try {
    const task1Res = await fetch(`${BASE_URL}/projects/${projectA_Id}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: "Patient Appointment Booking Module",
        description: "Payment gateway and doctor schedule integration.",
        priority: "high",
        status: "in_progress",
        assignee: "Lewis Hamilton",
        dueDate: "2026-06-30",
      }),
    });

    const task2Res = await fetch(`${BASE_URL}/projects/${projectA_Id}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
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

    if (task1Res.status === 201 && task2Res.status === 201) {
      const d1 = await task1Res.json();
      const d2 = await task2Res.json();
      taskId1 = d1.id;
      taskId2 = d2.id;
      results.push({
        name: "7. Task Creation Under Project (POST /api/projects/:id/tasks)",
        passed: true,
        details: `Tasks created: ${taskId1}, ${taskId2}`,
      });
    } else {
      results.push({
        name: "7. Task Creation Under Project",
        passed: false,
        details: `Status T1: ${task1Res.status}, T2: ${task2Res.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "7. Task Creation Under Project", passed: false, details: err.message });
  }

  // 8. Tenant A: Update Task Status and Verify Progress Recalculation
  try {
    if (taskId1) {
      const updateTaskRes = await fetch(`${BASE_URL}/projects/tasks/${taskId1}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });

      if (updateTaskRes.status === 200) {
        // Fetch project to verify progress updated
        const checkPrj = await fetch(`${BASE_URL}/projects/${projectA_Id}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        const prjData = await checkPrj.json();
        const progressMatches = prjData.tasksCount.completed === 1 && prjData.progress === 50;

        results.push({
          name: "8. Task Status Update & Live Progress Recalculation (50% progress)",
          passed: progressMatches,
          details: `Completed: ${prjData.tasksCount.completed}/2, Progress: ${prjData.progress}%`,
        });
      } else {
        results.push({
          name: "8. Task Status Update & Live Progress Recalculation",
          passed: false,
          details: `Update task status ${updateTaskRes.status}`,
        });
      }
    }
  } catch (err: any) {
    results.push({
      name: "8. Task Status Update & Live Progress Recalculation",
      passed: false,
      details: err.message,
    });
  }

  // 9. Tenant A: Project Update (Metadata, Budget, Client)
  try {
    const updatePrjRes = await fetch(`${BASE_URL}/projects/${projectA_Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: "Hospital Administration System Pro",
        budget: 55000,
        clientName: "EcoVision Global Health",
        priority: "critical",
      }),
    });

    if (updatePrjRes.status === 200) {
      const updatedData = await updatePrjRes.json();
      const valid =
        updatedData.name === "Hospital Administration System Pro" &&
        updatedData.budget === 55000 &&
        updatedData.priority === "critical" &&
        updatedData.clientName === "EcoVision Global Health";
      results.push({
        name: "9. Project Update (PUT /api/projects/:id)",
        passed: valid,
        details: `Name: ${updatedData.name}, Budget: ${updatedData.budget}, Client: ${updatedData.clientName}`,
      });
    } else {
      results.push({
        name: "9. Project Update",
        passed: false,
        details: `Expected 200, got ${updatePrjRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "9. Project Update", passed: false, details: err.message });
  }

  // 10. Tenant A: Delete Task (DELETE /api/projects/tasks/:taskId)
  try {
    if (taskId2) {
      const delTaskRes = await fetch(`${BASE_URL}/projects/tasks/${taskId2}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      if (delTaskRes.status === 200) {
        results.push({
          name: "10. Task Deletion (DELETE /api/projects/tasks/:taskId)",
          passed: true,
        });
      } else {
        results.push({
          name: "10. Task Deletion",
          passed: false,
          details: `Expected 200, got ${delTaskRes.status}`,
        });
      }
    }
  } catch (err: any) {
    results.push({ name: "10. Task Deletion", passed: false, details: err.message });
  }

  // 11. Timesheet Auto-Invoice Generation (POST /api/projects/:id/generate-invoice)
  try {
    const invRes = await fetch(`${BASE_URL}/projects/${projectA_Id}/generate-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        hourlyRate: 2000,
        customHours: 50,
        taxPercent: 18,
        notes: "Sprint 1 & 2 Completed Deliverables for Hospital Administration",
      }),
    });

    if (invRes.status === 201) {
      const invData = await invRes.json();
      const valid = invData.id && (invData.total === 118000 || invData.subtotal === 100000);
      results.push({
        name: "11. Project Timesheet Invoice Auto-Generation",
        passed: valid,
        details: `Invoice #${invData.invoiceNo || invData.id}, Total: ${invData.total}`,
      });
    } else {
      const err = await invRes.text();
      results.push({
        name: "11. Project Timesheet Invoice Auto-Generation",
        passed: false,
        details: `Expected 201, got ${invRes.status}: ${err}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: "11. Project Timesheet Invoice Auto-Generation",
      passed: false,
      details: err.message,
    });
  }

  // 12. Cleanup: Delete Test Project & Tasks
  try {
    const delRes = await fetch(`${BASE_URL}/projects/${projectA_Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (delRes.status === 200) {
      results.push({
        name: "12. Tenant A Project Cleanup (DELETE /api/projects/:id)",
        passed: true,
      });
    } else {
      results.push({
        name: "12. Tenant A Project Cleanup",
        passed: false,
        details: `Expected 200, got ${delRes.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: "12. Tenant A Project Cleanup", passed: false, details: err.message });
  }

  // Cleanup users and policies
  try {
    await prisma.userRole.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  } catch {}

  console.log("\n=== Test Results Summary ===");
  console.table(results);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`\nTests: ${passedCount}/${totalCount} passed (${Math.round((passedCount / totalCount) * 100)}%)`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
