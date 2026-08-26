import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import crypto from "crypto";
import net from "net";
import { pullAttendanceLogsFromZkDevice } from "../services/zk-protocol";
import { provisionEmployeeUser } from "../lib/auth-helpers";

export const biometricRouter = Router();
export const publicBiometricRouter = Router();
export const iclockRouter = Router();

// Device ADMS Command Queue for real historical memory flush
export const deviceCommandQueue = new Map<string, string>();

// Core helper: Process Biometric Punch & Atomic Attendance Record Synchronization
export async function processBiometricPunch({
  tenantId,
  deviceId,
  employeeCode,
  punchTime,
  punchType = "auto",
  verificationMode = "fingerprint",
  rawPayload,
}: {
  tenantId: string;
  deviceId?: string;
  employeeCode: string;
  punchTime: Date;
  punchType?: string;
  verificationMode?: string;
  rawPayload?: string;
}) {
  // 1. Find employee by employeeCode or phone/email matching
  const strippedCode = employeeCode.replace(/^0+/, "") || employeeCode;
  const employee = await prisma.employee.findFirst({
    where: {
      tenantId,
      OR: [
        { employeeCode },
        { employeeCode: strippedCode },
        { employeeCode: `0${strippedCode}` },
        { employeeCode: `00${strippedCode}` },
        { employeeCode: `EMP-${employeeCode}` },
        { employeeCode: `EMP-${strippedCode}` },
        { employeeCode: `EMP-0${strippedCode}` },
        { employeeCode: `EMP-00${strippedCode}` },
        { employeeCode: `EMP-10${strippedCode}` },
        { employeeCode: `EMP-100${strippedCode}` },
      ],
    },
  });

  const employeeId = employee ? employee.id : null;
  const syncStatus = employee ? "processed" : "unmatched_employee";

  // 2. Resolve target device
  let deviceRecord = null;
  if (deviceId) {
    deviceRecord = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
  } else {
    deviceRecord = await prisma.biometricDevice.findFirst({ where: { tenantId } });
  }

  const resolvedDeviceId = deviceRecord ? deviceRecord.id : (await prisma.biometricDevice.findFirst({ where: { tenantId } }))?.id;

  if (!resolvedDeviceId) {
    throw new Error("No registered biometric device found for this organization.");
  }

  // Check if punch log already recorded for this exact timestamp
  const existingLog = await prisma.biometricPunchLog.findFirst({
    where: {
      tenantId,
      employeeCode,
      punchTime,
    },
  });

  if (existingLog) {
    if (employee && existingLog.syncStatus !== "processed") {
      await prisma.biometricPunchLog.update({
        where: { id: existingLog.id },
        data: { employeeId: employee.id, syncStatus: "processed" },
      });
    }
    return existingLog;
  }

  // 3. Record raw BiometricPunchLog
  const punchLog = await prisma.biometricPunchLog.create({
    data: {
      tenantId,
      deviceId: resolvedDeviceId,
      employeeCode,
      employeeId,
      punchTime,
      punchType,
      verificationMode,
      syncStatus,
      rawPayload: rawPayload || JSON.stringify({ employeeCode, punchTime, verificationMode }),
    },
    include: {
      device: true,
      employee: {
        include: { department: true },
      },
    },
  });

  // Increment device punch count & update lastSyncAt
  await prisma.biometricDevice.update({
    where: { id: resolvedDeviceId },
    data: {
      totalPunchLogs: { increment: 1 },
      lastSyncAt: new Date(),
      status: "online",
    },
  });

  // 4. Auto-sync with Attendance Table if employee is matched
  if (employee) {
    const punchDateOnly = new Date(punchTime.getFullYear(), punchTime.getMonth(), punchTime.getDate(), 0, 0, 0);

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: employee.id,
          date: punchDateOnly,
        },
      },
    });

    if (!existingAttendance) {
      // First punch of the day -> Mark checkIn
      await prisma.attendance.create({
        data: {
          tenantId,
          employeeId: employee.id,
          date: punchDateOnly,
          checkIn: punchTime,
          status: "present",
          notes: `Biometric [${deviceRecord?.deviceName || "Terminal"}] (${verificationMode})`,
        },
      });
    } else {
      // Multiple punches -> Update checkIn (earliest) and checkOut (latest)
      const currentCheckIn = existingAttendance.checkIn ? new Date(existingAttendance.checkIn) : punchTime;
      const currentCheckOut = existingAttendance.checkOut ? new Date(existingAttendance.checkOut) : null;

      const newCheckIn = punchTime < currentCheckIn ? punchTime : currentCheckIn;
      let newCheckOut = currentCheckOut;

      if (!currentCheckOut) {
        if (punchTime > newCheckIn) newCheckOut = punchTime;
      } else {
        if (punchTime > currentCheckOut) newCheckOut = punchTime;
      }

      let calculatedHours = 0;
      if (newCheckIn && newCheckOut) {
        const diffMs = newCheckOut.getTime() - newCheckIn.getTime();
        calculatedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      let calculatedStatus: any = "present";
      if (calculatedHours < 4 && calculatedHours > 0) {
        calculatedStatus = "half_day";
      }

      await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkIn: newCheckIn,
          checkOut: newCheckOut,
          hours: calculatedHours,
          status: calculatedStatus,
          notes: `${existingAttendance.notes || ""} | Out: [${deviceRecord?.deviceName || "Terminal"}]`,
        },
      });
    }

    // Broadcast WebSocket live punch update to tenant room
    try {
      broadcastToTenant(tenantId, "biometric:punch", {
        punchLog,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.departmentId,
        punchTime: punchTime.toISOString(),
      });
    } catch {
      // Socket fail-safe
    }
  }

  return punchLog;
}

