import { getTenantDb } from "../context/tenant-context";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";
import { EmployeeService, CreateEmployeeInput } from "./employee.service";

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchType?: "email" | "phone" | "both";
  existingCandidate?: any;
}

export interface InterviewConflictInput {
  tenantId: string;
  interviewId?: string;
  interviewerId?: string | null;
  candidateId: string;
  scheduledAt: Date | string;
  durationMinutes: number;
}

export class RecruitmentService {
  // =========================================================================
  // 1. DUPLICATE DETECTION (P5-BR-003)
  // =========================================================================
  static async checkCandidateDuplicate(
    tenantId: string,
    email?: string | null,
    phone?: string | null,
    excludeCandidateId?: string
  ): Promise<DuplicateCheckResult> {
    const db = getTenantDb();
    if (!email && !phone) return { hasDuplicate: false };

    const conditions: any[] = [];
    if (email && email.trim()) {
      conditions.push({ email: { equals: email.trim(), mode: "insensitive" } });
    }
    if (phone && phone.trim()) {
      conditions.push({ phone: { equals: phone.trim() } });
    }

    if (conditions.length === 0) return { hasDuplicate: false };

    const query: any = {
      tenantId,
      OR: conditions,
    };
    if (excludeCandidateId) {
      query.id = { not: excludeCandidateId };
    }

    const match = await db.jobCandidate.findFirst({
      where: query,
      include: {
        jobPosting: { select: { id: true, title: true } },
      },
    });

    if (!match) return { hasDuplicate: false };

    const emailMatches = email && match.email?.toLowerCase() === email.toLowerCase().trim();
    const phoneMatches = phone && match.phone === phone.trim();

    return {
      hasDuplicate: true,
      matchType: emailMatches && phoneMatches ? "both" : emailMatches ? "email" : "phone",
      existingCandidate: match,
    };
  }

