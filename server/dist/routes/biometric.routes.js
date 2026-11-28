"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardwareUsersCache = exports.deviceCommandQueue = exports.iclockRouter = exports.publicBiometricRouter = exports.biometricRouter = void 0;
exports.getTenantAttendanceDateUtc = getTenantAttendanceDateUtc;
exports.processBiometricPunch = processBiometricPunch;
exports.backfillAttendanceForBiometricPin = backfillAttendanceForBiometricPin;
const workspace_policy_service_1 = require("../services/workspace-policy.service");
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const entitlements_1 = require("../middleware/entitlements");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const socket_1 = require("../socket");
const crypto_1 = __importDefault(require("crypto"));
const net_1 = __importDefault(require("net"));
const zk_protocol_1 = require("../services/zk-protocol");
const auth_helpers_1 = require("../lib/auth-helpers");
const matrix_cosec_adapter_1 = require("../services/matrix-cosec.adapter");
const workspace_host_1 = require("../lib/workspace-host");
const biometric_attendance_evaluator_service_1 = require("../services/biometric-attendance-evaluator.service");
exports.biometricRouter = (0, express_1.Router)();
exports.publicBiometricRouter = (0, express_1.Router)();
exports.iclockRouter = (0, express_1.Router)();
// Device ADMS Command Queue for real historical memory flush
exports.deviceCommandQueue = new Map();
exports.hardwareUsersCache = new Map();
// Core helper: Process Biometric Punch & Atomic Attendance Record Synchronization
// ─────────────────────────────────────────────────────────────────────────────
// RULES (First-In / Last-Out model):
//   • FIRST punch of the day  → sets checkIn (creates attendance record)
//   • MIDDLE punches          → recorded in punch log only; they do NOT change
//                               checkIn or checkOut unless they are the new min/max
//   • LAST punch of the day   → updates checkOut to the latest timestamp seen
//
// Device purpose override:
//   • purpose = "check_in_only"  → every punch from this device forces checkIn
//   • purpose = "check_out_only" → every punch from this device forces checkOut
//   • purpose = "both" (default) → auto first-in / last-out logic applies
//
// Explicit punchType override (from ZKTeco status byte or API caller):
//   • punchType = "check_in"  → always set / update checkIn
//   • punchType = "check_out" → always set / update checkOut
//   • punchType = "auto"      → first-in / last-out based on timestamps
/**
 * Resolves the calendar date (YYYY-MM-DD at 00:00:00.000Z) for a punch timestamp
 * in the tenant's explicit configured timezone (default: Asia/Kolkata).
 */
function getTenantAttendanceDateUtc(punchTime, timezone) {
    const tz = (timezone && timezone.trim()) || "Asia/Kolkata";
    try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const dateStr = formatter.format(punchTime); // "YYYY-MM-DD"
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return new Date(`${dateStr}T00:00:00.000Z`);
        }
    }
    catch {
        // Invalid IANA timezone string — fall back to UTC date
    }
    return new Date(Date.UTC(punchTime.getUTCFullYear(), punchTime.getUTCMonth(), punchTime.getUTCDate()));
}
async function processBiometricPunch({ tenantId, deviceId, employeeCode, punchTime, punchType = "auto", verificationMode = "fingerprint", rawPayload, }) {
    // Use rawPrisma throughout: this function is called from both authenticated
    // routes and public device webhook endpoints. It strictly enforces multi-tenant
    // isolation by filtering EVERY query on tenantId.
    const db = prisma_1.rawPrisma;
    if (!tenantId || typeof tenantId !== "string") {
        const err = new Error("Valid tenantId is required for biometric punch processing.");
        err.status = 400;
        throw err;
    }
    if (!(punchTime instanceof Date) || Number.isNaN(punchTime.getTime())) {
        const err = new Error("Invalid punchTime timestamp.");
        err.status = 400;
        throw err;
    }
    // ── 1. Resolve Employee (Explicit BiometricEmployeeMapping first, then auto-match EmployeeCode) & Tenant Timezone ──
    const strippedCode = employeeCode.replace(/^0+/, "") || employeeCode;
    const [explicitMapping, codeMatchedEmployee, tenantRecord] = await Promise.all([
        db.biometricEmployeeMapping.findFirst({
            where: {
                tenantId,
                isActive: true,
                ...(deviceId ? { deviceId } : {}),
                OR: [{ devicePin: employeeCode }, { devicePin: strippedCode }],
            },
            include: { employee: true },
        }),
        db.employee.findFirst({
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
        }),
        db.tenant.findUnique({
            where: { id: tenantId },
            select: { timezone: true },
        }),
    ]);
    const employee = explicitMapping?.employee || codeMatchedEmployee;
    const employeeId = employee ? employee.id : null;
    const syncStatus = employee ? "processed" : "unmatched_employee";
    // ── 2. Resolve Device (Strictly tenant-scoped — prevents cross-tenant device access) ──
    let deviceRecord = null;
    if (deviceId) {
        deviceRecord = await db.biometricDevice.findFirst({
            where: { id: deviceId, tenantId },
            select: { id: true, deviceName: true, purpose: true, location: true, tenantId: true },
        });
        if (!deviceRecord) {
            const err = new Error("Biometric device not found or does not belong to this organization.");
            err.status = 403;
            err.code = "CROSS_TENANT_DEVICE_FORBIDDEN";
            throw err;
        }
    }
    else {
        deviceRecord = await db.biometricDevice.findFirst({
            where: { tenantId },
            select: { id: true, deviceName: true, purpose: true, location: true, tenantId: true },
        });
    }
    if (!deviceRecord) {
        const err = new Error("No registered biometric device found for this organization.");
        err.status = 404;
        throw err;
    }
    // ── 3. Deduplicate — skip exact same timestamp already recorded ───────────
    const existingLog = await db.biometricPunchLog.findFirst({
        where: { tenantId, employeeCode, punchTime },
    });
    if (existingLog) {
        // Backfill employeeId if it was previously unmatched
        if (employee && existingLog.syncStatus !== "processed") {
            await db.biometricPunchLog.update({
                where: { id: existingLog.id },
                data: { employeeId: employee.id, syncStatus: "processed" },
            });
        }
        return Object.assign(existingLog, { isDuplicate: true });
    }
    // ── 4. Apply device purpose → override punchType if device is dedicated ──
    let resolvedPunchType = punchType;
    if (deviceRecord.purpose === "check_in_only") {
        resolvedPunchType = "check_in";
    }
    else if (deviceRecord.purpose === "check_out_only") {
        resolvedPunchType = "check_out";
    }
    // ── 5. Save Raw BiometricPunchLog (idempotent under concurrent submissions) ──
    let punchLog;
    try {
        punchLog = await db.biometricPunchLog.create({
            data: {
                tenantId,
                deviceId: deviceRecord.id,
                employeeCode,
                employeeId,
                punchTime,
                punchType: resolvedPunchType,
                verificationMode,
                syncStatus,
                rawPayload: rawPayload || JSON.stringify({ employeeCode, punchTime, verificationMode }),
            },
            include: {
                device: true,
                employee: { include: { department: true } },
            },
        });
    }
    catch (createErr) {
        if (createErr?.code === "P2002") {
            const racedLog = await db.biometricPunchLog.findFirst({
                where: { tenantId, employeeCode, punchTime },
            });
            if (racedLog) {
                return Object.assign(racedLog, { isDuplicate: true });
            }
        }
        throw createErr;
    }
    // Update device heartbeat counter
    await db.biometricDevice.update({
        where: { id: deviceRecord.id },
        data: {
            totalPunchLogs: { increment: 1 },
            lastSyncAt: new Date(),
            status: "online",
        },
    });
    // ── 6. Sync Attendance — First-In / Last-Out logic in Tenant Timezone ────
    if (employee) {
        // Calculate attendance calendar date using explicit tenant timezone
        const punchDateOnly = getTenantAttendanceDateUtc(punchTime, tenantRecord?.timezone);
        let existing = await db.attendance.findUnique({
            where: {
                tenantId_employeeId_date: {
                    tenantId,
                    employeeId: employee.id,
                    date: punchDateOnly,
                },
            },
        });
        if (!existing) {
            const initialMetrics = await (0, biometric_attendance_evaluator_service_1.evaluateSingleDayBiometricAttendance)({
                tenantId,
                employee,
                dateUtc: punchDateOnly,
                checkIn: punchTime,
                checkOut: null,
                deviceLabel: `[${deviceRecord.deviceName}] (${verificationMode})`,
            });
            try {
                await db.attendance.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        date: punchDateOnly,
                        checkIn: punchTime,
                        hours: initialMetrics.hours,
                        status: initialMetrics.status,
                        lateMinutes: initialMetrics.lateMinutes,
                        earlyOutMinutes: initialMetrics.earlyOutMinutes,
                        overtimeMinutes: initialMetrics.overtimeMinutes,
                        policyId: initialMetrics.policyId,
                        shiftId: initialMetrics.shiftId,
                        source: "BIOMETRIC",
                        notes: initialMetrics.notes,
                    },
                });
            }
            catch (attCreateErr) {
                if (attCreateErr?.code === "P2002") {
                    // Concurrent punch created the attendance row first — re-fetch and fall through to update
                    existing = await db.attendance.findUnique({
                        where: {
                            tenantId_employeeId_date: {
                                tenantId,
                                employeeId: employee.id,
                                date: punchDateOnly,
                            },
                        },
                    });
                }
                else {
                    throw attCreateErr;
                }
            }
        }
        if (existing) {
            // ── Existing record: apply first-in / last-out rules ─────────────────
            const currentCheckIn = existing.checkIn ? new Date(existing.checkIn) : null;
            const currentCheckOut = existing.checkOut ? new Date(existing.checkOut) : null;
            let newCheckIn = currentCheckIn;
            let newCheckOut = currentCheckOut;
            if (resolvedPunchType === "check_in") {
                // Explicit check-in: always update checkIn
                newCheckIn = currentCheckIn
                    ? (punchTime < currentCheckIn ? punchTime : currentCheckIn)
                    : punchTime;
            }
            else if (resolvedPunchType === "check_out") {
                // Explicit check-out: always update checkOut to the latest
                newCheckOut = currentCheckOut
                    ? (punchTime > currentCheckOut ? punchTime : currentCheckOut)
                    : punchTime;
            }
            else {
                // Auto mode — strict First-In / Last-Out:
                //   • checkIn  = earliest timestamp ever seen for this employee+day
                //   • checkOut = latest  timestamp ever seen for this employee+day
                //   • Middle punches that fall between existing checkIn and checkOut
                //     are silently recorded in the punch log but do NOT update either
                //     boundary (they are "interior" punches).
                if (currentCheckIn) {
                    // Update checkIn only if this punch is EARLIER than the current min
                    if (punchTime < currentCheckIn) {
                        newCheckIn = punchTime;
                    }
                    // Update checkOut only if this punch is LATER than the current max
                    if (currentCheckOut) {
                        if (punchTime > currentCheckOut) {
                            newCheckOut = punchTime;
                        }
                        // else: interior punch — ignore for attendance boundaries
                    }
                    else {
                        // No checkOut yet: set it only if punch is after checkIn
                        if (punchTime > currentCheckIn) {
                            newCheckOut = punchTime;
                        }
                    }
                }
                else {
                    // No checkIn at all (edge case — record was created without one)
                    newCheckIn = punchTime;
                }
            }
            // ── Only write back if something actually changed ─────────────────────
            const checkInChanged = newCheckIn?.getTime() !== currentCheckIn?.getTime();
            const checkOutChanged = newCheckOut?.getTime() !== currentCheckOut?.getTime();
            if (checkInChanged || checkOutChanged) {
                const evalCheckIn = newCheckIn || punchTime;
                const evalMetrics = await (0, biometric_attendance_evaluator_service_1.evaluateSingleDayBiometricAttendance)({
                    tenantId,
                    employee,
                    dateUtc: punchDateOnly,
                    checkIn: evalCheckIn,
                    checkOut: newCheckOut,
                    deviceLabel: `[${deviceRecord.deviceName}]`,
                });
                await db.attendance.update({
                    where: { id: existing.id },
                    data: {
                        checkIn: newCheckIn,
                        checkOut: newCheckOut,
                        hours: evalMetrics.hours,
                        status: evalMetrics.status,
                        lateMinutes: evalMetrics.lateMinutes,
                        earlyOutMinutes: evalMetrics.earlyOutMinutes,
                        overtimeMinutes: evalMetrics.overtimeMinutes,
                        policyId: evalMetrics.policyId,
                        shiftId: evalMetrics.shiftId,
                        source: existing.source || "BIOMETRIC",
                        notes: evalMetrics.notes,
                    },
                });
            }
        }
        // ── 7. Real-time WebSocket broadcast ─────────────────────────────────────
        try {
            (0, socket_1.broadcastToTenant)(tenantId, "biometric:punch", {
                punchLog,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: employee.departmentId,
                punchTime: punchTime.toISOString(),
                punchType: resolvedPunchType,
                deviceName: deviceRecord.deviceName,
                devicePurpose: deviceRecord.purpose,
            });
        }
        catch {
            // Socket broadcast failure is non-fatal
        }
    }
    return Object.assign(punchLog, { isDuplicate: false });
}
// Enforce Biometric Cloud Sync Add-on Entitlement on all management endpoints
exports.biometricRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("biometric-sync"));
/**
 * GET /api/biometric/devices
 * List all real biometric terminals registered for tenant
 */