/**
 * GET /api/biometric/devices
 * List all real biometric terminals registered for tenant
 */
biometricRouter.get("/devices", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const devices = await prisma.biometricDevice.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { punchLogs: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(devices);
  } catch (err: any) {
    console.error("[GET /api/biometric/devices] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch biometric devices." });
  }
});

/**
 * GET /api/biometric/cloud-config
 * Returns real server cloud parameters for hardware machine configuration
 */
biometricRouter.get("/cloud-config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const host = req.get("host") || "localhost:4000";
    const protocol = req.protocol === "https" ? "https" : "http";

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    return res.json({
      serverHost: host.split(":")[0],
      serverPort: host.split(":")[1] || (req.protocol === "https" ? 443 : 80),
      admsPushUrl: `${protocol}://${host}/iclock/cdata`,
      genericWebhookUrl: `${protocol}://${host}/api/public/biometric/push`,
      tenantOrgKey: tenantId,
      organizationName: tenant?.name || "Master Workspace",
      protocolsSupported: ["iClock ADMS Push (ZKTeco/eSSL/Realtime)", "Direct TCP/IP (4370)", "JSON HTTP Webhook", "Hikvision ISUP / Cloud"],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch cloud config." });
  }
});

/**
 * GET /api/biometric/summary/stats
 * Metrics: total devices, online count, today's punches, unmatched logs
 */
biometricRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const devices = await prisma.biometricDevice.findMany({ where: { tenantId } });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayPunchesCount = await prisma.biometricPunchLog.count({
      where: {
        tenantId,
        punchTime: { gte: todayStart },
      },
    });

    const unmatchedCount = await prisma.biometricPunchLog.count({
      where: {
        tenantId,
        syncStatus: "unmatched_employee",
      },
    });

    const totalDevices = devices.length;
    const onlineDevices = devices.filter((d: any) => d.status === "online").length;

    return res.json({
      totalDevices,
      onlineDevices,
      todayPunchesCount,
      unmatchedCount,
    });
  } catch (err: any) {
    console.error("[GET /api/biometric/summary/stats] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch biometric metrics." });
  }
});

/**
 * GET /api/biometric/devices/:id/passport
 * Fetches deep machine identity, enrolled biometric templates (fingerprint, face, card),
 * and time-range punch logs (daily, weekly, monthly, all).
 */
biometricRouter.get("/devices/:id/passport", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { period = "daily" } = req.query;

    const device = await prisma.biometricDevice.findUnique({
      where: { id },
      include: {
        _count: {
          select: { punchLogs: true },
        },
      },
    });

    if (!device || (tenantId && device.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Biometric device not found." });
    }

    // Determine time range boundary
    const now = new Date();
    let dateFilter: any = undefined;

    if (period === "daily") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      dateFilter = { gte: startOfDay };
    } else if (period === "weekly") {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: startOfWeek };
    } else if (period === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    }

    const wherePunch: any = { deviceId: id };
    if (dateFilter) {
      wherePunch.punchTime = dateFilter;
    }

    // Fetch logs for this period
    const punchLogs = await prisma.biometricPunchLog.findMany({
      where: wherePunch,
      include: {
        employee: {
          include: { department: true },
        },
      },
      orderBy: { punchTime: "desc" },
      take: 200,
    });

    // Compute device enrolled capabilities breakdown
    const allDevicePunches = await prisma.biometricPunchLog.findMany({
      where: { deviceId: id },
      select: { employeeCode: true, verificationMode: true },
    });

    const uniqueFingerprintStaff = new Set(
      allDevicePunches.filter((p: any) => p.verificationMode === "fingerprint").map((p: any) => p.employeeCode)
    );
    const uniqueFaceStaff = new Set(
      allDevicePunches.filter((p: any) => p.verificationMode === "face").map((p: any) => p.employeeCode)
    );
    const uniqueCardStaff = new Set(
      allDevicePunches.filter((p: any) => p.verificationMode === "rfid").map((p: any) => p.employeeCode)
    );

    const periodUniqueStaff = new Set(punchLogs.map((p: any) => p.employeeCode));

    const totalFingerprints = uniqueFingerprintStaff.size;
    const totalFaces = uniqueFaceStaff.size;
    const totalCards = uniqueCardStaff.size;
    const totalPunchesInPeriod = punchLogs.length;
    const uniqueStaffInPeriod = periodUniqueStaff.size;

    return res.json({
      device,
      period,
      stats: {
        totalFingerprints,
        totalFaces,
        totalCards,
        totalPunchesInPeriod,
        uniqueStaffInPeriod,
        allTimePunches: device._count.punchLogs || device.totalPunchLogs,
      },
      punchLogs,
    });
  } catch (err: any) {
    console.error("[GET /api/biometric/devices/:id/passport] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch device passport." });
  }
});

