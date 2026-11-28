"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimeToMinutes = parseTimeToMinutes;
exports.getTenantLocalTimeParts = getTenantLocalTimeParts;
exports.resolveEmployeeTimingContext = resolveEmployeeTimingContext;
exports.computePunchMetrics = computePunchMetrics;
exports.evaluateSingleDayBiometricAttendance = evaluateSingleDayBiometricAttendance;
exports.syncEmployeeBiometricAttendanceAndPolicies = syncEmployeeBiometricAttendanceAndPolicies;
const prisma_1 = require("../prisma");
const sandwich_leave_service_1 = require("./sandwich-leave.service");
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/**
 * Parses "HH:mm" (or "HH:mm:ss") into total minutes from midnight (0..1439).
 */
function parseTimeToMinutes(timeStr, fallbackMinutes = 9 * 60 + 30) {
    if (!timeStr || typeof timeStr !== "string")
        return fallbackMinutes;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match)
        return fallbackMinutes;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        return fallbackMinutes;
    }
    return h * 60 + m;
}
/**
 * Extracts { dateKey: "YYYY-MM-DD", minutesOfDay: 0..1439, hhmm: "HH:mm" }
 * for a UTC Date in the tenant's configured IANA timezone.
 */
function getTenantLocalTimeParts(dt, timezone) {
    const tz = (timezone && timezone.trim()) || "Asia/Kolkata";
    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(dt);
        const get = (type) => parts.find((p) => p.type === type)?.value || "00";
        const year = get("year");
        const month = get("month");
        const day = get("day");
        let hour = Number(get("hour"));
        if (hour === 24)
            hour = 0;
        const minute = Number(get("minute"));
        const dateKey = `${year}-${month}-${day}`;
        const hhmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        return {
            dateKey,
            dateUtc: new Date(`${dateKey}T00:00:00.000Z`),
            minutesOfDay: hour * 60 + minute,
            hhmm,
        };
    }
    catch {
        const dateKey = dt.toISOString().slice(0, 10);
        const hour = dt.getUTCHours();
        const minute = dt.getUTCMinutes();
        return {
            dateKey,
            dateUtc: new Date(`${dateKey}T00:00:00.000Z`),
            minutesOfDay: hour * 60 + minute,
            hhmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        };
    }
}
/**
 * Resolves company timezone, default shift, matching attendance policy, and sandwich setting.
 */