exports.biometricRouter.get("/devices", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const devices = await prisma_1.prisma.biometricDevice.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { punchLogs: true },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        return res.json(devices);
    }
    catch (err) {
        console.error("[GET /api/biometric/devices] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch biometric devices." });
    }
});
/**
 * GET /api/biometric/cloud-config
 * Returns real server cloud parameters for hardware machine configuration
 */
exports.biometricRouter.get("/cloud-config", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const forwardedHost = (req.get("x-forwarded-host") || "").split(",")[0].trim();
        const host = forwardedHost || req.get("host") || (0, workspace_host_1.getBaseDomain)();
        const forwardedProto = (req.get("x-forwarded-proto") || "").split(",")[0].trim();
        const protocol = forwardedProto || (req.protocol === "https" ? "https" : (process.env.NODE_ENV === "production" ? "https" : "http"));
        const tenant = await prisma_1.prisma.tenant.findUnique({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch cloud config." });
    }
});
/**
 * GET /api/biometric/summary/stats
 * Metrics: total devices, online count, today's punches, unmatched logs
 */
exports.biometricRouter.get("/summary/stats", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const devices = await prisma_1.prisma.biometricDevice.findMany({ where: { tenantId } });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayPunchesCount = await prisma_1.prisma.biometricPunchLog.count({
            where: {
                tenantId,
                punchTime: { gte: todayStart },
            },
        });
        const unmatchedCount = await prisma_1.prisma.biometricPunchLog.count({
            where: {
                tenantId,
                syncStatus: "unmatched_employee",
            },
        });
        const totalDevices = devices.length;
        const onlineDevices = devices.filter((d) => d.status === "online").length;
        return res.json({
            totalDevices,
            onlineDevices,
            todayPunchesCount,
            unmatchedCount,
        });
    }
    catch (err) {
        console.error("[GET /api/biometric/summary/stats] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch biometric metrics." });
    }
});
/**
 * GET /api/biometric/devices/:id/passport
 * Fetches deep machine identity, enrolled biometric templates (fingerprint, face, card),
 * and time-range punch logs (daily, weekly, monthly, all).
 */
exports.biometricRouter.get("/devices/:id/passport", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const { period = "daily" } = req.query;
        const device = await prisma_1.prisma.biometricDevice.findUnique({
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
        let dateFilter = undefined;
        if (period === "daily") {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            dateFilter = { gte: startOfDay };
        }
        else if (period === "weekly") {
            const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { gte: startOfWeek };
        }
        else if (period === "monthly") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            dateFilter = { gte: startOfMonth };
        }
        const wherePunch = { deviceId: id };
        if (dateFilter) {
            wherePunch.punchTime = dateFilter;
        }
        // Fetch logs for this period
        const punchLogs = await prisma_1.prisma.biometricPunchLog.findMany({
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
        const allDevicePunches = await prisma_1.prisma.biometricPunchLog.findMany({
            where: { deviceId: id },
            select: { employeeCode: true, verificationMode: true },
        });
        const uniqueFingerprintStaff = new Set(allDevicePunches.filter((p) => p.verificationMode === "fingerprint").map((p) => p.employeeCode));
        const uniqueFaceStaff = new Set(allDevicePunches.filter((p) => p.verificationMode === "face").map((p) => p.employeeCode));
        const uniqueCardStaff = new Set(allDevicePunches.filter((p) => p.verificationMode === "rfid").map((p) => p.employeeCode));
        const periodUniqueStaff = new Set(punchLogs.map((p) => p.employeeCode));
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
    }
    catch (err) {
        console.error("[GET /api/biometric/devices/:id/passport] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch device passport." });
    }
});
/**
 * POST /api/biometric/devices/:id/sync-now
 * Force immediate device sync handshake, query physical hardware memory,
 * and pull all unread attendance punch records into the system.
 */
exports.biometricRouter.post("/devices/:id/sync-now", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const device = await prisma_1.prisma.biometricDevice.findUnique({ where: { id } });
        if (!device)
            return res.status(404).json({ error: "Device not found." });
        let pulledRecordsCount = 0;
        let syncMessage = "";
        // 1. Direct Local TCP/IP Query (If IP is specified)
        if (device.ipAddress && device.ipAddress !== "0.0.0.0" && device.ipAddress.includes(".")) {
            try {
                const zkResult = await (0, zk_protocol_1.pullAttendanceLogsFromZkDevice)(device.ipAddress, device.port || 4370, 4000);
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
                }
                else {
                    syncMessage = `Connected to ${device.deviceName} (${device.ipAddress}:${device.port}). Device is online. (0 new unread logs in hardware buffer).`;
                }
            }
            catch (tcpErr) {
                console.warn("[SYNC-NOW DIRECT TCP QUERY] Warning:", tcpErr.message);
                syncMessage = `Terminal is active. Direct TCP returned: ${tcpErr.message}`;
            }
        }
        // 2. Queue ADMS memory dump command for cloud push machines
        if (device.serialNumber) {
            exports.deviceCommandQueue.set(device.serialNumber, "C:101:DATA QUERY ATTLOG");
            if (!syncMessage) {
                syncMessage = `Cloud Sync Command Queued: Terminal [${device.deviceName}] will dump all historical attendance records on next heartbeat.`;
            }
        }
        const updated = await prisma_1.prisma.biometricDevice.update({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Sync failed." });
    }
});
/**
 * GET /api/biometric/devices/:id/hardware-users
 * Scans physical machine memory in real-time, fetches all 45+ enrolled users,
 * and matches each with HRMS employee directory.
 */