/**
 * POST /api/biometric/devices/:id/sync-now
 * Force immediate device sync handshake, query physical hardware memory,
 * and pull all unread attendance punch records into the system.
 */
biometricRouter.post("/devices/:id/sync-now", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device) return res.status(404).json({ error: "Device not found." });

    let pulledRecordsCount = 0;
    let syncMessage = "";

    // 1. Direct Local TCP/IP Query (If IP is specified)
    if (device.ipAddress && device.ipAddress !== "0.0.0.0" && device.ipAddress.includes(".")) {
      try {
        const zkResult = await pullAttendanceLogsFromZkDevice(device.ipAddress, device.port || 4370, 4000);
        if (zkResult.records && zkResult.records.length > 0) {
          for (const rec of zkResult.records) {
            await processBiometricPunch({
              tenantId: device.tenantId,
              deviceId: device.id,
              employeeCode: rec.employeeCode,
              punchTime: rec.punchTime,
              verificationMode: rec.verifyModeName,
              rawPayload: JSON.stringify(rec),
            });
            pulledRecordsCount++;
          }
          syncMessage = `Successfully pulled ${pulledRecordsCount} attendance punch logs directly from machine memory!`;
        } else {
          syncMessage = `Connected to ${device.deviceName} (${device.ipAddress}:${device.port}). Device is online. (0 new unread logs in hardware buffer).`;
        }
      } catch (tcpErr: any) {
        console.warn("[SYNC-NOW DIRECT TCP QUERY] Warning:", tcpErr.message);
        syncMessage = `Terminal is active. Direct TCP returned: ${tcpErr.message}`;
      }
    }

    // 2. Queue ADMS memory dump command for cloud push machines
    if (device.serialNumber) {
      deviceCommandQueue.set(device.serialNumber, "C:101:DATA QUERY ATTLOG");
      if (!syncMessage) {
        syncMessage = `Cloud Sync Command Queued: Terminal [${device.deviceName}] will dump all historical attendance records on next heartbeat.`;
      }
    }

    const updated = await prisma.biometricDevice.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        status: "online",
      },
    });

    return res.json({
      success: true,
      message: syncMessage,
      pulledRecordsCount,
      device: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Sync failed." });
  }
});

/**
 * GET /api/biometric/devices/:id/hardware-users
 * Scans physical machine memory in real-time, fetches all 45+ enrolled users,
 * and matches each with HRMS employee directory.
 */
biometricRouter.get("/devices/:id/hardware-users", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device || device.tenantId !== tenantId) {
      return res.status(404).json({ error: "Biometric device not found." });
    }

    let hardwareUsers: any[] = [];
    let hardwareInfo: any = null;

    if (device.ipAddress && device.ipAddress.includes(".")) {
      const zkResult = await pullAttendanceLogsFromZkDevice(device.ipAddress, device.port || 4370, 8000);
      hardwareUsers = zkResult.users || [];
      hardwareInfo = zkResult.info || null;
    }

    // Match each hardware user with our HRMS Employee database
    const allEmployees = await prisma.employee.findMany({
      where: { tenantId },
      include: { department: true },
    });

    const mappedUsers = hardwareUsers.map((u: any) => {
      const bioId = String(u.userId || u.uid || "").trim();
      const strippedBioId = bioId.replace(/^0+/, "");

      const matchedEmp = allEmployees.find(
        (e: any) =>
          e.employeeCode === bioId ||
          e.employeeCode === strippedBioId ||
          e.employeeCode === `EMP-${bioId}` ||
          e.employeeCode === `EMP-${strippedBioId}` ||
          `${e.firstName} ${e.lastName}`.trim().toLowerCase() === String(u.name || "").trim().toLowerCase()
      );

      return {
        uid: u.uid,
        biometricId: bioId,
        name: u.name || `User ${bioId}`,
        cardno: u.cardno || 0,
        role: u.role || 0,
        password: u.password || "",
        isMatched: !!matchedEmp,
        matchedEmployee: matchedEmp
          ? {
              id: matchedEmp.id,
              employeeCode: matchedEmp.employeeCode,
              name: `${matchedEmp.firstName} ${matchedEmp.lastName}`,
              email: matchedEmp.email,
              department: matchedEmp.department?.name || "General",
            }
          : null,
      };
    });

    return res.json({
      device,
      hardwareInfo,
      totalHardwareUsers: mappedUsers.length,
      matchedCount: mappedUsers.filter((u: any) => u.isMatched).length,
      unmatchedCount: mappedUsers.filter((u: any) => !u.isMatched).length,
      users: mappedUsers,
    });
  } catch (err: any) {
    console.error("[GET /api/biometric/devices/:id/hardware-users] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch hardware users." });
  }
});