async function resolveEmployeeTimingContext(tenantId, employee) {
    const [tenant, policies, shifts, sandwichSetting] = await Promise.all([
        prisma_1.rawPrisma.tenant.findUnique({
            where: { id: tenantId },
            select: { timezone: true },
        }),
        prisma_1.rawPrisma.attendancePolicy.findMany({
            where: { tenantId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        }),
        prisma_1.rawPrisma.shiftDefinition.findMany({
            where: { tenantId },
            orderBy: { createdAt: "asc" },
            take: 10,
        }),
        sandwich_leave_service_1.SandwichLeaveService.getSandwichPolicySetting(tenantId).catch(() => ({
            sandwichRuleEnabled: false,
        })),
    ]);
    let policy = policies.find((p) => p.branchId && employee.branchId && p.branchId === employee.branchId &&
        p.departmentId && employee.departmentId && p.departmentId === employee.departmentId);
    if (!policy && employee.branchId) {
        policy = policies.find((p) => p.branchId === employee.branchId && !p.departmentId);
    }
    if (!policy && employee.departmentId) {
        policy = policies.find((p) => !p.branchId && p.departmentId === employee.departmentId);
    }
    if (!policy) {
        policy = policies.find((p) => p.isDefault) || policies[0];
    }
    // Prefer a General/Day shift if multiple shifts exist
    const preferredShift = shifts.find((s) => /general|day|default|standard|morning/i.test(s.name || s.code || "")) ||
        shifts[0] ||
        null;
    return {
        timezone: (tenant?.timezone && tenant.timezone.trim()) || "Asia/Kolkata",
        workingDays: policy?.workingDays || "Mon,Tue,Wed,Thu,Fri",
        graceMinutes: policy?.graceMinutes ?? 15,
        halfDayHours: policy?.halfDayHours != null ? Number(policy.halfDayHours) : 4.0,
        fullDayHours: policy?.fullDayHours != null ? Number(policy.fullDayHours) : 8.0,
        isOvertimeAllowed: policy?.isOvertimeAllowed ?? true,
        minOvertimeMinutes: policy?.minOvertimeMinutes ?? 60,
        policyId: policy?.id ?? null,
        defaultShift: {
            id: preferredShift?.id ?? null,
            name: preferredShift?.name || "Company Shift",
            startTime: preferredShift?.startTime || "09:30",
            endTime: preferredShift?.endTime || "18:30",
            breakMinutes: preferredShift?.breakMinutes ?? 60,
            isOvertimeEligible: preferredShift?.isOvertimeEligible ?? true,
        },
        sandwichRuleEnabled: Boolean(sandwichSetting?.sandwichRuleEnabled),
    };
}
/**
 * Pure computation of attendance status, lateMinutes, earlyOutMinutes, overtimeMinutes, and workHours
 * comparing actual first-in / last-out punches against the shift & company policy.
 */
function computePunchMetrics(params) {
    const { checkIn, checkOut, timezone, shift, graceMinutes, halfDayHours, isOvertimeAllowed, minOvertimeMinutes, policyId, deviceLabel = "Biometric", } = params;
    const inParts = getTenantLocalTimeParts(checkIn, timezone);
    const shiftStartMins = parseTimeToMinutes(shift.startTime, 9 * 60 + 30);
    const shiftEndMins = parseTimeToMinutes(shift.endTime, 18 * 60 + 30);
    const isNightShift = shiftEndMins < shiftStartMins;
    // Late calculation against shift start + grace period
    let lateMinutes = 0;
    if (!isNightShift) {
        if (inParts.minutesOfDay > shiftStartMins + graceMinutes) {
            lateMinutes = inParts.minutesOfDay - shiftStartMins;
        }
    }
    else {
        // Night shift (e.g. 22:00 - 06:00): if checkIn is after shiftStart on same evening
        if (inParts.minutesOfDay >= shiftStartMins - 120 && inParts.minutesOfDay > shiftStartMins + graceMinutes) {
            lateMinutes = inParts.minutesOfDay - shiftStartMins;
        }
    }
    let hours = 0;
    let earlyOutMinutes = 0;
    let overtimeMinutes = 0;
    if (checkOut && checkOut.getTime() > checkIn.getTime()) {
        hours = Number(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
        const outParts = getTenantLocalTimeParts(checkOut, timezone);
        if (!isNightShift) {
            if (outParts.minutesOfDay < shiftEndMins) {
                earlyOutMinutes = shiftEndMins - outParts.minutesOfDay;
            }
            else if (isOvertimeAllowed && shift.isOvertimeEligible) {
                const extra = outParts.minutesOfDay - shiftEndMins;
                if (extra >= minOvertimeMinutes) {
                    overtimeMinutes = extra;
                }
            }
        }
        else {
            // Night shift checkout comparison
            if (outParts.minutesOfDay < shiftEndMins) {
                earlyOutMinutes = shiftEndMins - outParts.minutesOfDay;
            }
            else if (isOvertimeAllowed && shift.isOvertimeEligible && outParts.minutesOfDay < shiftStartMins) {
                const extra = outParts.minutesOfDay - shiftEndMins;
                if (extra >= minOvertimeMinutes) {
                    overtimeMinutes = extra;
                }
            }
        }
    }
    // Final status priority:
    // 1. If checked out and worked strictly less than halfDayHours (e.g. < 4h) -> half_day
    // 2. Else if lateMinutes > 0 -> late
    // 3. Else -> present
    let status = "present";
    if (checkOut && hours > 0 && hours < halfDayHours) {
        status = "half_day";
    }
    else if (lateMinutes > 0) {
        status = "late";
    }
    const noteParts = [`${deviceLabel} (${inParts.hhmm}${checkOut ? `–${getTenantLocalTimeParts(checkOut, timezone).hhmm}` : ""})`];
    if (lateMinutes > 0)
        noteParts.push(`Late ${lateMinutes}m vs ${shift.startTime}`);
    if (earlyOutMinutes > 0)
        noteParts.push(`Early out ${earlyOutMinutes}m vs ${shift.endTime}`);
    if (overtimeMinutes > 0)
        noteParts.push(`OT ${overtimeMinutes}m`);
    return {
        status,
        hours,
        lateMinutes,
        earlyOutMinutes,
        overtimeMinutes,
        policyId,
        shiftId: shift.id,
        shiftLabel: `${shift.name} (${shift.startTime}-${shift.endTime})`,
        notes: noteParts.join(" | "),
    };
}
/**
 * Evaluates a single day's biometric punches for an employee against their shift & policy.
 */
async function evaluateSingleDayBiometricAttendance(params) {
    const { tenantId, employee, dateUtc, checkIn, checkOut, deviceLabel } = params;
    const [ctx, roster] = await Promise.all([
        resolveEmployeeTimingContext(tenantId, employee),
        prisma_1.rawPrisma.shiftRoster.findUnique({
            where: {
                tenantId_employeeId_rosterDate: {
                    tenantId,
                    employeeId: employee.id,
                    rosterDate: dateUtc,
                },
            },
            include: { shift: true },
        }),
    ]);
    const activeShift = roster?.shift
        ? {
            id: roster.shift.id,
            name: roster.shift.name,
            startTime: roster.shift.startTime,
            endTime: roster.shift.endTime,
            isOvertimeEligible: roster.shift.isOvertimeEligible,
        }
        : ctx.defaultShift;
    return computePunchMetrics({
        checkIn,
        checkOut,
        timezone: ctx.timezone,
        shift: activeShift,
        graceMinutes: ctx.graceMinutes,
        halfDayHours: ctx.halfDayHours,
        isOvertimeAllowed: ctx.isOvertimeAllowed,
        minOvertimeMinutes: ctx.minOvertimeMinutes,
        policyId: ctx.policyId,
        deviceLabel,
    });
}
/**
 * Full historical attendance sync + Auto-Absent + Sandwich Leave Auto-Sync for one employee.
 * Processes ALL biometric punch logs for the employee (no date cap — 2+ years supported),
 * computes exact late/early-out/overtime/half-day against company shift & policy,
 * marks missed working days as `absent` (from earliest punch or joining date up to yesterday),
 * and automatically marks sandwiched non-working days (weekends/holidays between absent/leave days)
 * when the tenant's Sandwich Leave policy is enabled.
 */
async function syncEmployeeBiometricAttendanceAndPolicies(params) {
    const { tenantId, employeeId, biometricPins, deviceName = "Biometric Terminal", reconcileAbsentAndSandwich = true, } = params;
    const pinVariants = Array.from(new Set(biometricPins
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .flatMap((p) => {
        const stripped = p.replace(/^0+/, "") || p;
        return [p, stripped];
    })));
    if (pinVariants.length === 0) {
        return { logsLinked: 0, daysSynced: 0, lateDays: 0, absentDays: 0, sandwichDays: 0 };
    }
    const employee = await prisma_1.rawPrisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true, branchId: true, departmentId: true, joinedAt: true, status: true },
    });
    if (!employee) {
        return { logsLinked: 0, daysSynced: 0, lateDays: 0, absentDays: 0, sandwichDays: 0 };
    }
    const [ctx, logs] = await Promise.all([
        resolveEmployeeTimingContext(tenantId, employee),
        prisma_1.rawPrisma.biometricPunchLog.findMany({
            where: {
                tenantId,
                OR: [
                    { employeeId },
                    { employeeCode: { in: pinVariants } },
                ],
            },
            orderBy: { punchTime: "asc" },
            select: { id: true, punchTime: true, employeeId: true, syncStatus: true },
        }),
    ]);
    if (logs.length === 0) {
        return { logsLinked: 0, daysSynced: 0, lateDays: 0, absentDays: 0, sandwichDays: 0 };
    }
    // 1. Link any unlinked logs in bulk
    const unlinkedIds = logs
        .filter((l) => l.employeeId !== employeeId || l.syncStatus !== "processed")
        .map((l) => l.id);
    if (unlinkedIds.length > 0) {
        for (let i = 0; i < unlinkedIds.length; i += 500) {
            await prisma_1.rawPrisma.biometricPunchLog.updateMany({
                where: { id: { in: unlinkedIds.slice(i, i + 500) } },
                data: { employeeId, syncStatus: "processed" },
            });
        }
    }
    // 2. Group ALL historical punches by tenant calendar date (First-In / Last-Out)
    const byDate = new Map();
    for (const log of logs) {
        const parts = getTenantLocalTimeParts(log.punchTime, ctx.timezone);
        if (!byDate.has(parts.dateKey)) {
            byDate.set(parts.dateKey, { dateUtc: parts.dateUtc, punches: [] });
        }
        byDate.get(parts.dateKey).punches.push(log.punchTime);
    }
    const sortedDateKeys = Array.from(byDate.keys()).sort();
    const earliestDateUtc = byDate.get(sortedDateKeys[0]).dateUtc;
    const todayLocal = getTenantLocalTimeParts(new Date(), ctx.timezone).dateUtc;
    const latestPunchDateUtc = byDate.get(sortedDateKeys[sortedDateKeys.length - 1]).dateUtc;
    const rangeEndUtc = latestPunchDateUtc > todayLocal ? latestPunchDateUtc : todayLocal;
    // 3. Prefetch existing attendance, shift rosters, holidays, and approved leaves across the entire range
    const [existingRows, rosters, holidays, approvedLeaves] = await Promise.all([
        prisma_1.rawPrisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                date: { gte: earliestDateUtc, lte: rangeEndUtc },
            },
        }),
        prisma_1.rawPrisma.shiftRoster.findMany({
            where: {
                tenantId,
                employeeId,
                rosterDate: { gte: earliestDateUtc, lte: rangeEndUtc },
            },
            include: { shift: true },
        }),
        prisma_1.rawPrisma.holiday.findMany({
            where: {
                tenantId,
                status: "active",
                date: { gte: earliestDateUtc, lte: rangeEndUtc },
            },
        }),
        prisma_1.rawPrisma.leaveRequest.findMany({
            where: {
                tenantId,
                employeeId,
                status: "approved",
                startDate: { lte: rangeEndUtc },
                endDate: { gte: earliestDateUtc },
            },
            include: { leaveType: true },
        }),
    ]);
    const existingByDate = new Map();
    for (const r of existingRows) {
        existingByDate.set(new Date(r.date).toISOString().slice(0, 10), r);
    }
    const rosterByDate = new Map();
    for (const r of rosters) {
        rosterByDate.set(new Date(r.rosterDate).toISOString().slice(0, 10), r);
    }
    const holidayByDate = new Map();
    for (const h of holidays) {
        if (!h.branchIds || h.branchIds.length === 0 || (employee.branchId && h.branchIds.includes(employee.branchId))) {
            holidayByDate.set(new Date(h.date).toISOString().slice(0, 10), h.name);
        }
    }
    const leaveByDate = new Map();
    for (const l of approvedLeaves) {
        const isHalf = l.halfDay || Number(l.days) < 1.0;
        const cur = new Date(l.startDate);
        cur.setUTCHours(0, 0, 0, 0);
        const end = new Date(l.endDate);
        end.setUTCHours(0, 0, 0, 0);
        while (cur <= end) {
            leaveByDate.set(cur.toISOString().slice(0, 10), {
                fullDay: !isHalf,
                name: l.leaveType?.name || "Approved Leave",
            });
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
    }
    // 4. Upsert all punched days with exact company-time evaluation
    let daysSynced = 0;
    let lateDays = 0;
    const computedStatusByDate = new Map();
    for (const [dateKey, { dateUtc, punches }] of byDate.entries()) {
        punches.sort((a, b) => a.getTime() - b.getTime());
        const firstPunch = punches[0];
        const lastPunch = punches.length > 1 ? punches[punches.length - 1] : null;
        const existing = existingByDate.get(dateKey);
        const effectiveCheckIn = existing?.checkIn && existing.checkIn < firstPunch ? existing.checkIn : firstPunch;
        const effectiveCheckOut = lastPunch && (!existing?.checkOut || lastPunch > existing.checkOut)
            ? lastPunch
            : existing?.checkOut || null;
        const roster = rosterByDate.get(dateKey);
        const activeShift = roster?.shift
            ? {
                id: roster.shift.id,
                name: roster.shift.name,
                startTime: roster.shift.startTime,
                endTime: roster.shift.endTime,
                isOvertimeEligible: roster.shift.isOvertimeEligible,
            }
            : ctx.defaultShift;
        const metrics = computePunchMetrics({
            checkIn: effectiveCheckIn,
            checkOut: effectiveCheckOut,
            timezone: ctx.timezone,
            shift: activeShift,
            graceMinutes: ctx.graceMinutes,
            halfDayHours: ctx.halfDayHours,
            isOvertimeAllowed: ctx.isOvertimeAllowed,
            minOvertimeMinutes: ctx.minOvertimeMinutes,
            policyId: ctx.policyId,
            deviceLabel: deviceName,
        });
        if (metrics.status === "late")
            lateDays++;
        computedStatusByDate.set(dateKey, metrics.status);
        if (!existing) {
            await prisma_1.rawPrisma.attendance
                .create({
                data: {
                    tenantId,
                    employeeId,
                    date: dateUtc,
                    checkIn: effectiveCheckIn,
                    checkOut: effectiveCheckOut,
                    hours: metrics.hours,
                    status: metrics.status,
                    lateMinutes: metrics.lateMinutes,
                    earlyOutMinutes: metrics.earlyOutMinutes,
                    overtimeMinutes: metrics.overtimeMinutes,
                    policyId: metrics.policyId,
                    shiftId: metrics.shiftId,
                    source: "BIOMETRIC",
                    notes: metrics.notes,
                },
            })
                .catch(() => { });
        }
        else {
            await prisma_1.rawPrisma.attendance
                .update({
                where: { id: existing.id },
                data: {
                    checkIn: effectiveCheckIn,
                    checkOut: effectiveCheckOut,
                    hours: metrics.hours,
                    status: metrics.status,
                    lateMinutes: metrics.lateMinutes,
                    earlyOutMinutes: metrics.earlyOutMinutes,
                    overtimeMinutes: metrics.overtimeMinutes,
                    policyId: metrics.policyId,
                    shiftId: metrics.shiftId,
                    source: existing.source || "BIOMETRIC",
                    notes: metrics.notes,
                },
            })
                .catch(() => { });
        }
        daysSynced++;
    }
    // 5. Auto-Absent & Sandwich Leave Auto-Sync across the historical range (up to yesterday)
    let absentDays = 0;
    let sandwichDays = 0;
    if (reconcileAbsentAndSandwich) {
        const workingDaysLower = (ctx.workingDays || "Mon,Tue,Wed,Thu,Fri").toLowerCase();
        const isNonWorkingDay = (d) => {
            const k = d.toISOString().slice(0, 10);
            if (holidayByDate.has(k)) {
                return { nonWorking: true, label: `Holiday (${holidayByDate.get(k)})` };
            }
            const r = rosterByDate.get(k);
            if (r?.status === "weekly_off")
                return { nonWorking: true, label: "Weekly Off" };
            if (r && r.status !== "weekly_off")
                return { nonWorking: false, label: "Working Day" };
            const dayName = DAY_NAMES[d.getUTCDay()];
            if (!workingDaysLower.includes(dayName)) {
                return { nonWorking: true, label: "Weekly Off" };
            }
            return { nonWorking: false, label: "Working Day" };
        };
        // Start from max(earliestPunchDate, joinedAt) and stop at yesterday (never mark today/future absent)
        let scanStart = new Date(earliestDateUtc);
        if (employee.joinedAt) {
            const joinUtc = new Date(Date.UTC(employee.joinedAt.getUTCFullYear(), employee.joinedAt.getUTCMonth(), employee.joinedAt.getUTCDate()));
            if (joinUtc > scanStart)
                scanStart = joinUtc;
        }
        const yesterdayUtc = new Date(todayLocal);
        yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1);
        const toCreate = [];
        // Pass 1: Working days with no punch -> absent (or on_leave if approved leave exists)
        const cur = new Date(scanStart);
        while (cur <= yesterdayUtc) {
            const key = cur.toISOString().slice(0, 10);
            if (!byDate.has(key)) {
                const existing = existingByDate.get(key);
                const leave = leaveByDate.get(key);
                const nw = isNonWorkingDay(cur);
                if (leave) {
                    computedStatusByDate.set(key, leave.fullDay ? "on_leave" : "half_day");
                    if (!existing) {
                        toCreate.push({
                            tenantId,
                            employeeId,
                            date: new Date(cur),
                            status: "on_leave",
                            hours: 0,
                            lateMinutes: 0,
                            earlyOutMinutes: 0,
                            overtimeMinutes: 0,
                            policyId: ctx.policyId,
                            shiftId: ctx.defaultShift.id,
                            source: "LEAVE_SYNC",
                            notes: `Approved Leave (${leave.name})`,
                        });
                    }
                }
                else if (!nw.nonWorking) {
                    // Missed working day with no punch and no approved leave -> absent
                    if (existing?.checkIn) {
                        computedStatusByDate.set(key, existing.status);
                    }
                    else {
                        computedStatusByDate.set(key, "absent");
                        if (!existing) {
                            toCreate.push({
                                tenantId,
                                employeeId,
                                date: new Date(cur),
                                status: "absent",
                                hours: 0,
                                lateMinutes: 0,
                                earlyOutMinutes: 0,
                                overtimeMinutes: 0,
                                policyId: ctx.policyId,
                                shiftId: ctx.defaultShift.id,
                                source: "BIOMETRIC_AUTO",
                                notes: "Auto-marked Absent (no biometric punch on working day)",
                            });
                            absentDays++;
                        }
                        else if (existing.status === "absent") {
                            absentDays++;
                        }
                    }
                }
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
        // Pass 2: Sandwich Leave Auto-Sync (non-working day bounded by full absent/leave on both adjacent working days)
        if (ctx.sandwichRuleEnabled) {
            const swCur = new Date(scanStart);
            while (swCur <= yesterdayUtc) {
                const key = swCur.toISOString().slice(0, 10);
                const nw = isNonWorkingDay(swCur);
                if (nw.nonWorking && !byDate.has(key)) {
                    // Find nearest previous working day
                    const prevDay = new Date(swCur);
                    let prevKey = null;
                    for (let i = 1; i <= 7; i++) {
                        prevDay.setUTCDate(prevDay.getUTCDate() - 1);
                        if (!isNonWorkingDay(prevDay).nonWorking) {
                            prevKey = prevDay.toISOString().slice(0, 10);
                            break;
                        }
                    }
                    // Find nearest next working day
                    const nextDay = new Date(swCur);
                    let nextKey = null;
                    for (let i = 1; i <= 7; i++) {
                        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                        if (!isNonWorkingDay(nextDay).nonWorking) {
                            nextKey = nextDay.toISOString().slice(0, 10);
                            break;
                        }
                    }
                    if (prevKey && nextKey) {
                        const prevStatus = computedStatusByDate.get(prevKey);
                        const nextStatus = computedStatusByDate.get(nextKey);
                        const prevOff = prevStatus === "absent" || prevStatus === "on_leave";
                        const nextOff = nextStatus === "absent" || nextStatus === "on_leave";
                        if (prevOff && nextOff) {
                            const existing = existingByDate.get(key);
                            const sandwichStatus = prevStatus === "on_leave" && nextStatus === "on_leave" ? "on_leave" : "absent";
                            const swNote = `Sandwich Rule Auto-Applied (${nw.label} between ${prevKey} [${prevStatus}] and ${nextKey} [${nextStatus}])`;
                            if (!existing) {
                                toCreate.push({
                                    tenantId,
                                    employeeId,
                                    date: new Date(swCur),
                                    status: sandwichStatus,
                                    hours: 0,
                                    lateMinutes: 0,
                                    earlyOutMinutes: 0,
                                    overtimeMinutes: 0,
                                    policyId: ctx.policyId,
                                    shiftId: ctx.defaultShift.id,
                                    source: "SANDWICH_AUTO",
                                    notes: swNote,
                                });
                                sandwichDays++;
                            }
                            else if (!existing.checkIn && existing.source === "SANDWICH_AUTO") {
                                sandwichDays++;
                            }
                        }
                    }
                }
                swCur.setUTCDate(swCur.getUTCDate() + 1);
            }
        }
        // Bulk insert auto-absent & sandwich records in batches of 500
        for (let i = 0; i < toCreate.length; i += 500) {
            await prisma_1.rawPrisma.attendance
                .createMany({
                data: toCreate.slice(i, i + 500),
                skipDuplicates: true,
            })
                .catch(() => { });
        }
    }
    return {
        logsLinked: logs.length,
        daysSynced,
        lateDays,
        absentDays,
        sandwichDays,
    };
}