exports.biometricRouter.get("/devices/:id/hardware-users", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const device = await prisma_1.prisma.biometricDevice.findUnique({ where: { id } });
        if (!device || device.tenantId !== tenantId) {
            return res.status(404).json({ error: "Biometric device not found." });
        }
        let hardwareUsers = [];
        let hardwareInfo = null;
        // 1. Try live LAN TCP pull if device has a LAN IP
        if (device.ipAddress && device.ipAddress.includes(".")) {
            try {
                const zkResult = await (0, zk_protocol_1.pullAttendanceLogsFromZkDevice)(device.ipAddress, device.port || 4370, 6000);
                hardwareUsers = zkResult.users || [];
                hardwareInfo = zkResult.info || null;
            }
            catch {
                // Non-fatal when server is in cloud and machine is behind office NAT
            }
        }
        // 2. Merge with cached/persisted enrolled users pushed by MasterHRMS-Device-Manager (includes real names & Fingerprint/Face/Card/PIN modes)
        let cachedSnapshot = exports.hardwareUsersCache.get(device.id) || exports.hardwareUsersCache.get(device.serialNumber);
        if (!cachedSnapshot) {
            try {
                const persisted = await prisma_1.rawPrisma.setting.findUnique({
                    where: {
                        scope_scopeId_key: {
                            scope: "TENANT",
                            scopeId: tenantId,
                            key: `biometric_hw_users_${device.id}`,
                        },
                    },
                });
                const val = persisted?.valueJson;
                if (val && Array.isArray(val.users) && val.users.length > 0) {
                    cachedSnapshot = { syncedAt: val.syncedAt || new Date().toISOString(), users: val.users };
                    exports.hardwareUsersCache.set(device.id, cachedSnapshot);
                    if (device.serialNumber)
                        exports.hardwareUsersCache.set(device.serialNumber, cachedSnapshot);
                }
            }
            catch {
                // Non-fatal fallback
            }
        }
        const mergedByBioId = new Map();
        for (const u of hardwareUsers) {
            const bioId = String(u.userId || u.uid || "").trim();
            if (!bioId)
                continue;
            const cardStr = u.cardno && Number(u.cardno) > 0 ? String(u.cardno) : "";
            const hasCard = !!cardStr;
            const hasPassword = !!(u.password && String(u.password).trim().length > 0);
            const authModes = [];
            if (hasCard)
                authModes.push("RFID Card");
            if (hasPassword)
                authModes.push("PIN");
            mergedByBioId.set(bioId, {
                uid: u.uid,
                biometricId: bioId,
                name: u.name || `User ${bioId}`,
                cardNumber: cardStr,
                fingerprintCount: 0,
                hasFace: false,
                hasCard,
                hasPassword,
                authModes,
                privilege: Number(u.role) > 0 ? "Admin" : "User",
                enabled: true,
            });
        }
        if (cachedSnapshot?.users?.length) {
            for (const cu of cachedSnapshot.users) {
                const bioId = String(cu.biometricId || "").trim();
                if (!bioId)
                    continue;
                mergedByBioId.set(bioId, {
                    ...mergedByBioId.get(bioId),
                    ...cu,
                    biometricId: bioId,
                });
            }
        }
        // 3. Also enrich with distinct users & verificationModes observed in punch logs for this device
        const devicePunchLogs = await prisma_1.prisma.biometricPunchLog.findMany({
            where: { deviceId: id, tenantId },
            select: { employeeCode: true, verificationMode: true },
            take: 1000,
        });
        for (const pl of devicePunchLogs) {
            const bioId = String(pl.employeeCode || "").trim();
            if (!bioId)
                continue;
            const existing = mergedByBioId.get(bioId) || {
                biometricId: bioId,
                name: `User ${bioId}`,
                cardNumber: "",
                fingerprintCount: 0,
                hasFace: false,
                hasCard: false,
                hasPassword: false,
                authModes: [],
                privilege: "User",
                enabled: true,
            };
            const vm = String(pl.verificationMode || "").toLowerCase();
            if (vm.includes("face") && !existing.authModes.includes("Face")) {
                existing.hasFace = true;
                existing.authModes.push("Face");
            }
            else if ((vm.includes("rfid") || vm.includes("card")) && !existing.authModes.includes("RFID Card")) {
                existing.hasCard = true;
                existing.authModes.push("RFID Card");
            }
            else if ((vm.includes("pin") || vm.includes("pass")) && !existing.authModes.includes("PIN")) {
                existing.hasPassword = true;
                existing.authModes.push("PIN");
            }
            else if (vm.includes("finger") && !existing.authModes.includes("Fingerprint")) {
                existing.fingerprintCount = Math.max(existing.fingerprintCount || 0, 1);
                existing.authModes.push("Fingerprint");
            }
            mergedByBioId.set(bioId, existing);
        }
        // 4. Match each hardware user with explicit BiometricEmployeeMapping first, then HRMS Employee Code
        const [allEmployees, explicitMappings] = await Promise.all([
            prisma_1.prisma.employee.findMany({
                where: { tenantId },
                include: { department: true },
            }),
            prisma_1.prisma.biometricEmployeeMapping.findMany({
                where: { deviceId: id, tenantId, isActive: true },
                include: { employee: { include: { department: true } } },
            }),
        ]);
        const mappedUsers = Array.from(mergedByBioId.values()).map((u) => {
            const bioId = String(u.biometricId || "").trim();
            const strippedBioId = bioId.replace(/^0+/, "");
            const pinMapping = explicitMappings.find((m) => m.devicePin === bioId || m.devicePin === strippedBioId);
            const codeMatchedEmp = allEmployees.find((e) => e.employeeCode === bioId ||
                e.employeeCode === strippedBioId ||
                e.employeeCode === `EMP-${bioId}` ||
                e.employeeCode === `EMP-${strippedBioId}` ||
                `${e.firstName} ${e.lastName}`.trim().toLowerCase() === String(u.name || "").trim().toLowerCase());
            const matchedEmp = pinMapping?.employee || codeMatchedEmp || null;
            const matchType = pinMapping ? "pin_mapping" : codeMatchedEmp ? "employee_code" : "unmatched";
            return {
                uid: u.uid,
                biometricId: bioId,
                name: u.name || `User ${bioId}`,
                cardNumber: u.cardNumber || "",
                fingerprintCount: u.fingerprintCount || 0,
                hasFace: !!u.hasFace,
                hasCard: !!u.hasCard,
                hasPassword: !!u.hasPassword,
                authModes: Array.isArray(u.authModes) && u.authModes.length > 0 ? u.authModes : ["Fingerprint"],
                privilege: u.privilege || "User",
                enabled: u.enabled !== false,
                isMatched: !!matchedEmp,
                matchType,
                mappingId: pinMapping?.id || null,
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
            lastSnapshotAt: cachedSnapshot?.syncedAt || null,
            totalHardwareUsers: mappedUsers.length,
            matchedCount: mappedUsers.filter((u) => u.isMatched).length,
            unmatchedCount: mappedUsers.filter((u) => !u.isMatched).length,
            users: mappedUsers,
        });
    }
    catch (err) {
        console.error("[GET /api/biometric/devices/:id/hardware-users] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch hardware users." });
    }
});
/**
 * POST /api/biometric/devices/:id/apply-sync
 * Applies hardware data to database:
 * 1. Auto-creates/links any unmapped employees directly from their real machine names and Biometric IDs.
 * 2. Pulls all attendance punch logs with exact local timezone preservation (+05:30 IST).
 * 3. Calculates complete daily attendance sheet for all employees.
 */
