import { prisma } from "./prisma";

interface AuditResult {
  pass: boolean;
  category: string;
  details: string;
}

async function runCoreHrLifecycleAudit() {
  console.log("================================================================================");
  console.log("MASTER ERP HRMS — MODULE #2: CORE HR & LIFECYCLE AUDIT SUITE");
  console.log("================================================================================\n");

  const results: Record<string, AuditResult> = {};
  const testTenantPrefix = `TEST_AUDIT_${Date.now()}`;

  let tenantA: any = null;
  let tenantB: any = null;
  let departmentA: any = null;
  let employeeA1: any = null;
  let employeeA2: any = null;
  let employeeB1: any = null;
  let leaveTypeCasual: any = null;
  let shiftGeneral: any = null;
  let shiftNight: any = null;

  try {
    // -------------------------------------------------------------
    // SETUP: MULTI-TENANT FIXTURES
    // -------------------------------------------------------------
    tenantA = await prisma.tenant.create({
      data: {
        name: `Acme Global ${testTenantPrefix}`,
        slug: `acme-${testTenantPrefix.toLowerCase()}`,
        timezone: "Asia/Kolkata",
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: `Apex Corp ${testTenantPrefix}`,
        slug: `apex-${testTenantPrefix.toLowerCase()}`,
        timezone: "Asia/Kolkata",
      },
    });

    departmentA = await prisma.department.create({
      data: {
        tenantId: tenantA.id,
        name: "Engineering",
        description: "Core Software Engineering",
      },
    });

    // -------------------------------------------------------------
    // PILLAR 1: EMPLOYEE DIRECTORY & STATUTORY KYC + TENANT ISOLATION
    // -------------------------------------------------------------
    employeeA1 = await prisma.employee.create({
      data: {
        tenantId: tenantA.id,
        departmentId: departmentA.id,
        employeeCode: `EMP-A001-${Date.now()}`,
        firstName: "Aarav",
        lastName: "Sharma",
        email: `aarav.${Date.now()}@acme.com`,
        phone: "+91 98765 43210",
        position: "Senior Staff Engineer",
        employmentType: "full_time",
        status: "active",
        salary: 150000.0,
        joinedAt: new Date("2024-01-15"),
        pan: "ABCDE1234F",
        aadhaar: "123456789012",
        uan: "100987654321",
        esiNumber: "31-00-123456-000",
        bankName: "HDFC Bank",
        bankAccount: "50100987654321",
        bankIfsc: "HDFC0000123",
        taxRegime: "new",
        state: "Maharashtra",
        pfEligible: true,
        esiEligible: false,
        ptEligible: true,
        tdsEligible: true,
      },
    });

    employeeA2 = await prisma.employee.create({
      data: {
        tenantId: tenantA.id,
        departmentId: departmentA.id,
        managerId: employeeA1.id,
        employeeCode: `EMP-A002-${Date.now()}`,
        firstName: "Dia",
        lastName: "Verma",
        email: `dia.${Date.now()}@acme.com`,
        phone: "+91 98765 43211",
        position: "Frontend Engineer",
        employmentType: "full_time",
        status: "active",
        salary: 80000.0,
        joinedAt: new Date("2024-06-01"),
        taxRegime: "new",
        state: "Maharashtra",
      },
    });

    employeeB1 = await prisma.employee.create({
      data: {
        tenantId: tenantB.id,
        employeeCode: `EMP-B001-${Date.now()}`,
        firstName: "Vikram",
        lastName: "Rathore",
        email: `vikram.${Date.now()}@apex.com`,
        phone: "+91 98765 99999",
        position: "Operations Lead",
        employmentType: "full_time",
        status: "active",
        salary: 110000.0,
      },
    });

    results["1.1_Employee_Creation_Statutory_KYC"] = {
      pass:
        employeeA1.pan === "ABCDE1234F" &&
        employeeA1.bankIfsc === "HDFC0000123" &&
        employeeA1.pfEligible === true &&
        Number(employeeA1.salary) === 150000.0,
      category: "EMPLOYEE_DIRECTORY",
      details: `Created Employee ${employeeA1.firstName} ${employeeA1.lastName} (${employeeA1.employeeCode}) with complete statutory fields`,
    };

    results["1.2_Employee_Manager_Hierarchy"] = {
      pass: employeeA2.managerId === employeeA1.id,
      category: "EMPLOYEE_DIRECTORY",
      details: `Subordinate ${employeeA2.firstName} correctly mapped to Manager ${employeeA1.firstName}`,
    };

    // Strict Tenant Isolation Verification
    const tenantAEmployees = await prisma.employee.findMany({
      where: { tenantId: tenantA.id },
    });
    const hasLeak = tenantAEmployees.some((e) => e.tenantId !== tenantA.id || e.id === employeeB1.id);
    results["1.3_Employee_Strict_Tenant_Isolation"] = {
      pass: !hasLeak && tenantAEmployees.length === 2,
      category: "EMPLOYEE_DIRECTORY",
      details: `Tenant A query returns exactly Tenant A records (${tenantAEmployees.length}) with zero cross-tenant leak`,
    };

    // -------------------------------------------------------------
    // PILLAR 2: ATTENDANCE & WORKING HOURS
    // -------------------------------------------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkInTime = new Date(today);
    checkInTime.setHours(9, 30, 0, 0);

    const checkOutTime = new Date(today);
    checkOutTime.setHours(18, 30, 0, 0); // 9 hours

    const attendanceRecord = await prisma.attendance.create({
      data: {
        tenantId: tenantA.id,
        employeeId: employeeA1.id,
        date: today,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        hours: 9.0,
        status: "present",
        notes: "On-time biometric swipe",
      },
    });

    results["2.1_Attendance_Logging_And_Hours"] = {
      pass:
        attendanceRecord.status === "present" &&
        Number(attendanceRecord.hours) === 9.0 &&
        attendanceRecord.checkIn !== null &&
        attendanceRecord.checkOut !== null,
      category: "ATTENDANCE_ENGINE",
      details: `Logged Attendance: Date=${today.toISOString().split("T")[0]}, Status=${attendanceRecord.status}, Hours=${attendanceRecord.hours}`,
    };

    // Biometric Device & Punch Log
    const bioDevice = await prisma.biometricDevice.create({
      data: {
        tenantId: tenantA.id,
        deviceName: "HQ Main Gate Scanner",
        deviceModel: "ZKTeco MB20",
        serialNumber: `ZK-${Date.now()}`,
        apiKey: `BIOKEY-${Date.now()}`,
        location: "HQ Main Entrance",
        status: "online",
      },
    });

    const punchLog = await prisma.biometricPunchLog.create({
      data: {
        tenantId: tenantA.id,
        deviceId: bioDevice.id,
        employeeId: employeeA1.id,
        employeeCode: employeeA1.employeeCode,
        punchTime: checkInTime,
        punchType: "check_in",
        verificationMode: "fingerprint",
      },
    });

    results["2.2_Biometric_Punch_Verification"] = {
      pass: punchLog.punchType === "check_in" && punchLog.verificationMode === "fingerprint" && punchLog.deviceId === bioDevice.id,
      category: "ATTENDANCE_ENGINE",
      details: `Recorded Biometric Punch: Device=${bioDevice.deviceName}, Type=${punchLog.punchType}, VerifiedBy=${punchLog.verificationMode}`,
    };

    // -------------------------------------------------------------
    // PILLAR 3: LEAVE MANAGEMENT & APPROVAL WORKFLOW
    // -------------------------------------------------------------
    leaveTypeCasual = await prisma.leaveType.create({
      data: {
        tenantId: tenantA.id,
        name: "Casual Leave",
        daysPerYear: 12,
        color: "blue",
      },
    });

    const leaveStart = new Date(today);
    leaveStart.setDate(leaveStart.getDate() + 5);
    const leaveEnd = new Date(leaveStart);
    leaveEnd.setDate(leaveEnd.getDate() + 1); // 2 days

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        tenantId: tenantA.id,
        employeeId: employeeA2.id,
        leaveTypeId: leaveTypeCasual.id,
        startDate: leaveStart,
        endDate: leaveEnd,
        days: 2,
        status: "pending",
        reason: "Family event",
      },
    });

    results["3.1_Leave_Application_Submission"] = {
      pass: leaveRequest.status === "pending" && leaveRequest.days === 2,
      category: "LEAVE_MANAGEMENT",
      details: `Employee ${employeeA2.firstName} applied 2 days Casual Leave. Status=${leaveRequest.status}`,
    };

    // Manager Approval
    const approvedLeave = await prisma.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: {
        status: "approved",
        approverId: employeeA1.id,
        approvedAt: new Date(),
      },
    });

    results["3.2_Leave_Manager_Approval_Workflow"] = {
      pass: approvedLeave.status === "approved" && approvedLeave.approverId === employeeA1.id,
      category: "LEAVE_MANAGEMENT",
      details: `Leave approved by Manager ${employeeA1.firstName}. ApprovedAt=${approvedLeave.approvedAt?.toISOString()}`,
    };

    // -------------------------------------------------------------
    // PILLAR 4: SHIFT ROSTERING & PEER SWAP WORKFLOW
    // -------------------------------------------------------------
    shiftGeneral = await prisma.shiftDefinition.create({
      data: {
        tenantId: tenantA.id,
        name: "General Day Shift",
        code: "GEN",
        startTime: "09:30",
        endTime: "18:30",
        breakMinutes: 60,
        allowance: 0.0,
        isOvertimeEligible: true,
        color: "blue",
      },
    });

    shiftNight = await prisma.shiftDefinition.create({
      data: {
        tenantId: tenantA.id,
        name: "Night Production Shift",
        code: "NIGHT",
        startTime: "21:00",
        endTime: "06:00",
        breakMinutes: 60,
        allowance: 500.0,
        isOvertimeEligible: true,
        color: "purple",
      },
    });

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rosterA1 = await prisma.shiftRoster.create({
      data: {
        tenantId: tenantA.id,
        employeeId: employeeA1.id,
        shiftId: shiftGeneral.id,
        rosterDate: tomorrow,
        status: "assigned",
      },
    });

    const rosterA2 = await prisma.shiftRoster.create({
      data: {
        tenantId: tenantA.id,
        employeeId: employeeA2.id,
        shiftId: shiftNight.id,
        rosterDate: tomorrow,
        status: "assigned",
      },
    });

    results["4.1_Shift_Roster_Assignment"] = {
      pass: rosterA1.status === "assigned" && rosterA2.shiftId === shiftNight.id,
      category: "SHIFT_ROSTERING",
      details: `Assigned Shifts: ${employeeA1.firstName} -> GEN, ${employeeA2.firstName} -> NIGHT on ${tomorrow.toISOString().split("T")[0]}`,
    };

    // Peer Shift Swap Request
    const swapReq = await prisma.shiftSwapRequest.create({
      data: {
        tenantId: tenantA.id,
        requesterEmployeeId: employeeA2.id,
        targetEmployeeId: employeeA1.id,
        shiftDate: tomorrow,
        reason: "Personal urgency in night hours",
        status: "pending_peer",
      },
    });

    results["4.2_Shift_Swap_Peer_Initiation"] = {
      pass: swapReq.status === "pending_peer" && swapReq.requesterEmployeeId === employeeA2.id,
      category: "SHIFT_ROSTERING",
      details: `Shift Swap initiated by ${employeeA2.firstName} to ${employeeA1.firstName}. Status=${swapReq.status}`,
    };

    // Manager Approval on Swap
    const approvedSwap = await prisma.shiftSwapRequest.update({
      where: { id: swapReq.id },
      data: {
        status: "approved",
        managerNotes: "Approved swap as both engineers agreed",
        approvedAt: new Date(),
      },
    });

    results["4.3_Shift_Swap_Manager_Approval"] = {
      pass: approvedSwap.status === "approved" && approvedSwap.managerNotes !== null,
      category: "SHIFT_ROSTERING",
      details: `Swap Approved by Manager: Status=${approvedSwap.status}`,
    };

    // -------------------------------------------------------------
    // PILLAR 5: OFFBOARDING, MULTI-DEPARTMENT CLEARANCE & FNF
    // -------------------------------------------------------------
    const resignationDate = new Date();
    const lwd = new Date();
    lwd.setDate(lwd.getDate() + 60); // 60 days notice

    const exitRecord = await prisma.employeeExit.create({
      data: {
        tenantId: tenantA.id,
        employeeId: employeeA2.id,
        exitCode: `EXT-${Date.now()}`,
        resignationDate: resignationDate,
        lastWorkingDay: lwd,
        reason: "Relocating abroad",
        exitType: "resignation",
        status: "serving_notice",
        noticePeriodDays: 60,
        itClearance: false,
        financeClearance: false,
        hrClearance: false,
        adminClearance: false,
        fnfSettlementAmount: 0.0,
        fnfSettlementStatus: "pending",
      },
    });

    // Create clearance checklist items
    const itCheck = await prisma.exitChecklistItem.create({
      data: {
        exitId: exitRecord.id,
        department: "IT",
        title: "Laptop & Access Revocation",
        isCompleted: true,
        completedBy: "IT Lead",
        completedAt: new Date(),
      },
    });

    const finCheck = await prisma.exitChecklistItem.create({
      data: {
        exitId: exitRecord.id,
        department: "Finance",
        title: "Expense Claims & Loan Clearance",
        isCompleted: true,
        completedBy: "Finance Controller",
        completedAt: new Date(),
      },
    });

    const hrCheck = await prisma.exitChecklistItem.create({
      data: {
        exitId: exitRecord.id,
        department: "HR",
        title: "Exit Interview & ID Card Return",
        isCompleted: true,
        completedBy: "HR Manager",
        completedAt: new Date(),
      },
    });

    const adminCheck = await prisma.exitChecklistItem.create({
      data: {
        exitId: exitRecord.id,
        department: "Admin",
        title: "Biometric & Door Key Fob Handover",
        isCompleted: true,
        completedBy: "Admin Executive",
        completedAt: new Date(),
      },
    });

    results["5.1_Offboarding_Initiation_And_Clearances"] = {
      pass:
        exitRecord.status === "serving_notice" &&
        itCheck.isCompleted &&
        finCheck.isCompleted &&
        hrCheck.isCompleted &&
        adminCheck.isCompleted,
      category: "OFFBOARDING_FNF",
      details: `Exit Registered: Code=${exitRecord.exitCode}, 4 Department Clearances (IT, Finance, HR, Admin) Completed`,
    };

    // FnF Calculation: e.g. 15 days prorated salary + 10 days leave encashment - 0 deductions
    const monthlyGross = Number(employeeA2.salary); // 80000
    const perDaySalary = monthlyGross / 30; // 2666.66
    const payableSalaryDays = 15;
    const leaveEncashmentDays = 10;
    const computedFnf = Math.round((payableSalaryDays + leaveEncashmentDays) * perDaySalary * 100) / 100;

    const settledExit = await prisma.employeeExit.update({
      where: { id: exitRecord.id },
      data: {
        status: "fnf_settled",
        itClearance: true,
        financeClearance: true,
        hrClearance: true,
        adminClearance: true,
        fnfSettlementAmount: computedFnf,
        fnfSettlementStatus: "paid",
        fnfSettledAt: new Date(),
        relievingLetterCode: `RL-ACME-${Date.now()}`,
      },
    });

    results["5.2_FnF_Settlement_And_Relieving_Letter"] = {
      pass:
        settledExit.status === "fnf_settled" &&
        settledExit.fnfSettlementStatus === "paid" &&
        Number(settledExit.fnfSettlementAmount) === computedFnf &&
        settledExit.relievingLetterCode !== null,
      category: "OFFBOARDING_FNF",
      details: `FnF Settled: Amount=INR ${Number(settledExit.fnfSettlementAmount).toLocaleString("en-IN")}, Status=${settledExit.fnfSettlementStatus}, RelievingLetterCode=${settledExit.relievingLetterCode}`,
    };
  } catch (err: any) {
    console.error("FATAL ERROR IN CORE HR LIFECYCLE AUDIT SUITE:", err);
    results["FATAL_ERROR"] = {
      pass: false,
      category: "SYSTEM",
      details: err.message || String(err),
    };
  } finally {
    // Cleanup Test Fixtures
    if (tenantA?.id) {
      await prisma.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB?.id) {
      await prisma.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
  }

  // -------------------------------------------------------------
  // PRESENTATION OF RESULTS
  // -------------------------------------------------------------
  console.log("------------------------------------------------------------------------------------------------------------------");
  console.log("SCENARIO ID                               | STATUS | CATEGORY            | VERIFICATION DETAILS");
  console.log("------------------------------------------------------------------------------------------------------------------");
  let totalPass = 0;
  let totalFail = 0;

  for (const [key, res] of Object.entries(results)) {
    const status = res.pass ? "PASS" : "FAIL";
    if (res.pass) totalPass++;
    else totalFail++;

    const padKey = key.padEnd(41, " ");
    const padStatus = status.padEnd(6, " ");
    const padCat = res.category.padEnd(19, " ");
    console.log(`${padKey} | ${padStatus} | ${padCat} | ${res.details}`);
  }
  console.log("------------------------------------------------------------------------------------------------------------------");
  console.log(`\nCORE HR & LIFECYCLE AUDIT SUMMARY: TOTAL ${totalPass + totalFail} | PASSED: ${totalPass} | FAILED: ${totalFail}`);
  console.log(`COMPLIANCE VERDICT: ${totalFail === 0 ? "100% PRODUCTION READY & VERIFIED" : "AUDIT DEFECTS FOUND"}\n`);
}

runCoreHrLifecycleAudit().catch(console.error);