/**
 * POST /api/biometric/devices/:id/apply-sync
 * Applies hardware data to database:
 * 1. Auto-creates/links any unmapped employees directly from their real machine names and Biometric IDs.
 * 2. Pulls all attendance punch logs with exact local timezone preservation (+05:30 IST).
 * 3. Calculates complete daily attendance sheet for all employees.
 */
biometricRouter.post("/devices/:id/apply-sync", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { importUnmappedUsers = true, syncPunches = true, userMappings = [] } = req.body;

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device || device.tenantId !== tenantId) {
      return res.status(404).json({ error: "Biometric device not found." });
    }

    if (!device.ipAddress || !device.ipAddress.includes(".")) {
      return res.status(400).json({ error: "Device IP address is required for direct hardware sync." });
    }

    // 1. Query Hardware for Live Users and Attendance Logs
    const zkResult = await pullAttendanceLogsFromZkDevice(device.ipAddress, device.port || 4370, 15000);
    if (!zkResult.success && zkResult.records.length === 0 && zkResult.users.length === 0) {
      return res.status(500).json({ error: zkResult.message || "Could not connect to biometric device." });
    }

    let createdEmployeesCount = 0;
    const existingEmployees = await prisma.employee.findMany({ where: { tenantId } });

    // 2. Auto-create/map Employees from Machine Enrolled Users
    if (importUnmappedUsers && zkResult.users.length > 0) {
      for (const u of zkResult.users) {
        const bioId = String(u.userId || u.uid || "").trim();
        const rawName = String(u.name || "").trim() || `Staff ${bioId}`;

        const exists = existingEmployees.find(
          (e: any) =>
            e.employeeCode === bioId ||
            e.employeeCode === bioId.replace(/^0+/, "") ||
            `${e.firstName} ${e.lastName}`.trim().toLowerCase() === rawName.toLowerCase()
        );

        if (!exists) {
          const nameParts = rawName.split(/\s+/);
          const firstName = nameParts[0] || `Employee`;
          const lastName = nameParts.slice(1).join(" ") || bioId;
          const cleanEmailSlug = rawName.toLowerCase().replace(/[^a-z0-9]/g, "") || `staff${bioId}`;
          const cleanEmail = `${cleanEmailSlug}@tsvhomes.in`;
          let userId: string | undefined;
          try {
            userId = await provisionEmployeeUser(prisma, {
              tenantId,
              email: cleanEmail,
              firstName,
              lastName,
              password: "Password@123",
            });
          } catch (e) {}

          const created = await prisma.employee.create({
            data: {
              tenantId,
              userId: userId || null,
              employeeCode: bioId,
              firstName,
              lastName,
              email: cleanEmail,
              status: "active",
              employmentType: "full_time",
            },
          });
          existingEmployees.push(created);
          createdEmployeesCount++;
        }
      }
    }

    // Fast employee lookup map
    const empLookup = new Map();
    for (const emp of existingEmployees) {
      const code = String(emp.employeeCode).trim();
      const stripped = code.replace(/^0+/, "") || code;
      empLookup.set(code, emp);
      empLookup.set(stripped, emp);
      empLookup.set(`0${stripped}`, emp);
      empLookup.set(`00${stripped}`, emp);
      empLookup.set(`EMP-${code}`, emp);
      empLookup.set(`EMP-${stripped}`, emp);
    }

    // 3. Batch Ingestion of Punch Logs & Daily Attendance Aggregation
    let syncedPunchesCount = 0;
    let attendanceDaysCalculated = 0;

    if (syncPunches && zkResult.records.length > 0) {
      const punchLogsToInsert: any[] = [];
      const dailyPunchesGroup = new Map<string, { tenantId: string; employeeId: string; date: Date; punches: Date[] }>();

      for (const r of zkResult.records) {
        const empCode = String(r.employeeCode || "").trim();
        const punchDate = r.punchTime;

        if (!empCode || !punchDate || isNaN(punchDate.getTime())) continue;

        const matchedEmp = empLookup.get(empCode) || empLookup.get(empCode.replace(/^0+/, ""));
        const employeeId = matchedEmp ? matchedEmp.id : null;
        const syncStatus = matchedEmp ? "processed" : "unmatched_employee";

        punchLogsToInsert.push({
          tenantId,
          deviceId: device.id,
          employeeCode: empCode,
          employeeId,
          punchTime: punchDate,
          punchType: "auto",
          verificationMode: r.verifyModeName || "fingerprint",
          syncStatus,
          rawPayload: JSON.stringify(r.rawRecord || { empCode, punchDate }),
        });

        if (employeeId) {
          const year = punchDate.getFullYear();
          const month = punchDate.getMonth();
          const date = punchDate.getDate();
          const dateKey = `${employeeId}_${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

          if (!dailyPunchesGroup.has(dateKey)) {
            dailyPunchesGroup.set(dateKey, {
              tenantId,
              employeeId,
              date: new Date(Date.UTC(year, month, date)),
              punches: [],
            });
          }
          dailyPunchesGroup.get(dateKey)!.punches.push(punchDate);
        }
      }

      // Bulk insert punch logs in chunks of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < punchLogsToInsert.length; i += CHUNK_SIZE) {
        const chunk = punchLogsToInsert.slice(i, i + CHUNK_SIZE);
        await prisma.biometricPunchLog.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
      syncedPunchesCount = punchLogsToInsert.length;

      // Upsert Daily Attendance Records for all matched employees
      for (const [key, group] of dailyPunchesGroup.entries()) {
        group.punches.sort((a, b) => a.getTime() - b.getTime());
        const firstPunch = group.punches[0];
        const lastPunch = group.punches.length > 1 ? group.punches[group.punches.length - 1] : null;

        let workHours = 0;
        if (firstPunch && lastPunch) {
          workHours = Number(((lastPunch.getTime() - firstPunch.getTime()) / (1000 * 60 * 60)).toFixed(2));
        }

        await prisma.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId: group.tenantId,
              employeeId: group.employeeId,
              date: group.date,
            },
          },
          create: {
            tenantId: group.tenantId,
            employeeId: group.employeeId,
            date: group.date,
            checkIn: firstPunch,
            checkOut: lastPunch,
            hours: workHours,
            status: "present",
          },
          update: {
            checkIn: firstPunch,
            checkOut: lastPunch,
            hours: workHours,
            status: "present",
          },
        });
        attendanceDaysCalculated++;
      }
    }

    // 4. Update Device Metrics
    const updatedDevice = await prisma.biometricDevice.update({
      where: { id: device.id },
      data: {
        totalPunchLogs: zkResult.info?.logCount || zkResult.records.length,
        lastSyncAt: new Date(),
        status: "online",
      },
    });

    broadcastToTenant(tenantId, "BIOMETRIC_PUNCH", {
      deviceId: device.id,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Full hardware synchronization complete! Created/mapped ${existingEmployees.length} employees, ingested ${syncedPunchesCount} punch logs, and calculated ${attendanceDaysCalculated} daily attendance records.`,
      createdEmployeesCount,
      totalEmployees: existingEmployees.length,
      syncedPunchesCount,
      attendanceDaysCalculated,
      totalHardwareUsers: zkResult.users.length,
      totalHardwareLogs: zkResult.records.length,
      device: updatedDevice,
    });
  } catch (err: any) {
    console.error("[POST /api/biometric/devices/:id/apply-sync] error:", err);
    return res.status(500).json({ error: err.message || "Hardware apply-sync failed." });
  }
});