exports.biometricRouter.post("/devices/:id/apply-sync", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { importUnmappedUsers = true, syncPunches = true, userMappings = [] } = req.body;
        const device = await prisma_1.prisma.biometricDevice.findUnique({ where: { id } });
        if (!device || device.tenantId !== tenantId) {
            return res.status(404).json({ error: "Biometric device not found." });
        }
        if (!device.ipAddress || !device.ipAddress.includes(".")) {
            return res.status(400).json({ error: "Device IP address is required for direct hardware sync." });
        }
        // 1. Query Hardware for Live Users and Attendance Logs
        const zkResult = await (0, zk_protocol_1.pullAttendanceLogsFromZkDevice)(device.ipAddress, device.port || 4370, 15000);
        if (!zkResult.success && zkResult.records.length === 0 && zkResult.users.length === 0) {
            return res.status(500).json({ error: zkResult.message || "Could not connect to biometric device." });
        }
        let createdEmployeesCount = 0;
        const existingEmployees = await prisma_1.prisma.employee.findMany({ where: { tenantId } });
        // 2. Auto-create/map Employees from Machine Enrolled Users
        if (importUnmappedUsers && zkResult.users.length > 0) {
            for (const u of zkResult.users) {
                const bioId = String(u.userId || u.uid || "").trim();
                const rawName = String(u.name || "").trim() || `Staff ${bioId}`;
                const exists = existingEmployees.find((e) => e.employeeCode === bioId ||
                    e.employeeCode === bioId.replace(/^0+/, "") ||
                    `${e.firstName} ${e.lastName}`.trim().toLowerCase() === rawName.toLowerCase());
                if (!exists) {
                    const nameParts = rawName.split(/\s+/);
                    const firstName = nameParts[0] || `Employee`;
                    const lastName = nameParts.slice(1).join(" ") || bioId;
                    const cleanEmailSlug = rawName.toLowerCase().replace(/[^a-z0-9]/g, "") || `staff${bioId}`;
                    const cleanEmail = `${cleanEmailSlug}@tsvhomes.in`;
                    const created = await prisma_1.prisma.$transaction(async (tx) => {
                        await (0, workspace_policy_service_1.lockWorkspaceCapacity)(tx, tenantId, "employees");
                        let userId;
                        try {
                            userId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                                tenantId,
                                email: cleanEmail,
                                firstName,
                                lastName,
                                password: "Password@123",
                            });
                        }
                        catch (e) {
                            throw e;
                        }
                        const employee = await tx.employee.create({
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
                        return employee;
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
            const punchLogsToInsert = [];
            const dailyPunchesGroup = new Map();
            for (const r of zkResult.records) {
                const empCode = String(r.employeeCode || "").trim();
                const punchDate = r.punchTime;
                if (!empCode || !punchDate || isNaN(punchDate.getTime()))
                    continue;
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
                    dailyPunchesGroup.get(dateKey).punches.push(punchDate);
                }
            }
            // Bulk insert punch logs in chunks of 500
            const CHUNK_SIZE = 500;
            for (let i = 0; i < punchLogsToInsert.length; i += CHUNK_SIZE) {
                const chunk = punchLogsToInsert.slice(i, i + CHUNK_SIZE);
                await prisma_1.prisma.biometricPunchLog.createMany({
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
                await prisma_1.prisma.attendance.upsert({
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
        const updatedDevice = await prisma_1.prisma.biometricDevice.update({
            where: { id: device.id },
            data: {
                totalPunchLogs: zkResult.info?.logCount || zkResult.records.length,
                lastSyncAt: new Date(),
                status: "online",
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "BIOMETRIC_PUNCH", {
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
    }
    catch (err) {
        console.error("[POST /api/biometric/devices/:id/apply-sync] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Hardware apply-sync failed." });
    }
});
/**
 * POST /api/biometric/devices/:id/map-employee
 * Links a specific hardware biometric ID to an HRMS employee
 */
exports.biometricRouter.post("/devices/:id/map-employee", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { employeeId, biometricId } = req.body;
        if (!employeeId || !biometricId) {
            return res.status(400).json({ error: "Employee ID and Biometric ID are required." });
        }
        const updatedEmployee = await prisma_1.prisma.employee.update({
            where: { id: employeeId },
            data: { employeeCode: String(biometricId).trim() },
        });
        // Re-link any existing unmatched punches with this biometric ID
        await prisma_1.prisma.biometricPunchLog.updateMany({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to map employee." });
    }
});
/**
 * GET /api/biometric/logs
 * List live raw punch logs with employee verification details
 */
exports.biometricRouter.get("/logs", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { deviceId, employeeCode, syncStatus, limit = "50" } = req.query;
        const where = { tenantId };
        if (deviceId && deviceId !== "all") {
            where.deviceId = String(deviceId);
        }
        if (employeeCode) {
            where.employeeCode = { contains: String(employeeCode) };
        }
        if (syncStatus && syncStatus !== "all") {
            where.syncStatus = String(syncStatus);
        }
        const logs = await prisma_1.prisma.biometricPunchLog.findMany({
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
    }
    catch (err) {
        console.error("[GET /api/biometric/logs] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch biometric punch logs." });
    }
});
/**
 * POST /api/biometric/punch (FN-008 Canonical Route Alias)
 * Direct biometric device punch ingestion endpoint
 */
exports.biometricRouter.post("/punch", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { deviceId, employeeCode, verificationMode, punchType, punchTime } = req.body;
        if (!employeeCode) {
            return res.status(400).json({ error: "Employee Code is required." });
        }
        const punchLog = await processBiometricPunch({
            tenantId,
            deviceId,
            employeeCode: String(employeeCode),
            punchTime: punchTime ? new Date(punchTime) : new Date(),
            punchType: punchType || "auto",
            verificationMode: verificationMode || "fingerprint",
            rawPayload: JSON.stringify(req.body),
        });
        return res.status(201).json({
            success: true,
            message: "Biometric punch successfully recorded and synchronized.",
            punchLog,
        });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to record biometric punch." });
    }
});
/**
 * POST /api/biometric/probe
 * Auto-Probe IP & Port: Tests connection and automatically registers/discovers any hardware machine
 */
exports.biometricRouter.post("/probe", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { ipAddress, port = 4370, deviceName, location } = req.body;
        if (!ipAddress) {
            return res.status(400).json({ error: "IP Address is required for network probe." });
        }
        const host = String(ipAddress).trim();
        const targetPort = Number(port) || 4370;
        const startTime = Date.now();
        // Perform TCP Socket Handshake Probe
        const probePromise = new Promise((resolve) => {
            const socket = new net_1.default.Socket();
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
        let device = await prisma_1.prisma.biometricDevice.findFirst({
            where: { tenantId, ipAddress: host, port: targetPort },
        });
        if (!device) {
            device = await prisma_1.prisma.biometricDevice.create({
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
                    apiKey: `bio_key_${crypto_1.default.randomBytes(16).toString("hex")}`,
                    status: "online",
                    lastSyncAt: new Date(),
                    autoAttendanceSync: true,
                },
            });
        }
        else {
            device = await prisma_1.prisma.biometricDevice.update({
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
    }
    catch (err) {
        console.error("[POST /api/biometric/probe] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Probe execution failed." });
    }
});
/**
 * POST /api/biometric/devices
 * Register any biometric terminal (Universal support: ZKTeco, eSSL, Realtime, Hikvision, Matrix, Mantra, Biomax, Suprema, etc.)
 */
exports.biometricRouter.post("/devices", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { deviceName, deviceModel, deviceType, purpose, ipAddress, port, serialNumber, location, syncProtocol, autoAttendanceSync, } = req.body;
        if (!deviceName) {
            return res.status(400).json({ error: "Device Name is required." });
        }
        const resolvedSerialNumber = serialNumber?.trim() || `SN-${crypto_1.default.randomBytes(4).toString("hex").toUpperCase()}`;
        const apiKey = `bio_key_${crypto_1.default.randomBytes(16).toString("hex")}`;
        const newDevice = await prisma_1.prisma.biometricDevice.create({
            data: {
                tenantId,
                deviceName: deviceName.trim(),
                deviceModel: deviceModel?.trim() || "Universal Biometric Reader",
                deviceType: deviceType || "hybrid",
                purpose: purpose || "both",
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
    }
    catch (err) {
        console.error("[POST /api/biometric/devices] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to register biometric device." });
    }
});
/**
 * PUT /api/biometric/devices/:id
 * Update device config
 */
exports.biometricRouter.put("/devices/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceName, deviceModel, deviceType, purpose, ipAddress, port, serialNumber, location, status, autoAttendanceSync, } = req.body;
        const updated = await prisma_1.prisma.biometricDevice.update({
            where: { id },
            data: {
                deviceName,
                deviceModel,
                deviceType,
                purpose: purpose ? String(purpose) : undefined,
                ipAddress: ipAddress ? ipAddress.trim() : undefined,
                port: port ? Number(port) : undefined,
                serialNumber,
                location,
                status,
                autoAttendanceSync: autoAttendanceSync !== undefined ? Boolean(autoAttendanceSync) : undefined,
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update device." });
    }
});
/**
 * DELETE /api/biometric/devices/:id
 * Delete device
 */
exports.biometricRouter.delete("/devices/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.biometricDevice.delete({ where: { id } });
        return res.json({ success: true, message: "Biometric device removed." });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to delete device." });
    }
});
/**
 * POST /api/biometric/devices/:id/ping
 * Real TCP Network Connection Test to Hardware Device IP & Port
 */
exports.biometricRouter.post("/devices/:id/ping", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const device = await prisma_1.prisma.biometricDevice.findUnique({ where: { id } });
        if (!device)
            return res.status(404).json({ error: "Device not found." });
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
        const checkTcpConnection = () => new Promise((resolve) => {
            const socket = new net_1.default.Socket();
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
            await prisma_1.prisma.biometricDevice.update({
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
        }
        else {
            await prisma_1.prisma.biometricDevice.update({
                where: { id },
                data: { status: "offline" },
            });
            return res.status(502).json({
                success: false,
                message: `Hardware unreachable at ${host}:${port}. Reason: ${result.error || "Host offline"}`,
                status: "offline",
            });
        }
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Ping execution failed." });
    }
});
/**
 * POST /api/biometric/simulate
 * Admin test simulation: Simulate biometric fingerprint/face punch for an employee
 */
exports.biometricRouter.post("/simulate", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
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
    }
    catch (err) {
        console.error("[POST /api/biometric/simulate] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to simulate biometric punch." });
    }
});
// --------------------------------------------------------------------------
// UNIVERSAL ADMS / ICLOCK PROTOCOL RECEIVER (ZKTeco / eSSL / Realtime / etc.)
// --------------------------------------------------------------------------
/**
 * GET & POST /iclock/cdata and /api/public/biometric/adms
 * Standard ADMS push webhook endpoint called directly by physical biometric devices
 */
async function handleAdmsPush(req, res) {
    try {
        const sn = (req.query.SN || req.headers["x-serial-number"] || req.body?.SN || "").toString().trim();
        const table = (req.query.table || "").toString();
        if (!sn) {
            res.setHeader("Content-Type", "text/plain");
            return res.status(400).send("ERROR: MISSING SERIAL NUMBER\n");
        }
        // TASK-P0-04: Eliminate cross-tenant punch contamination.
        // Device MUST be pre-registered within its tenant. Unmapped devices fail closed.
        const device = await prisma_1.rawPrisma.biometricDevice.findFirst({
            where: { serialNumber: sn },
        });
        if (!device) {
            console.warn(`[BIOMETRIC SECURITY] Rejected ADMS push from unregistered hardware SN: "${sn}"`);
            res.setHeader("Content-Type", "text/plain");
            return res.status(401).send("ERROR: UNREGISTERED DEVICE\n");
        }
        // If device handshake / heartbeat ping
        if (req.method === "GET") {
            await prisma_1.rawPrisma.biometricDevice.update({
                where: { id: device.id },
                data: { status: "online", lastSyncAt: new Date(), ipAddress: req.ip || device.ipAddress },
            });
            res.setHeader("Content-Type", "text/plain");
            return res.send("OK\n");
        }
        // If device is posting attendance logs (ATTLOG)
        if (req.method === "POST") {
            const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
            const lines = rawBody.split("\n");
            let processedCount = 0;
            // Parse standard ADMS tab/space delimited punch log lines:
            // Format: <PIN/Card/EmployeeCode>\t<YYYY-MM-DD HH:mm:ss>\t<Status>\t<VerifyType>
            // ZKTeco / eSSL ADMS ATTLOG line format:
            //   PIN<TAB>YYYY-MM-DD<TAB>HH:mm:ss<TAB>Status<TAB>VerifyType
            // or compact:
            //   PIN<TAB>YYYY-MM-DD HH:mm:ss<TAB>Status<TAB>VerifyType
            //
            // Status byte mapping (ZKTeco standard):
            //   0 = Check-In   1 = Check-Out
            //   4 = Break-Out  5 = Break-In
            //   255 = Unknown
            function mapZkStatusToPunchType(statusByte) {
                switch (statusByte.trim()) {
                    case "0": return "check_in";
                    case "1": return "check_out";
                    case "4": return "break_out";
                    case "5": return "break_in";
                    default: return "auto";
                }
            }
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                // Split on tab first, then fall back to spaces
                const parts = trimmed.includes("\t") ? trimmed.split("\t") : trimmed.split(/\s+/);
                let empCode;
                let punchDate;
                let statusByte = "255"; // default unknown
                let verifyType = "fingerprint";
                if (parts.length >= 2) {
                    empCode = parts[0];
                    // Try parsing date: either "YYYY-MM-DD HH:mm:ss" in one part or split across parts[1]+parts[2]
                    if (parts[1] && parts[1].includes(" ")) {
                        // Single part "2024-01-15 09:30:00"
                        punchDate = new Date(parts[1]);
                        statusByte = parts[2] ?? "255";
                        verifyType = parts[3] ? mapVerifyType(parts[3]) : "fingerprint";
                    }
                    else if (parts.length >= 3 && parts[1] && parts[2]) {
                        // Separate date + time: parts[1]="2024-01-15", parts[2]="09:30:00"
                        punchDate = new Date(`${parts[1]} ${parts[2]}`);
                        statusByte = parts[3] ?? "255";
                        verifyType = parts[4] ? mapVerifyType(parts[4]) : "fingerprint";
                    }
                    else {
                        continue;
                    }
                    function mapVerifyType(v) {
                        const n = parseInt(v, 10);
                        if (n === 1)
                            return "fingerprint";
                        if (n === 4)
                            return "password";
                        if (n === 6)
                            return "face";
                        if (n === 8)
                            return "rfid";
                        return "fingerprint";
                    }
                    if (empCode && !isNaN(punchDate.getTime())) {
                        await processBiometricPunch({
                            tenantId: device.tenantId,
                            deviceId: device.id,
                            employeeCode: empCode,
                            punchTime: punchDate,
                            punchType: mapZkStatusToPunchType(statusByte),
                            verificationMode: verifyType,
                            rawPayload: trimmed,
                        });
                        processedCount++;
                    }
                }
            }
            res.setHeader("Content-Type", "text/plain");
            return res.send(`OK: ${processedCount}\n`);
        }
        return res.send("OK\n");
    }
    catch (err) {
        console.error("[ADMS Push Error]:", err);
        res.setHeader("Content-Type", "text/plain");
        return res.send("OK\n");
    }
}
exports.iclockRouter.all("/cdata", handleAdmsPush);
exports.iclockRouter.all("/getrequest", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const sn = (req.query.SN || req.headers["x-serial-number"] || "").toString().trim();
    if (sn && exports.deviceCommandQueue.has(sn)) {
        const cmd = exports.deviceCommandQueue.get(sn);
        exports.deviceCommandQueue.delete(sn);
        console.log(`[ADMS COMMAND DISPATCH] Sending command to ${sn}: ${cmd}`);
        return res.send(`${cmd}\n`);
    }
    res.send("OK\n");
});
exports.publicBiometricRouter.all("/adms", handleAdmsPush);
/**
 * POST /api/public/biometric/push
 * Public Hardware Webhook Receiver for JSON push agents
 */
exports.publicBiometricRouter.post("/push", async (req, res) => {
    try {
        const apiKey = (req.headers["x-biometric-key"] || req.query.apiKey || req.body.apiKey || "").toString();
        const explicitTenantHeader = (req.headers["x-tenant-id"] || req.query.tenantId || req.body.tenantId || "").toString();
        const isProduction = process.env.NODE_ENV === "production";
        let tenantId = null;
        let device = null;
        if (apiKey) {
            device = await prisma_1.rawPrisma.biometricDevice.findUnique({
                where: { apiKey: String(apiKey) },
            });
            if (!device) {
                return res.status(401).json({ error: "Invalid biometric device API key." });
            }
            tenantId = device.tenantId;
            if (explicitTenantHeader && explicitTenantHeader !== tenantId) {
                return res.status(403).json({
                    error: "Tenant impersonation forbidden: provided x-tenant-id does not match registered device tenant.",
                });
            }
        }
        else {
            if (isProduction) {
                return res.status(401).json({
                    error: "Authentication required: x-biometric-key header is required in production.",
                });
            }
            if (explicitTenantHeader) {
                const tenantExists = await prisma_1.rawPrisma.tenant.findUnique({ where: { id: explicitTenantHeader } });
                if (!tenantExists) {
                    return res.status(404).json({ error: "Specified x-tenant-id does not exist." });
                }
                tenantId = explicitTenantHeader;
            }
            else {
                const totalTenants = await prisma_1.rawPrisma.tenant.count();
                if (totalTenants === 1 || process.env.SINGLE_TENANT_MODE === "true") {
                    const defaultTenant = await prisma_1.rawPrisma.tenant.findFirst();
                    tenantId = defaultTenant?.id || null;
                }
                else {
                    return res.status(401).json({
                        error: "Authentication required: Multiple tenants exist. Provide x-biometric-key to identify tenant.",
                    });
                }
            }
        }
        if (!tenantId) {
            return res.status(401).json({ error: "Unauthorized: Invalid or missing tenant identifier." });
        }
        const { employeeCode, punchTime, verificationMode, punchType, serialNumber } = req.body;
        if (!employeeCode) {
            return res.status(400).json({ error: "Payload missing employeeCode." });
        }
        // Auto-discover device if serialNumber provided and not registered (strictly tenant-scoped)
        if (!device && serialNumber) {
            device = await prisma_1.rawPrisma.biometricDevice.findFirst({
                where: { serialNumber: String(serialNumber), tenantId: String(tenantId) },
            });
            if (!device) {
                device = await prisma_1.rawPrisma.biometricDevice.create({
                    data: {
                        tenantId: String(tenantId),
                        deviceName: req.body.deviceName || `Device [${serialNumber}]`,
                        deviceModel: req.body.deviceModel || "Universal Biometric Device",
                        deviceType: req.body.deviceType || "hybrid",
                        ipAddress: req.ip || null,
                        serialNumber: String(serialNumber),
                        location: req.body.location || "Main Entrance",
                        syncProtocol: "push_api_webhook",
                        apiKey: `bio_key_${crypto_1.default.randomBytes(16).toString("hex")}`,
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
        const isDuplicate = punchLog?.isDuplicate;
        return res.status(200).json({
            status: "SUCCESS",
            accepted: isDuplicate ? 0 : 1,
            duplicate: isDuplicate ? 1 : 0,
            message: isDuplicate
                ? "Duplicate punch recognized; existing record retained with zero duplicate impact."
                : "Punch accepted and processed.",
            logId: punchLog.id,
        });
    }
    catch (err) {
        console.error("[POST /api/public/biometric/push] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Hardware push processing failed." });
    }
});
/**
 * GET & POST /api/public/biometric/server-time
 * Public connectivity, firewall check, and authoritative server clock endpoint
 * used by Master HRMS Device Manager (Windows Desktop utility).
 */
const handleServerTimeRequest = (req, res) => {
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const forwardedHost = (req.get("x-forwarded-host") || "").split(",")[0].trim();
    const host = forwardedHost || req.get("host") || (0, workspace_host_1.getBaseDomain)();
    const forwardedProto = (req.get("x-forwarded-proto") || "").split(",")[0].trim();
    const protocol = forwardedProto || (req.protocol === "https" ? "https" : "https");
    return res.status(200).json({
        ok: true,
        service: "Master HRMS Biometric Cloud",
        serverTimeUtc: now.toISOString(),
        serverTimeIst: istFormatter.format(now) + " IST",
        epochMs: now.getTime(),
        admsUrl: `${protocol}://${host}/iclock/cdata`,
    });
};
exports.publicBiometricRouter.get("/server-time", handleServerTimeRequest);
exports.publicBiometricRouter.post("/server-time", handleServerTimeRequest);
/**
 * POST /api/public/biometric/device-sync-bundle
 * Accepts enrolled hardware users (with Fingerprint/Face/Card/PIN auth modes)
 * and attendance logs pulled directly from a ZKTeco/eSSL terminal by
 * MasterHRMS-Device-Manager.exe.
 */
exports.publicBiometricRouter.post("/device-sync-bundle", async (req, res) => {
    try {
        const { serialNumber, users = [], logs = [] } = req.body || {};
        const sn = String(serialNumber || "").trim();
        if (!sn) {
            return res.status(400).json({ error: "Device serialNumber is required." });
        }
        const device = await prisma_1.rawPrisma.biometricDevice.findFirst({
            where: { serialNumber: sn },
        });
        if (!device) {
            return res.status(401).json({
                error: `Biometric device with Serial Number "${sn}" is not registered in Master HRMS. Register it under Tenant → Biometric Hardware first.`,
            });
        }
        // 1. Store enrolled hardware users & auth modes snapshot for this device
        const normalizedUsers = Array.isArray(users)
            ? users
                .filter((u) => u && (u.biometricId || u.userId))
                .map((u) => {
                const fpCount = Number(u.fingerprintCount) || 0;
                const hasFace = Boolean(u.hasFace);
                const hasCard = Boolean(u.hasCard) || Boolean(u.cardNumber && String(u.cardNumber).trim() && String(u.cardNumber) !== "0");
                const hasPassword = Boolean(u.hasPassword);
                const modes = [];
                if (fpCount > 0)
                    modes.push("Fingerprint");
                if (hasFace)
                    modes.push("Face");
                if (hasCard)
                    modes.push("RFID Card");
                if (hasPassword)
                    modes.push("PIN");
                if (Array.isArray(u.authModes)) {
                    for (const m of u.authModes) {
                        if (m && !modes.includes(String(m)))
                            modes.push(String(m));
                    }
                }
                return {
                    biometricId: String(u.biometricId || u.userId).trim(),
                    name: String(u.name || `User ${u.biometricId || u.userId}`).trim(),
                    cardNumber: u.cardNumber ? String(u.cardNumber).trim() : "",
                    fingerprintCount: fpCount,
                    hasFace,
                    hasCard,
                    hasPassword,
                    authModes: modes.length > 0 ? modes : ["Fingerprint"],
                    privilege: String(u.privilege || "User"),
                    enabled: u.enabled !== false,
                };
            })
            : [];
        if (normalizedUsers.length > 0) {
            const snapshot = { syncedAt: new Date().toISOString(), users: normalizedUsers };
            exports.hardwareUsersCache.set(device.id, snapshot);
            exports.hardwareUsersCache.set(device.serialNumber, snapshot);
            // Persist in PostgreSQL so enrolled machine names & auth modes survive server restarts
            try {
                await prisma_1.rawPrisma.setting.upsert({
                    where: {
                        scope_scopeId_key: {
                            scope: "TENANT",
                            scopeId: device.tenantId,
                            key: `biometric_hw_users_${device.id}`,
                        },
                    },
                    create: {
                        scope: "TENANT",
                        scopeId: device.tenantId,
                        group: "biometric",
                        key: `biometric_hw_users_${device.id}`,
                        valueJson: snapshot,
                        valueType: "json",
                        isSecret: false,
                    },
                    update: {
                        valueJson: snapshot,
                        version: { increment: 1 },
                    },
                });
            }
            catch (persistErr) {
                console.warn("[device-sync-bundle] Failed to persist hardware users snapshot:", persistErr);
            }
        }
        // 2. High-Speed Bulk Ingestion of attendance punch logs (supports 2+ years / 50,000+ historical logs without timeouts)
        let accepted = 0;
        let duplicates = 0;
        let failed = 0;
        let attendanceDaysSynced = 0;
        let lateDaysDetected = 0;
        let absentDaysMarked = 0;
        let sandwichDaysMarked = 0;
        const finalizeFullSync = Boolean(req.body?.finalizeFullSync);
        const incomingLogs = Array.isArray(logs) ? logs : [];
        // Preload PIN mappings & employees once per batch
        const [mappings, employees] = await Promise.all([
            prisma_1.rawPrisma.biometricEmployeeMapping.findMany({
                where: { tenantId: device.tenantId, isActive: true },
                select: { devicePin: true, employeeId: true, deviceId: true },
            }),
            prisma_1.rawPrisma.employee.findMany({
                where: { tenantId: device.tenantId },
                select: { id: true, employeeCode: true },
            }),
        ]);
        const pinToEmployeeId = new Map();
        for (const emp of employees) {
            if (!emp.employeeCode)
                continue;
            const code = String(emp.employeeCode).trim();
            const stripped = code.replace(/^0+/, "") || code;
            pinToEmployeeId.set(code, emp.id);
            pinToEmployeeId.set(stripped, emp.id);
            const numMatch = code.match(/(\d+)$/);
            if (numMatch) {
                pinToEmployeeId.set(numMatch[1], emp.id);
                pinToEmployeeId.set(numMatch[1].replace(/^0+/, "") || numMatch[1], emp.id);
            }
        }
        // Explicit device mappings override code-based matching
        for (const m of mappings) {
            if (m.deviceId && m.deviceId !== device.id)
                continue;
            const pin = String(m.devicePin).trim();
            const stripped = pin.replace(/^0+/, "") || pin;
            pinToEmployeeId.set(pin, m.employeeId);
            pinToEmployeeId.set(stripped, m.employeeId);
        }
        const parsedLogs = [];
        let minTimeMs = Infinity;
        let maxTimeMs = -Infinity;
        for (const l of incomingLogs) {
            const empCode = String(l.employeeCode || l.userId || "").trim();
            if (!empCode)
                continue;
            const punchTime = l.punchTime ? new Date(l.punchTime) : new Date();
            if (Number.isNaN(punchTime.getTime())) {
                failed++;
                continue;
            }
            const stripped = empCode.replace(/^0+/, "") || empCode;
            const employeeId = pinToEmployeeId.get(empCode) || pinToEmployeeId.get(stripped) || null;
            let resolvedPunchType = l.punchType || "auto";
            if (device.purpose === "check_in_only")
                resolvedPunchType = "check_in";
            else if (device.purpose === "check_out_only")
                resolvedPunchType = "check_out";
            const ms = punchTime.getTime();
            if (ms < minTimeMs)
                minTimeMs = ms;
            if (ms > maxTimeMs)
                maxTimeMs = ms;
            parsedLogs.push({
                employeeCode: empCode,
                employeeId,
                punchTime,
                punchType: resolvedPunchType,
                verificationMode: l.verificationMode || "fingerprint",
                rawPayload: JSON.stringify(l),
            });
        }
        const affectedEmployeePins = new Map();
        if (parsedLogs.length > 0) {
            // Single query to find already-stored punches in this batch's time window
            const existingInWindow = await prisma_1.rawPrisma.biometricPunchLog.findMany({
                where: {
                    tenantId: device.tenantId,
                    punchTime: {
                        gte: new Date(minTimeMs - 1000),
                        lte: new Date(maxTimeMs + 1000),
                    },
                },
                select: { employeeCode: true, punchTime: true },
            });
            const existingKeys = new Set(existingInWindow.map((e) => `${e.employeeCode}::${e.punchTime.getTime()}`));
            const seenInBatch = new Set();
            const rowsToInsert = [];
            for (const item of parsedLogs) {
                const key = `${item.employeeCode}::${item.punchTime.getTime()}`;
                if (existingKeys.has(key) || seenInBatch.has(key)) {
                    duplicates++;
                    continue;
                }
                seenInBatch.add(key);
                rowsToInsert.push({
                    tenantId: device.tenantId,
                    deviceId: device.id,
                    employeeCode: item.employeeCode,
                    employeeId: item.employeeId,
                    punchTime: item.punchTime,
                    punchType: item.punchType,
                    verificationMode: item.verificationMode,
                    syncStatus: item.employeeId ? "processed" : "unmatched_employee",
                    rawPayload: item.rawPayload,
                });
                if (item.employeeId) {
                    if (!affectedEmployeePins.has(item.employeeId)) {
                        affectedEmployeePins.set(item.employeeId, new Set());
                    }
                    affectedEmployeePins.get(item.employeeId).add(item.employeeCode);
                }
            }
            if (rowsToInsert.length > 0) {
                const created = await prisma_1.rawPrisma.biometricPunchLog.createMany({
                    data: rowsToInsert,
                    skipDuplicates: true,
                });
                accepted = created.count;
            }
        }
        // 3. Reconcile company-time attendance (late, early-out, half-day, absent, sandwich)
        // On final full-sync batch, reconcile ALL mapped/matched employees across the full history!
        if (finalizeFullSync) {
            const empToPins = new Map();
            for (const m of mappings) {
                if (!empToPins.has(m.employeeId))
                    empToPins.set(m.employeeId, new Set());
                empToPins.get(m.employeeId).add(String(m.devicePin).trim());
            }
            for (const emp of employees) {
                if (!emp.employeeCode)
                    continue;
                if (!empToPins.has(emp.id))
                    empToPins.set(emp.id, new Set());
                empToPins.get(emp.id).add(String(emp.employeeCode).trim());
            }
            for (const [empId, pins] of empToPins.entries()) {
                const r = await (0, biometric_attendance_evaluator_service_1.syncEmployeeBiometricAttendanceAndPolicies)({
                    tenantId: device.tenantId,
                    employeeId: empId,
                    biometricPins: Array.from(pins),
                    deviceName: device.deviceName,
                    reconcileAbsentAndSandwich: true,
                }).catch(() => ({ logsLinked: 0, daysSynced: 0, lateDays: 0, absentDays: 0, sandwichDays: 0 }));
                attendanceDaysSynced += r.daysSynced;
                lateDaysDetected += r.lateDays;
                absentDaysMarked += r.absentDays;
                sandwichDaysMarked += r.sandwichDays;
            }
        }
        else if (affectedEmployeePins.size > 0 && accepted > 0) {
            // Incremental sync (e.g. background 5-min sync): update affected employees' attendance with company shift timing
            for (const [empId, pins] of affectedEmployeePins.entries()) {
                const r = await (0, biometric_attendance_evaluator_service_1.syncEmployeeBiometricAttendanceAndPolicies)({
                    tenantId: device.tenantId,
                    employeeId: empId,
                    biometricPins: Array.from(pins),
                    deviceName: device.deviceName,
                    reconcileAbsentAndSandwich: false,
                }).catch(() => ({ logsLinked: 0, daysSynced: 0, lateDays: 0, absentDays: 0, sandwichDays: 0 }));
                attendanceDaysSynced += r.daysSynced;
                lateDaysDetected += r.lateDays;
            }
        }
        const totalDeviceLogs = await prisma_1.rawPrisma.biometricPunchLog.count({
            where: { deviceId: device.id },
        });
        await prisma_1.rawPrisma.biometricDevice.update({
            where: { id: device.id },
            data: { status: "online", lastSyncAt: new Date(), totalPunchLogs: totalDeviceLogs },
        });
        return res.status(200).json({
            ok: true,
            deviceId: device.id,
            serialNumber: device.serialNumber,
            usersSynced: normalizedUsers.length,
            logsAccepted: accepted,
            logsDuplicate: duplicates,
            logsFailed: failed,
            attendanceDaysSynced,
            lateDaysDetected,
            absentDaysMarked,
            sandwichDaysMarked,
            message: finalizeFullSync
                ? `Full sync complete: ${accepted} new logs, ${attendanceDaysSynced} attendance days (${lateDaysDetected} late, ${absentDaysMarked} absent, ${sandwichDaysMarked} sandwich).`
                : `Synced ${normalizedUsers.length} hardware users and ${accepted} new punch logs (${duplicates} duplicates skipped).`,
        });
    }
    catch (err) {
        console.error("[POST /api/public/biometric/device-sync-bundle] error:", err);
        return res.status(500).json({ error: err.message || "Device sync bundle failed." });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// WAVE 2.3 — Matrix COSEC Webhook Adapter
// ═══════════════════════════════════════════════════════════════════════════
/**
 * POST /api/biometric/matrix/push
 * Receives attendance events directly pushed by Matrix COSEC devices.
 *
 * Authentication: x-biometric-key header (device API key) OR x-tenant-id.
 * Body: single CosecPunchEvent object OR array of CosecPunchEvent objects.
 *
 * The endpoint:
 *   1. Resolves the tenant from the API key.
 *   2. Looks up BiometricEmployeeMapping for the UserCode on this device
 *      to get the canonical employeeCode.
 *   3. Stores unresolvable punches in BiometricOfflineBuffer (status=pending)
 *      for nightly reconciliation.
 *   4. Deduplicates by (tenantId, employeeCode, punchTime) at the punch-log level.
 */
exports.biometricRouter.post("/matrix/push", async (req, res) => {
    try {
        const apiKey = (req.headers["x-biometric-key"] || req.query.apiKey || "").toString();
        const explicitTenantHeader = (req.headers["x-tenant-id"] || req.query.tenantId || "").toString();
        const isProduction = process.env.NODE_ENV === "production";
        let tenantId = null;
        let device = null;
        // 1. Resolve tenant via device API key if provided
        if (apiKey) {
            device = await prisma_1.rawPrisma.biometricDevice.findUnique({ where: { apiKey } });
            if (!device) {
                return res.status(401).json({ error: "Invalid biometric device API key." });
            }
            tenantId = device.tenantId;
            // Security check: Prevent tenant impersonation
            if (explicitTenantHeader && explicitTenantHeader !== tenantId) {
                return res.status(403).json({
                    error: "Tenant impersonation forbidden: provided x-tenant-id does not match registered device tenant.",
                });
            }
        }
        else {
            // In production, an API key is mandatory for hardware webhooks
            if (isProduction) {
                return res.status(401).json({
                    error: "Authentication required: x-biometric-key header is required in production.",
                });
            }
            // Non-production fallback with strict safeguards:
            if (explicitTenantHeader) {
                const tenantExists = await prisma_1.rawPrisma.tenant.findUnique({ where: { id: explicitTenantHeader } });
                if (!tenantExists) {
                    return res.status(404).json({ error: "Specified x-tenant-id does not exist." });
                }
                tenantId = explicitTenantHeader;
            }
            else {
                // Only allow first-tenant fallback if there is strictly 1 tenant in the entire system or explicit single-tenant mode
                const totalTenants = await prisma_1.rawPrisma.tenant.count();
                if (totalTenants === 1 || process.env.SINGLE_TENANT_MODE === "true") {
                    const first = await prisma_1.rawPrisma.tenant.findFirst({ select: { id: true } });
                    if (first)
                        tenantId = first.id;
                }
                else {
                    return res.status(401).json({
                        error: "Authentication required: Multiple tenants exist. Provide x-biometric-key to identify tenant.",
                    });
                }
            }
        }
        if (!tenantId) {
            return res.status(401).json({ error: "Unable to resolve tenant. Provide valid x-biometric-key." });
        }
        // Normalise body: support both single-event and batch-event payloads
        const rawBody = req.body;
        const events = Array.isArray(rawBody) ? rawBody : [rawBody];
        if (!events.length || !events[0]?.UserCode) {
            return res.status(400).json({ error: "No valid COSEC events in payload. UserCode is required." });
        }
        const records = (0, matrix_cosec_adapter_1.normalizeCosecBatch)(events);
        let accepted = 0;
        let buffered = 0;
        let duplicate = 0;
        for (const record of records) {
            // Resolve employee via PIN mapping table (device-scoped)
            let resolvedEmployeeCode = record.employeeCode;
            if (device) {
                const mapping = await prisma_1.rawPrisma.biometricEmployeeMapping.findFirst({
                    where: { deviceId: device.id, devicePin: record.employeeCode, isActive: true },
                    include: { employee: { select: { employeeCode: true } } },
                });
                if (mapping?.employee?.employeeCode) {
                    resolvedEmployeeCode = mapping.employee.employeeCode;
                }
            }
            try {
                const punchResult = await processBiometricPunch({
                    tenantId,
                    deviceId: device?.id,
                    employeeCode: resolvedEmployeeCode,
                    punchTime: record.punchTime,
                    punchType: record.punchType,
                    verificationMode: record.verificationMode,
                    rawPayload: record.rawPayload,
                });
                // Accurately distinguish duplicate punches from accepted new events
                if (punchResult?.isDuplicate) {
                    duplicate++;
                    continue;
                }
                // Update device heartbeat
                if (device) {
                    await prisma_1.rawPrisma.biometricDevice.update({
                        where: { id: device.id },
                        data: { lastSyncAt: new Date(), status: "online" },
                    }).catch(() => { }); // non-fatal
                }
                accepted++;
            }
            catch (punchErr) {
                // Deduplicate punches (exact same timestamp already recorded)
                if (punchErr?.code === "P2002" || String(punchErr?.message).toLowerCase().includes("duplicate")) {
                    duplicate++;
                    continue;
                }
                // Store in offline buffer for nightly reconciliation
                await prisma_1.rawPrisma.biometricOfflineBuffer.create({
                    data: {
                        tenantId,
                        deviceId: device?.id ?? null,
                        serialNumber: events[0]?.DeviceCode ?? null,
                        vendorType: "matrix_cosec",
                        rawPayload: record.rawPayload,
                        employeeCode: resolvedEmployeeCode,
                        punchTime: record.punchTime,
                        punchType: record.punchType,
                        verificationMode: record.verificationMode,
                        status: "pending",
                        failureReason: String(punchErr?.message || "").slice(0, 500),
                    },
                }).catch((bufErr) => console.error("[MATRIX PUSH] Failed to buffer punch:", bufErr));
                buffered++;
            }
        }
        return res.status(200).json({
            status: "SUCCESS",
            accepted,
            buffered,
            duplicate,
            total: records.length,
            message: `COSEC push processed: ${accepted} accepted, ${buffered} buffered, ${duplicate} duplicate.`,
        });
    }
    catch (err) {
        console.error("[POST /api/biometric/matrix/push] error:", err);
        return res.status(500).json({ error: err.message || "Matrix COSEC push failed." });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// Historical Machine Punch Log → Attendance Backfill Helper
// ═══════════════════════════════════════════════════════════════════════════
async function backfillAttendanceForBiometricPin(tenantId, devicePin, employeeId, deviceName = "Biometric Terminal") {
    const db = prisma_1.rawPrisma;
    const trimmedPin = String(devicePin || "").trim();
    const strippedPin = trimmedPin.replace(/^0+/, "") || trimmedPin;
    if (!trimmedPin)
        return { logsLinked: 0, daysSynced: 0, lateDays: 0, absentDays: 0, sandwichDays: 0 };
    return await (0, biometric_attendance_evaluator_service_1.syncEmployeeBiometricAttendanceAndPolicies)({
        tenantId,
        employeeId,
        biometricPins: [trimmedPin, strippedPin],
        deviceName,
        reconcileAbsentAndSandwich: true,
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// WAVE 2.3 — BiometricEmployeeMapping CRUD
// ═══════════════════════════════════════════════════════════════════════════
/**
 * GET /api/biometric/devices/:id/mappings
 * List all PIN → Employee mappings for a device
 */
exports.biometricRouter.get("/devices/:id/mappings", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const device = await prisma_1.prisma.biometricDevice.findUnique({ where: { id } });
        if (!device || device.tenantId !== tenantId) {
            return res.status(404).json({ error: "Biometric device not found." });
        }
        const mappings = await prisma_1.prisma.biometricEmployeeMapping.findMany({
            where: { deviceId: id, tenantId },
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { createdAt: "asc" },
        });
        return res.json(mappings);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch mappings." });
    }
});
/**
 * POST /api/biometric/devices/:id/mappings
 * Create or upsert a PIN → Employee mapping for a device
 */
exports.biometricRouter.post("/devices/:id/mappings", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { employeeId, devicePin, vendorType, notes } = req.body;
        if (!employeeId || !devicePin) {
            return res.status(400).json({ error: "employeeId and devicePin are required." });
        }
        const device = await prisma_1.prisma.biometricDevice.findUnique({ where: { id } });
        if (!device || device.tenantId !== tenantId) {
            return res.status(404).json({ error: "Biometric device not found." });
        }
        // Check if this PIN is already assigned to a different employee on this device
        const trimmedPin = String(devicePin).trim();
        const pinConflict = await prisma_1.prisma.biometricEmployeeMapping.findFirst({
            where: { deviceId: id, devicePin: trimmedPin, employeeId: { not: employeeId } },
        });
        if (pinConflict) {
            return res.status(409).json({ error: `PIN "${trimmedPin}" is already mapped to another employee on this terminal.` });
        }
        // Upsert: update if mapping for this device+employee already exists
        const existing = await prisma_1.prisma.biometricEmployeeMapping.findFirst({
            where: { deviceId: id, employeeId },
        });
        let mapping;
        if (existing) {
            mapping = await prisma_1.prisma.biometricEmployeeMapping.update({
                where: { id: existing.id },
                data: { devicePin: trimmedPin, vendorType: vendorType || "matrix_cosec", notes: notes ?? undefined, isActive: true },
            });
        }
        else {
            mapping = await prisma_1.prisma.biometricEmployeeMapping.create({
                data: {
                    tenantId,
                    deviceId: id,
                    employeeId,
                    devicePin: trimmedPin,
                    vendorType: vendorType || "matrix_cosec",
                    notes: notes ?? undefined,
                },
            });
        }
        // Retroactively link ALL historical machine punch logs for this PIN and create/update Attendance records
        const backfill = await backfillAttendanceForBiometricPin(tenantId, trimmedPin, employeeId, device.deviceName);
        return res.status(201).json({
            success: true,
            message: `PIN ${devicePin} mapped! Synced ${backfill.logsLinked} machine punches across ${backfill.daysSynced} attendance days.`,
            mapping,
            backfill,
        });
    }
    catch (err) {
        if (err?.code === "P2002") {
            return res.status(409).json({ error: "This PIN is already mapped to another employee on this device." });
        }
        return res.status(500).json({ error: err.message || "Failed to create mapping." });
    }
});
/**
 * POST /api/biometric/reprocess-attendance
 * Backfills ALL historical BiometricPunchLogs for every mapped or code-matched
 * employee into the Attendance table (First-In / Last-Out per tenant calendar day).
 */
exports.biometricRouter.post("/reprocess-attendance", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const [mappings, employees] = await Promise.all([
            prisma_1.rawPrisma.biometricEmployeeMapping.findMany({
                where: { tenantId, isActive: true },
                include: { device: { select: { deviceName: true } } },
            }),
            prisma_1.rawPrisma.employee.findMany({
                where: { tenantId },
                select: { id: true, employeeCode: true },
            }),
        ]);
        let totalLogs = 0;
        let totalDays = 0;
        let totalLate = 0;
        let totalAbsent = 0;
        let totalSandwich = 0;
        const empPins = new Map();
        for (const m of mappings) {
            if (!empPins.has(m.employeeId)) {
                empPins.set(m.employeeId, { pins: new Set(), deviceName: m.device?.deviceName || "Biometric Terminal" });
            }
            empPins.get(m.employeeId).pins.add(String(m.devicePin).trim());
        }
        for (const emp of employees) {
            if (!emp.employeeCode)
                continue;
            if (!empPins.has(emp.id)) {
                empPins.set(emp.id, { pins: new Set(), deviceName: "Biometric Terminal" });
            }
            empPins.get(emp.id).pins.add(String(emp.employeeCode).trim());
        }
        for (const [empId, { pins, deviceName }] of empPins.entries()) {
            const r = await (0, biometric_attendance_evaluator_service_1.syncEmployeeBiometricAttendanceAndPolicies)({
                tenantId,
                employeeId: empId,
                biometricPins: Array.from(pins),
                deviceName,
                reconcileAbsentAndSandwich: true,
            });
            totalLogs += r.logsLinked;
            totalDays += r.daysSynced;
            totalLate += r.lateDays;
            totalAbsent += r.absentDays;
            totalSandwich += r.sandwichDays;
        }
        return res.json({
            success: true,
            logsLinked: totalLogs,
            daysSynced: totalDays,
            lateDays: totalLate,
            absentDays: totalAbsent,
            sandwichDays: totalSandwich,
            message: `Synced ${totalLogs} punches into ${totalDays} attendance days (${totalLate} late, ${totalAbsent} absent, ${totalSandwich} sandwich leave).`,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to reprocess biometric attendance." });
    }
});
/**
 * PUT /api/biometric/devices/:id/mappings/:mappingId
 * Update or activate/deactivate an existing PIN mapping
 */
exports.biometricRouter.put("/devices/:id/mappings/:mappingId", auth_1.requireAuth, async (req, res) => {
    try {
        const { id, mappingId } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const mapping = await prisma_1.prisma.biometricEmployeeMapping.findUnique({ where: { id: mappingId } });
        if (!mapping || mapping.tenantId !== tenantId || mapping.deviceId !== id) {
            return res.status(404).json({ error: "Mapping not found." });
        }
        const { devicePin, isActive, vendorType, notes } = req.body;
        const data = {};
        if (devicePin !== undefined) {
            const trimmedPin = String(devicePin).trim();
            const conflict = await prisma_1.prisma.biometricEmployeeMapping.findFirst({
                where: { deviceId: id, devicePin: trimmedPin, id: { not: mappingId } },
            });
            if (conflict) {
                return res.status(409).json({ error: `PIN "${trimmedPin}" is already mapped to another employee on this terminal.` });
            }
            data.devicePin = trimmedPin;
        }
        if (isActive !== undefined)
            data.isActive = Boolean(isActive);
        if (vendorType !== undefined)
            data.vendorType = String(vendorType);
        if (notes !== undefined)
            data.notes = notes;
        const updated = await prisma_1.prisma.biometricEmployeeMapping.update({
            where: { id: mappingId },
            data,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        });
        return res.json({ success: true, message: "PIN mapping updated successfully.", mapping: updated });
    }
    catch (err) {
        if (err?.code === "P2002") {
            return res.status(409).json({ error: "This PIN is already mapped to another employee on this device." });
        }
        return res.status(500).json({ error: err.message || "Failed to update mapping." });
    }
});
/**
 * DELETE /api/biometric/devices/:id/mappings/:mappingId
 * Remove (deactivate) a PIN → Employee mapping
 */
exports.biometricRouter.delete("/devices/:id/mappings/:mappingId", auth_1.requireAuth, async (req, res) => {
    try {
        const { id, mappingId } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const mapping = await prisma_1.prisma.biometricEmployeeMapping.findUnique({ where: { id: mappingId } });
        if (!mapping || mapping.tenantId !== tenantId || mapping.deviceId !== id) {
            return res.status(404).json({ error: "Mapping not found." });
        }
        await prisma_1.prisma.biometricEmployeeMapping.delete({ where: { id: mappingId } });
        return res.json({ success: true, message: "PIN mapping removed." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to remove mapping." });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// WAVE 2.3 — Offline Buffer Status & Manual Replay
// ═══════════════════════════════════════════════════════════════════════════
/**
 * GET /api/biometric/offline-buffer
 * List offline buffer entries for the tenant (filtered by status)
 */
exports.biometricRouter.get("/offline-buffer", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const { status = "pending", limit = "50" } = req.query;
        const where = { tenantId };
        if (status !== "all")
            where.status = String(status);
        const entries = await prisma_1.prisma.biometricOfflineBuffer.findMany({
            where,
            orderBy: { punchTime: "desc" },
            take: Math.min(Number(limit) || 50, 200),
        });
        const stats = await prisma_1.prisma.biometricOfflineBuffer.groupBy({
            by: ["status"],
            where: { tenantId },
            _count: true,
        });
        return res.json({ entries, stats });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch offline buffer." });
    }
});
/**
 * POST /api/biometric/offline-buffer/replay
 * Manually trigger a replay of pending offline buffer entries (HR Admin only).
 * The nightly cron runs this automatically, but admins can trigger it on-demand.
 */
exports.biometricRouter.post("/offline-buffer/replay", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const pending = await prisma_1.prisma.biometricOfflineBuffer.findMany({
            where: { tenantId, status: "pending" },
            orderBy: { punchTime: "asc" },
            take: 500,
        });
        let processed = 0;
        let failed = 0;
        let duplicate = 0;
        for (const entry of pending) {
            try {
                const punchResult = await processBiometricPunch({
                    tenantId: entry.tenantId,
                    deviceId: entry.deviceId ?? undefined,
                    employeeCode: entry.employeeCode,
                    punchTime: entry.punchTime,
                    punchType: entry.punchType,
                    verificationMode: entry.verificationMode,
                    rawPayload: entry.rawPayload,
                });
                const isDup = punchResult?.isDuplicate;
                await prisma_1.prisma.biometricOfflineBuffer.update({
                    where: { id: entry.id },
                    data: { status: isDup ? "duplicate" : "processed", processedAt: new Date() },
                });
                if (isDup)
                    duplicate++;
                else
                    processed++;
            }
            catch (err) {
                const isDup = err?.code === "P2002" || String(err?.message).toLowerCase().includes("duplicate");
                await prisma_1.prisma.biometricOfflineBuffer.update({
                    where: { id: entry.id },
                    data: { status: isDup ? "duplicate" : "failed", failureReason: String(err?.message || "").slice(0, 500), processedAt: new Date() },
                });
                if (isDup)
                    duplicate++;
                else
                    failed++;
            }
        }
        return res.json({
            success: true,
            message: `Replay complete: ${processed} processed, ${failed} failed, ${duplicate} duplicates.`,
            processed,
            failed,
            duplicate,
            total: pending.length,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Offline buffer replay failed." });
    }
});