  // =========================================================================
  // 2. INTERVIEW CONFLICT CHECKING (P5-BR-006)
  // =========================================================================
  static async checkInterviewConflict(input: InterviewConflictInput): Promise<{
    hasConflict: boolean;
    conflictReason?: string;
    conflictingInterview?: any;
  }> {
    const db = getTenantDb();
    const startTime = new Date(input.scheduledAt);
    const endTime = new Date(startTime.getTime() + (input.durationMinutes || 60) * 60000);

    // Find any scheduled interview that overlaps with [startTime, endTime]
    // where status is not CANCELLED
    const overlapWhere: any = {
      tenantId: input.tenantId,
      status: { notIn: ["cancelled", "CANCELLED"] },
      scheduledAt: {
        gte: new Date(startTime.getTime() - 4 * 3600000), // look within 4 hours window
        lte: endTime,
      },
    };

    if (input.interviewId) {
      overlapWhere.id = { not: input.interviewId };
    }

    const potentialOverlaps = await db.jobCandidateInterview.findMany({
      where: overlapWhere,
      include: {
        candidate: { select: { id: true, fullName: true } },
        interviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const interview of potentialOverlaps) {
      const otherStart = new Date(interview.scheduledAt);
      const otherEnd = new Date(otherStart.getTime() + (interview.durationMinutes || 60) * 60000);

      // Overlap condition: start < otherEnd AND otherStart < end
      const isOverlapping = startTime < otherEnd && otherStart < endTime;
      if (!isOverlapping) continue;

      // Check interviewer overlap
      if (input.interviewerId && interview.interviewerId === input.interviewerId) {
        return {
          hasConflict: true,
          conflictReason: `Interviewer has a conflicting interview with ${interview.candidate?.fullName || "another candidate"} from ${otherStart.toLocaleTimeString()} to ${otherEnd.toLocaleTimeString()}`,
          conflictingInterview: interview,
        };
      }

      // Check candidate overlap
      if (interview.candidateId === input.candidateId) {
        return {
          hasConflict: true,
          conflictReason: `Candidate already has an interview scheduled from ${otherStart.toLocaleTimeString()} to ${otherEnd.toLocaleTimeString()}`,
          conflictingInterview: interview,
        };
      }
    }

    return { hasConflict: false };
  }

  // =========================================================================
  // 3. JOB POSTING APPROVAL & HEADCOUNT RULES (P5-BR-001)
  // =========================================================================
  static async validateJobHeadcountAndBudget(tenantId: string, departmentId?: string | null, openings: number = 1) {
    const db = getTenantDb();
    if (!departmentId) return { allowed: true };

    const dept = await db.department.findUnique({
      where: { id: departmentId },
      include: {
        _count: { select: { employees: true } },
      },
    });

    return {
      allowed: true,
      currentDepartmentHeadcount: dept?._count?.employees || 0,
      requestedOpenings: openings,
    };
  }

  // =========================================================================
  // 4. CANDIDATE 360 AGGREGATION
  // =========================================================================
  static async getCandidate360(tenantId: string, candidateId: string) {
    const db = getTenantDb();
    const candidate = await db.jobCandidate.findFirst({
      where: { id: candidateId, tenantId },
      include: {
        jobPosting: {
          include: {
            department: true,
            designation: true,
            branch: true,
          },
        },
        interviews: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
            },
          },
          orderBy: { scheduledAt: "desc" },
        },
        assessments: {
          include: {
            template: true,
          },
          orderBy: { createdAt: "desc" },
        },
        offers: {
          include: {
            template: true,
          },
          orderBy: { createdAt: "desc" },
        },
        onboarding: {
          include: {
            template: true,
            tasks: {
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found.");
    }

    return candidate;
  }

  // =========================================================================
  // 5. STAGE TRANSITION ENGINE (P5-BR-004)
  // =========================================================================
  static async transitionCandidateStage(
    tenantId: string,
    actorId: string,
    candidateId: string,
    newStage: string,
    reason?: string | null,
    notes?: string | null
  ) {
    const db = getTenantDb();
    const candidate = await db.jobCandidate.findFirst({
      where: { id: candidateId, tenantId },
    });
    if (!candidate) throw new Error("Candidate not found.");

    const normalizedStage = newStage.toLowerCase().trim();
    const oldStage = candidate.stage;

    // Validate rejection requires reason
    if (normalizedStage === "rejected" && (!reason || !reason.trim())) {
      throw new Error("Rejection reason is mandatory when rejecting a candidate.");
    }

    const updated = await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        stage: normalizedStage,
        rejectionReason: normalizedStage === "rejected" ? reason : undefined,
        interviewerNotes: notes || candidate.interviewerNotes,
      },
      include: {
        jobPosting: true,
      },
    });

    // Record Audit & Outbox
    await AuditService.logMutation({
      tenantId,
      actorId,
      action: "CANDIDATE_STAGE_CHANGED",
      entityType: "JobCandidate",
      entityId: candidateId,
      metadata: {
        candidateName: candidate.fullName,
        fromStage: oldStage,
        toStage: normalizedStage,
        reason: reason || null,
        notes: notes || null,
      },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "CANDIDATE_STAGE_CHANGED",
      entityType: "JobCandidate",
      entityId: candidateId,
      actorId,
      payload: {
        candidateId,
        candidateName: candidate.fullName,
        fromStage: oldStage,
        toStage: normalizedStage,
        jobPostingId: candidate.jobPostingId,
        actorId,
      },
    });

    return updated;
  }

  // =========================================================================
  // 6. AUTO-GRADING ASSESSMENTS (P5-BR-005)
  // =========================================================================
  static calculateAssessmentScore(questions: any[], candidateAnswers: Record<string, any>) {
    let totalMaxScore = 0;
    let earnedScore = 0;

    for (const q of questions) {
      const maxPoints = Number(q.points || 1);
      totalMaxScore += maxPoints;

      const givenAnswer = candidateAnswers[q.id];
      if (givenAnswer !== undefined && givenAnswer !== null) {
        if (q.type === "multiple_choice" || q.type === "single_choice" || q.type === "boolean") {
          if (String(givenAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
            earnedScore += maxPoints;
          }
        } else if (q.type === "number") {
          if (Number(givenAnswer) === Number(q.correctAnswer)) {
            earnedScore += maxPoints;
          }
        }
      }
    }

    const percentage = totalMaxScore > 0 ? Math.round((earnedScore / totalMaxScore) * 100) : 0;
    return {
      earnedScore,
      totalMaxScore,
      percentage,
    };
  }

  // =========================================================================
  // 7. OFFER LIFECYCLE & AUTOMATIC ONBOARDING CREATION
  // =========================================================================
  static async acceptOfferAndInitOnboarding(
    tenantId: string,
    actorId: string,
    offerId: string
  ) {
    const db = getTenantDb();
    const offer = await db.candidateOffer.findFirst({
      where: { id: offerId, tenantId },
      include: {
        candidate: true,
        jobPosting: true,
      },
    });

    if (!offer) throw new Error("Offer not found.");
    if (offer.status === "accepted") {
      throw new Error("Offer has already been accepted.");
    }

    return await db.$transaction(async (tx: any) => {
      // 1. Update Offer status
      const updatedOffer = await tx.candidateOffer.update({
        where: { id: offerId },
        data: {
          status: "accepted",
          respondedAt: new Date(),
        },
      });

      // 2. Update Candidate stage
      await tx.jobCandidate.update({
        where: { id: offer.candidateId },
        data: { stage: "offered" },
      });

      // 3. Find default onboarding checklist template if available
      const defaultTemplate = await tx.onboardingChecklistTemplate.findFirst({
        where: { tenantId, isActive: true },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sequence: "asc" },
          },
        },
      });

      // 4. Create Onboarding record
      const onboarding = await tx.candidateOnboarding.create({
        data: {
          tenantId,
          candidateId: offer.candidateId,
          offerId: offer.id,
          templateId: defaultTemplate?.id || null,
          joiningDate: offer.joiningDate || new Date(Date.now() + 14 * 86400000),
          status: "pending",
        },
      });

      // 5. Seed tasks from template if found, or default items
      if (defaultTemplate && defaultTemplate.items.length > 0) {
        for (let i = 0; i < defaultTemplate.items.length; i++) {
          const item = defaultTemplate.items[i];
          await tx.candidateOnboardingTask.create({
            data: {
              tenantId,
              onboardingId: onboarding.id,
              title: item.title,
              description: item.description || null,
              category: "general",
              dueOffsetDays: item.dueOffsetDays || 3,
              isMandatory: item.isMandatory !== false,
              sequence: item.sequence || i + 1,
              status: "pending",
            },
          });
        }
      } else {
        // Fallback standard checklist items
        const defaultTasks = [
          { title: "Submit Identity & Address Proof (Aadhaar / Passport)", role: "candidate", offset: 2 },
          { title: "Submit Educational Certificates & Marksheets", role: "candidate", offset: 3 },
          { title: "Submit Relieving Letter & Previous Payslips", role: "candidate", offset: 5 },
          { title: "Background Verification Check (BGV)", role: "hr", offset: 7 },
          { title: "Bank Account Details & Cancelled Cheque", role: "candidate", offset: 7 },
          { title: "IT Hardware & Email Provisioning", role: "it", offset: 10 },
          { title: "Assign Team Buddy & Desk Allocation", role: "manager", offset: 12 },
        ];

        for (let i = 0; i < defaultTasks.length; i++) {
          const dt = defaultTasks[i];
          await tx.candidateOnboardingTask.create({
            data: {
              tenantId,
              onboardingId: onboarding.id,
              title: dt.title,
              category: "document",
              dueOffsetDays: dt.offset,
              isMandatory: true,
              sequence: i + 1,
              status: "pending",
            },
          });
        }
      }

      return {
        offer: updatedOffer,
        onboarding,
      };
    });
  }

  // =========================================================================
  // 8. AUTHORITATIVE CANDIDATE → EMPLOYEE CONVERSION (P5-BR-010)
  // Reuses P2 EmployeeService.createEmployeeAtomic - ZERO duplicate creation engine!
  // =========================================================================
  static async convertCandidateToEmployee(
    tenantId: string,
    actorId: string,
    candidateId: string,
    overrides?: {
      employeeCode?: string;
      departmentId?: string;
      designationId?: string;
      branchId?: string;
      joinedAt?: Date | string;
      salary?: number | string;
      taxRegime?: "old" | "new";
      createLoginAccount?: boolean;
    }
  ) {
    const db = getTenantDb();
    const candidate = await db.jobCandidate.findFirst({
      where: { id: candidateId, tenantId },
      include: {
        jobPosting: {
          include: {
            department: true,
            designation: true,
            branch: true,
          },
        },
        offers: {
          where: { status: "accepted" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        onboarding: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found.");
    }

    if (candidate.isConvertedToEmployee && candidate.convertedEmployeeId) {
      throw new Error(`Candidate '${candidate.fullName}' has already been converted to employee.`);
    }

    // Split name safely
    const nameParts = candidate.fullName.trim().split(" ");
    const firstName = nameParts[0] || "Candidate";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Employee";

    // Auto-generate unique Employee Code if not provided
    let employeeCode = overrides?.employeeCode?.trim();
    if (!employeeCode) {
      const empCount = await db.employee.count({ where: { tenantId } });
      employeeCode = `EMP-${String(empCount + 1).padStart(4, "0")}`;
    }

    const latestOffer = candidate.offers?.[0];
    const latestOnboarding = candidate.onboarding;

    const targetDepartmentId = overrides?.departmentId || candidate.jobPosting?.departmentId || null;
    const targetDesignationId = overrides?.designationId || candidate.jobPosting?.designationId || null;
    const targetBranchId = overrides?.branchId || candidate.jobPosting?.branchId || null;
    const targetSalary = overrides?.salary ?? (latestOffer?.annualCtc ? Number(latestOffer.annualCtc) : (candidate.expectedSalary ? Number(candidate.expectedSalary) : 500000));
    const targetJoinedAt = overrides?.joinedAt || latestOnboarding?.joiningDate || latestOffer?.joiningDate || new Date();

    const createInput: CreateEmployeeInput = {
      firstName,
      lastName,
      email: candidate.email.toLowerCase().trim(),
      phone: candidate.phone || null,
      employeeCode,
      departmentId: targetDepartmentId,
      designationId: targetDesignationId,
      branchId: targetBranchId,
      position: candidate.jobPosting?.title || "Team Member",
      salary: targetSalary,
      joinedAt: targetJoinedAt,
      taxRegime: overrides?.taxRegime || "new",
      createLoginAccount: overrides?.createLoginAccount !== false,
      documents: candidate.resumeUrl
        ? [
            {
              title: "Candidate Resume",
              mediaUrl: candidate.resumeUrl,
              documentType: "resume",
            },
          ]
        : [],
    };

    // 1. Call authoritative P2 Employee Service
    const createdEmployee = await EmployeeService.createEmployeeAtomic(
      tenantId,
      actorId,
      createInput
    );

    // 2. Transactionally update Candidate and Onboarding records
    await db.$transaction(async (tx: any) => {
      await tx.jobCandidate.update({
        where: { id: candidateId },
        data: {
          isConvertedToEmployee: true,
          convertedEmployeeId: createdEmployee.id,
          stage: "hired",
        },
      });

      if (latestOnboarding) {
        await tx.candidateOnboarding.update({
          where: { id: latestOnboarding.id },
          data: {
            status: "joined",
          },
        });
      }
    });

    // 3. Log Audit & Outbox Events
    await AuditService.logMutation({
      tenantId,
      actorId,
      action: "CANDIDATE_CONVERTED_TO_EMPLOYEE",
      entityType: "JobCandidate",
      entityId: candidateId,
      metadata: {
        candidateId,
        candidateName: candidate.fullName,
        employeeId: createdEmployee.id,
        employeeCode: createdEmployee.employeeCode,
      },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "CANDIDATE_CONVERTED",
      entityType: "JobCandidate",
      entityId: candidateId,
      actorId,
      payload: {
        candidateId,
        candidateName: candidate.fullName,
        employeeId: createdEmployee.id,
        employeeCode: createdEmployee.employeeCode,
      },
    });

    return {
      success: true,
      candidateId,
      employee: createdEmployee,
    };
  }

  // =========================================================================
  // 9. FUNNEL STATISTICS
  // =========================================================================
  static async getRecruitmentFunnelStats(tenantId: string, jobPostingId?: string) {
    const db = getTenantDb();
    const where: any = { tenantId };
    if (jobPostingId && jobPostingId !== "all") {
      where.jobPostingId = jobPostingId;
    }

    const [
      totalCandidates,
      appliedCount,
      screeningCount,
      interviewCount,
      offeredCount,
      hiredCount,
      rejectedCount,
    ] = await Promise.all([
      db.jobCandidate.count({ where }),
      db.jobCandidate.count({ where: { ...where, stage: { in: ["applied", "new"] } } }),
      db.jobCandidate.count({ where: { ...where, stage: "screening" } }),
      db.jobCandidate.count({ where: { ...where, stage: "interview" } }),
      db.jobCandidate.count({ where: { ...where, stage: { in: ["offered", "offer"] } } }),
      db.jobCandidate.count({ where: { ...where, stage: "hired" } }),
      db.jobCandidate.count({ where: { ...where, stage: "rejected" } }),
    ]);

    return {
      totalCandidates,
      stages: {
        new: appliedCount,
        screening: screeningCount,
        interview: interviewCount,
        offer: offeredCount,
        hired: hiredCount,
        rejected: rejectedCount,
      },
      conversionRate: totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0,
    };
  }
}