/**
 * POST /api/biometric/devices/:id/map-employee
 * Links a specific hardware biometric ID to an HRMS employee
 */
biometricRouter.post("/devices/:id/map-employee", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { employeeId, biometricId } = req.body;
    if (!employeeId || !biometricId) {
      return res.status(400).json({ error: "Employee ID and Biometric ID are required." });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: { employeeCode: String(biometricId).trim() },
    });

    // Re-link any existing unmatched punches with this biometric ID
    await prisma.biometricPunchLog.updateMany({
      where: {
        tenantId,
        employeeCode: String(biometricId).trim(),
      },
      data: {
        employeeId: updatedEmployee.id,
        syncStatus: "processed",
      },
    });

    return res.json({
      success: true,
      message: `Employee [${updatedEmployee.firstName} ${updatedEmployee.lastName}] successfully linked to Biometric ID #${biometricId}!`,
      employee: updatedEmployee,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to map employee." });
  }
});

/**
 * GET /api/biometric/logs
 * List live raw punch logs with employee verification details
 */
biometricRouter.get("/logs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { deviceId, employeeCode, syncStatus, limit = "50" } = req.query;
    const where: any = { tenantId };

    if (deviceId && deviceId !== "all") {
      where.deviceId = String(deviceId);
    }
    if (employeeCode) {
      where.employeeCode = { contains: String(employeeCode) };
    }
    if (syncStatus && syncStatus !== "all") {
      where.syncStatus = String(syncStatus);
    }

    const logs = await prisma.biometricPunchLog.findMany({
      where,
      include: {
        device: true,
        employee: {
          include: { department: true },
        },
      },
      orderBy: { punchTime: "desc" },
      take: Math.min(Number(limit) || 50, 100),
    });

    return res.json(logs);
  } catch (err: any) {
    console.error("[GET /api/biometric/logs] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch biometric punch logs." });
  }
});

/**
 * POST /api/biometric/probe
 * Auto-Probe IP & Port: Tests connection and automatically registers/discovers any hardware machine
 */
biometricRouter.post("/probe", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { ipAddress, port = 4370, deviceName, location } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: "IP Address is required for network probe." });
    }

    const host = String(ipAddress).trim();
    const targetPort = Number(port) || 4370;
    const startTime = Date.now();

    // Perform TCP Socket Handshake Probe
    const probePromise = new Promise<{ ok: boolean; latencyMs: number; error?: string }>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);

      socket.connect(targetPort, host, () => {
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        resolve({ ok: true, latencyMs });
      });

      socket.on("error", (err) => {
        socket.destroy();
        resolve({ ok: false, latencyMs: Date.now() - startTime, error: err.message });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ ok: false, latencyMs: Date.now() - startTime, error: "Connection timed out (no response within 3s)" });
      });
    });

    const probeResult = await probePromise;

    if (!probeResult.ok) {
      return res.status(502).json({
        success: false,
        message: `Could not reach biometric terminal at ${host}:${targetPort}. Please verify device IP and network cables. (${probeResult.error})`,
        latencyMs: `${probeResult.latencyMs}ms`,
      });
    }

    // Auto-derive device serial number or identifier from probe
    const autoSerialNumber = `BIO-${host.replace(/\./g, "")}-${targetPort}`;
    const autoDeviceName = deviceName?.trim() || `Biometric Terminal (${host})`;

    // Upsert or create device
    let device = await prisma.biometricDevice.findFirst({
      where: { tenantId, ipAddress: host, port: targetPort },
    });

    if (!device) {
      device = await prisma.biometricDevice.create({
        data: {
          tenantId,
          deviceName: autoDeviceName,
          deviceModel: "Universal Biometric Device",
          deviceType: "hybrid",
          ipAddress: host,
          port: targetPort,
          serialNumber: autoSerialNumber,
          location: location?.trim() || "Main Entrance",
          syncProtocol: "pull_tcp_ip",
          apiKey: `bio_key_${crypto.randomBytes(16).toString("hex")}`,
          status: "online",
          lastSyncAt: new Date(),
          autoAttendanceSync: true,
        },
      });
    } else {
      device = await prisma.biometricDevice.update({
        where: { id: device.id },
        data: {
          status: "online",
          lastSyncAt: new Date(),
          location: location ? location.trim() : device.location,
        },
      });
    }

    return res.json({
      success: true,
      message: `Successfully connected & discovered hardware terminal at ${host}:${targetPort}!`,
      latencyMs: `${probeResult.latencyMs}ms`,
      device,
    });
  } catch (err: any) {
    console.error("[POST /api/biometric/probe] error:", err);
    return res.status(500).json({ error: err.message || "Probe execution failed." });
  }
});

/**
 * POST /api/biometric/devices
 * Register any biometric terminal (Universal support: ZKTeco, eSSL, Realtime, Hikvision, Matrix, Mantra, Biomax, Suprema, etc.)
 */
biometricRouter.post("/devices", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      deviceName,
      deviceModel,
      deviceType,
      ipAddress,
      port,
      serialNumber,
      location,
      syncProtocol,
      autoAttendanceSync,
    } = req.body;

    if (!deviceName) {
      return res.status(400).json({ error: "Device Name is required." });
    }

    const resolvedSerialNumber = serialNumber?.trim() || `SN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const apiKey = `bio_key_${crypto.randomBytes(16).toString("hex")}`;

    const newDevice = await prisma.biometricDevice.create({
      data: {
        tenantId,
        deviceName: deviceName.trim(),
        deviceModel: deviceModel?.trim() || "Universal Biometric Reader",
        deviceType: deviceType || "hybrid",
        ipAddress: ipAddress ? ipAddress.trim() : null,
        port: Number(port) || 4370,
        serialNumber: resolvedSerialNumber,
        location: location?.trim() || "Main Entrance",
        syncProtocol: syncProtocol || "push_api_webhook",
        apiKey,
        autoAttendanceSync: autoAttendanceSync !== undefined ? Boolean(autoAttendanceSync) : true,
        status: "online",
        lastSyncAt: new Date(),
      },
    });

    return res.status(201).json(newDevice);
  } catch (err: any) {
    console.error("[POST /api/biometric/devices] error:", err);
    return res.status(500).json({ error: err.message || "Failed to register biometric device." });
  }
});

/**
 * PUT /api/biometric/devices/:id
 * Update device config
 */
biometricRouter.put("/devices/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      deviceName,
      deviceModel,
      deviceType,
      ipAddress,
      port,
      serialNumber,
      location,
      status,
      autoAttendanceSync,
    } = req.body;

    const updated = await prisma.biometricDevice.update({
      where: { id },
      data: {
        deviceName,
        deviceModel,
        deviceType,
        ipAddress: ipAddress ? ipAddress.trim() : undefined,
        port: port ? Number(port) : undefined,
        serialNumber,
        location,
        status,
        autoAttendanceSync: autoAttendanceSync !== undefined ? Boolean(autoAttendanceSync) : undefined,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update device." });
  }
});

/**
 * DELETE /api/biometric/devices/:id
 * Delete device
 */
biometricRouter.delete("/devices/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.biometricDevice.delete({ where: { id } });
    return res.json({ success: true, message: "Biometric device removed." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete device." });
  }
});

/**
 * POST /api/biometric/devices/:id/ping
 * Real TCP Network Connection Test to Hardware Device IP & Port
 */
biometricRouter.post("/devices/:id/ping", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device) return res.status(404).json({ error: "Device not found." });

    if (!device.ipAddress) {
      // If cloud push mode without static IP, check lastSyncAt freshness
      const isRecentlyActive = device.lastSyncAt && (Date.now() - new Date(device.lastSyncAt).getTime()) < 15 * 60 * 1000;
      return res.json({
        success: true,
        message: `Cloud Push Mode: Device was last active at ${device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleTimeString() : "N/A"}.`,
        status: isRecentlyActive ? "online" : "offline",
      });
    }

    const host = device.ipAddress.trim();
    const port = device.port || 4370;
    const startTime = Date.now();

    // Perform actual TCP connection test with timeout
    const checkTcpConnection = () =>
      new Promise<{ ok: boolean; latencyMs: number; error?: string }>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2500);

        socket.connect(port, host, () => {
          const latencyMs = Date.now() - startTime;
          socket.destroy();
          resolve({ ok: true, latencyMs });
        });

        socket.on("error", (err) => {
          socket.destroy();
          resolve({ ok: false, latencyMs: Date.now() - startTime, error: err.message });
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve({ ok: false, latencyMs: Date.now() - startTime, error: "Connection timed out (no response within 2.5s)" });
        });
      });

    const result = await checkTcpConnection();

    if (result.ok) {
      await prisma.biometricDevice.update({
        where: { id },
        data: {
          status: "online",
          lastSyncAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `Connection successful! Hardware reachable at ${host}:${port}`,
        latencyMs: `${result.latencyMs}ms`,
        status: "online",
      });
    } else {
      await prisma.biometricDevice.update({
        where: { id },
        data: { status: "offline" },
      });

      return res.status(502).json({
        success: false,
        message: `Hardware unreachable at ${host}:${port}. Reason: ${result.error || "Host offline"}`,
        status: "offline",
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Ping execution failed." });
  }
});

/**
 * POST /api/biometric/simulate
 * Admin test simulation: Simulate biometric fingerprint/face punch for an employee
 */
biometricRouter.post("/simulate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { deviceId, employeeCode, verificationMode, punchType } = req.body;

    if (!employeeCode) {
      return res.status(400).json({ error: "Employee Code is required." });
    }

    const punchLog = await processBiometricPunch({
      tenantId,
      deviceId,
      employeeCode,
      punchTime: new Date(),
      punchType: punchType || "auto",
      verificationMode: verificationMode || "fingerprint",
      rawPayload: JSON.stringify({
        simulated: true,
        verificationMode,
        timestamp: new Date().toISOString(),
      }),
    });

    return res.status(201).json({
      success: true,
      message: `Biometric ${verificationMode} punch recorded for ${employeeCode}! Attendance updated.`,
      punchLog,
    });
  } catch (err: any) {
    console.error("[POST /api/biometric/simulate] error:", err);
    return res.status(500).json({ error: err.message || "Failed to simulate biometric punch." });
  }
});

// --------------------------------------------------------------------------
// UNIVERSAL ADMS / ICLOCK PROTOCOL RECEIVER (ZKTeco / eSSL / Realtime / etc.)
// --------------------------------------------------------------------------

/**
 * GET & POST /iclock/cdata and /api/public/biometric/adms
 * Standard ADMS push webhook endpoint called directly by physical biometric devices
 */
async function handleAdmsPush(req: Request, res: Response) {
  try {
    const sn = (req.query.SN || req.headers["x-serial-number"] || req.body?.SN || "").toString().trim();
    const table = (req.query.table || "").toString();

    // If device handshake / heartbeat ping
    if (req.method === "GET") {
      if (sn) {
        // Auto-register device if not existing in default tenant
        const defaultTenant = await prisma.tenant.findFirst();
        if (defaultTenant) {
          const existing = await prisma.biometricDevice.findFirst({
            where: { serialNumber: sn },
          });

          if (!existing) {
            await prisma.biometricDevice.create({
              data: {
                tenantId: defaultTenant.id,
                deviceName: `Biometric Terminal [${sn}]`,
                deviceModel: "Auto-Discovered ADMS Machine",
                deviceType: "hybrid",
                ipAddress: req.ip || null,
                serialNumber: sn,
                location: "Auto-Discovered Location",
                syncProtocol: "push_api_webhook",
                apiKey: `bio_key_${crypto.randomBytes(16).toString("hex")}`,
                status: "online",
                lastSyncAt: new Date(),
              },
            });
          } else {
            await prisma.biometricDevice.update({
              where: { id: existing.id },
              data: { status: "online", lastSyncAt: new Date() },
            });
          }
        }
      }

      // Standard ZKTeco/eSSL ADMS handshake response
      res.setHeader("Content-Type", "text/plain");
      return res.send("OK\n");
    }

    // If device is posting attendance logs (ATTLOG)
    if (req.method === "POST") {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const lines = rawBody.split("\n");

      const defaultTenant = await prisma.tenant.findFirst();
      if (!defaultTenant) return res.send("OK\n");

      // Auto resolve device
      let device = await prisma.biometricDevice.findFirst({
        where: { serialNumber: sn || "DEFAULT-DEVICE" },
      });

      if (!device && sn) {
        device = await prisma.biometricDevice.create({
          data: {
            tenantId: defaultTenant.id,
            deviceName: `Biometric Terminal [${sn}]`,
            deviceModel: "Auto-Discovered ADMS Machine",
            deviceType: "hybrid",
            ipAddress: req.ip || null,
            serialNumber: sn,
            location: "Auto-Discovered Location",
            syncProtocol: "push_api_webhook",
            apiKey: `bio_key_${crypto.randomBytes(16).toString("hex")}`,
            status: "online",
            lastSyncAt: new Date(),
          },
        });
      }

      let processedCount = 0;

      // Parse standard ADMS tab/space delimited punch log lines:
      // Format: <PIN/Card/EmployeeCode>\t<YYYY-MM-DD HH:mm:ss>\t<Status>\t<VerifyType>
      for (const line of lines) {
        const parts = line.trim().split(/[\t\s]+/);
        if (parts.length >= 2) {
          const empCode = parts[0];
          const timeStr = `${parts[1]} ${parts[2] || ""}`.trim();
          const punchDate = new Date(timeStr);

          if (empCode && !isNaN(punchDate.getTime())) {
            await processBiometricPunch({
              tenantId: device?.tenantId || defaultTenant.id,
              deviceId: device?.id,
              employeeCode: empCode,
              punchTime: punchDate,
              punchType: "auto",
              verificationMode: "fingerprint",
              rawPayload: line,
            });
            processedCount++;
          }
        }
      }

      res.setHeader("Content-Type", "text/plain");
      return res.send(`OK: ${processedCount}\n`);
    }

    return res.send("OK\n");
  } catch (err: any) {
    console.error("[ADMS Push Error]:", err);
    res.setHeader("Content-Type", "text/plain");
    return res.send("OK\n");
  }
}

iclockRouter.all("/cdata", handleAdmsPush);
iclockRouter.all("/getrequest", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const sn = (req.query.SN || req.headers["x-serial-number"] || "").toString().trim();
  if (sn && deviceCommandQueue.has(sn)) {
    const cmd = deviceCommandQueue.get(sn);
    deviceCommandQueue.delete(sn);
    console.log(`[ADMS COMMAND DISPATCH] Sending command to ${sn}: ${cmd}`);
    return res.send(`${cmd}\n`);
  }
  res.send("OK\n");
});
publicBiometricRouter.all("/adms", handleAdmsPush);

/**
 * POST /api/public/biometric/push
 * Public Hardware Webhook Receiver for JSON push agents
 */
publicBiometricRouter.post("/push", async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers["x-biometric-key"] || req.query.apiKey || req.body.apiKey;

    let tenantId = req.headers["x-tenant-id"] || req.query.tenantId || req.body.tenantId;
    let device = null;

    if (apiKey) {
      device = await prisma.biometricDevice.findUnique({
        where: { apiKey: String(apiKey) },
      });
      if (device) tenantId = device.tenantId;
    }

    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing tenant identifier." });
    }

    const { employeeCode, punchTime, verificationMode, punchType, serialNumber } = req.body;

    if (!employeeCode) {
      return res.status(400).json({ error: "Payload missing employeeCode." });
    }

    // Auto-discover device if serialNumber provided and not registered
    if (!device && serialNumber) {
      device = await prisma.biometricDevice.findFirst({
        where: { serialNumber: String(serialNumber) },
      });

      if (!device) {
        device = await prisma.biometricDevice.create({
          data: {
            tenantId: String(tenantId),
            deviceName: req.body.deviceName || `Device [${serialNumber}]`,
            deviceModel: req.body.deviceModel || "Universal Biometric Device",
            deviceType: req.body.deviceType || "hybrid",
            ipAddress: req.ip || null,
            serialNumber: String(serialNumber),
            location: req.body.location || "Main Entrance",
            syncProtocol: "push_api_webhook",
            apiKey: `bio_key_${crypto.randomBytes(16).toString("hex")}`,
            status: "online",
            lastSyncAt: new Date(),
          },
        });
      }
    }

    const punchLog = await processBiometricPunch({
      tenantId: String(tenantId),
      deviceId: device?.id,
      employeeCode: String(employeeCode),
      punchTime: punchTime ? new Date(punchTime) : new Date(),
      punchType: punchType || "auto",
      verificationMode: verificationMode || "fingerprint",
      rawPayload: JSON.stringify(req.body),
    });

    return res.status(200).json({
      status: "SUCCESS",
      message: "Punch accepted and processed.",
      logId: punchLog.id,
    });
  } catch (err: any) {
    console.error("[POST /api/public/biometric/push] error:", err);
    return res.status(500).json({ error: err.message || "Hardware push processing failed." });
  }
});
