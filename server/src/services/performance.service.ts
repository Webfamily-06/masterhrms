import { getTenantDb } from "../context/tenant-context";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";

export class PerformanceService {
  /**
   * 1. REVIEW CYCLES (P6-BR-015)
   */
  static async createCycle(
    tenantId: string,
    actorId: string,
    params: {
      name: string;
      periodType?: string;
      startDate: string | Date;
      endDate: string | Date;
    }
  ) {
    const db = getTenantDb();
    const cycle = await db.okrCycle.create({
      data: {
        tenantId,
        name: params.name,
        periodType: params.periodType || "quarterly",
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate),
        status: "active",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PERFORMANCE_CYCLE_CREATED",
      entityType: "OkrCycle",
      entityId: cycle.id,
      metadata: { name: cycle.name, periodType: cycle.periodType },
    });

    return cycle;
  }

  static async listCycles(tenantId: string) {
    const db = getTenantDb();
    return await db.okrCycle.findMany({
      where: { tenantId },
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { objectives: true, reviews: true },
        },
      },
    });
  }

  static async updateCycleStatus(tenantId: string, actorId: string, cycleId: string, status: string) {
    const db = getTenantDb();
    const cycle = await db.okrCycle.update({
      where: { id: cycleId },
      data: { status },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PERFORMANCE_CYCLE_STATUS_UPDATED",
      entityType: "OkrCycle",
      entityId: cycle.id,
      metadata: { status },
    });

    return cycle;
  }

  /**
   * 2. GOALS & OBJECTIVES (P6-BR-016)
   */
  static async createObjective(
    tenantId: string,
    actorId: string,
    params: {
      cycleId: string;
      ownerId: string;
      title: string;
      description?: string;
      category?: string;
      alignmentType?: string;
      parentId?: string;
      departmentId?: string;
      keyResults?: Array<{
        title: string;
        measurementType?: string;
        startValue?: number;
        targetValue?: number;
        weight?: number;
      }>;
    }
  ) {
    const db = getTenantDb();

    const objective = await db.okrObjective.create({
      data: {
        tenantId,
        cycleId: params.cycleId,
        ownerId: params.ownerId,
        title: params.title,
        description: params.description || null,
        category: params.category || "Strategy",
        alignmentType: params.alignmentType || "individual",
        parentId: params.parentId || null,
        departmentId: params.departmentId || null,
        progress: 0,
        status: "not_started",
        keyResults: params.keyResults && params.keyResults.length > 0 ? {
          create: params.keyResults.map((kr) => ({
            title: kr.title,
            measurementType: kr.measurementType || "percentage",
            startValue: kr.startValue || 0,
            targetValue: kr.targetValue || 100,
            currentValue: kr.startValue || 0,
            weight: kr.weight || 1.0,
            status: "in_progress",
          })),
        } : undefined,
      },
      include: {
        keyResults: true,
      },
    });

    return objective;
  }

  static async checkinKeyResult(
    tenantId: string,
    employeeId: string,
    params: {
      keyResultId: string;
      progressValue: number;
      confidenceScore?: number;
      notes?: string;
      blockers?: string;
    }
  ) {
    const db = getTenantDb();

    const kr = await db.okrKeyResult.findUnique({
      where: { id: params.keyResultId },
      include: { objective: true },
    });

    if (!kr || kr.objective.tenantId !== tenantId) {
      throw new Error("Key result not found.");
    }

    // 1. Record check-in
    const checkin = await db.okrCheckin.create({
      data: {
        keyResultId: kr.id,
        employeeId,
        progressValue: params.progressValue,
        confidenceScore: params.confidenceScore || 8,
        notes: params.notes || null,
        blockers: params.blockers || null,
      },
    });

    // 2. Update Key Result current value
    const updatedKr = await db.okrKeyResult.update({
      where: { id: kr.id },
      data: {
        currentValue: params.progressValue,
        status: params.progressValue >= Number(kr.targetValue) ? "achieved" : "in_progress",
      },
    });

    // 3. Roll up objective progress
    const allKrs = await db.okrKeyResult.findMany({
      where: { objectiveId: kr.objectiveId },
    });

    let totalWeight = 0;
    let weightedProgress = 0;

    for (const item of allKrs) {
      const weight = Number(item.weight) || 1;
      const target = Number(item.targetValue) || 100;
      const current = Number(item.currentValue) || 0;
      const start = Number(item.startValue) || 0;

      const pct = target > start ? Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100)) : 0;
      weightedProgress += pct * weight;
      totalWeight += weight;
    }

    const avgProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

    await db.okrObjective.update({
      where: { id: kr.objectiveId },
      data: {
        progress: avgProgress,
        status: avgProgress >= 100 ? "achieved" : avgProgress > 0 ? "in_progress" : "not_started",
      },
    });

    return { checkin, updatedKr, objectiveProgress: avgProgress };
  }

  /**
   * 3. INDICATORS & COMPETENCIES (P6-BR-017)
   */
  static async createIndicator(
    tenantId: string,
    params: {
      categoryId: string;
      name: string;
      code: string;
      description?: string;
      weight?: number;
      level1Desc?: string;
      level2Desc?: string;
      level3Desc?: string;
      level4Desc?: string;
      level5Desc?: string;
      applicableDepartmentId?: string;
      applicableDesignationId?: string;
    }
  ) {
    const db = getTenantDb();
    return await db.performanceIndicator.create({
      data: {
        tenantId,
        categoryId: params.categoryId,
        name: params.name,
        code: params.code.toUpperCase(),
        description: params.description || null,
        weight: params.weight || 20.0,
        level1Desc: params.level1Desc || null,
        level2Desc: params.level2Desc || null,
        level3Desc: params.level3Desc || null,
        level4Desc: params.level4Desc || null,
        level5Desc: params.level5Desc || null,
        applicableDepartmentId: params.applicableDepartmentId || null,
        applicableDesignationId: params.applicableDesignationId || null,
      },
    });
  }

  static async listIndicators(tenantId: string) {
    const db = getTenantDb();
    return await db.performanceIndicator.findMany({
      where: { tenantId, isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * 4. APPRAISAL REVIEWS & RATING ENGINE (P6-BR-017)
   */
  static async submitReview(
    tenantId: string,
    actorId: string,
    params: {
      cycleId: string;
      employeeId: string;
      reviewerId: string;
      reviewType: "self" | "manager" | "peer_360";
      ratingScore?: number;
      feedbackText?: string;
      indicatorRatings?: Array<{
        indicatorId: string;
        rating: number;
        comments?: string;
      }>;
    }
  ) {
    const db = getTenantDb();

    // Calculate rating score if indicator ratings provided
    let finalScore = params.ratingScore;
    if (params.indicatorRatings && params.indicatorRatings.length > 0) {
      const sum = params.indicatorRatings.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      finalScore = Number((sum / params.indicatorRatings.length).toFixed(1));
    }

    // Upsert review record
    let review = await db.okrReview.findFirst({
      where: {
        cycleId: params.cycleId,
        employeeId: params.employeeId,
        reviewerId: params.reviewerId,
        reviewType: params.reviewType,
      },
    });

    if (review) {
      review = await db.okrReview.update({
        where: { id: review.id },
        data: {
          ratingScore: finalScore !== undefined ? finalScore : review.ratingScore,
          feedbackText: params.feedbackText || review.feedbackText,
          status: "submitted",
        },
      });
    } else {
      review = await db.okrReview.create({
        data: {
          cycleId: params.cycleId,
          employeeId: params.employeeId,
          reviewerId: params.reviewerId,
          reviewType: params.reviewType,
          ratingScore: finalScore || 3.0,
          feedbackText: params.feedbackText || null,
          status: "submitted",
        },
      });
    }

    // Save indicator breakdown if supplied
    if (params.indicatorRatings && params.indicatorRatings.length > 0) {
      for (const item of params.indicatorRatings) {
        const existingRating = await db.reviewIndicatorRating.findFirst({
          where: { tenantId, reviewId: review.id, indicatorId: item.indicatorId },
        });

        if (existingRating) {
          await db.reviewIndicatorRating.update({
            where: { id: existingRating.id },
            data: params.reviewType === "self" ? {
              selfRating: item.rating,
              selfComments: item.comments || null,
            } : {
              managerRating: item.rating,
              managerComments: item.comments || null,
            },
          });
        } else {
          await db.reviewIndicatorRating.create({
            data: {
              tenantId,
              reviewId: review.id,
              indicatorId: item.indicatorId,
              selfRating: params.reviewType === "self" ? item.rating : null,
              selfComments: params.reviewType === "self" ? (item.comments || null) : null,
              managerRating: params.reviewType === "manager" ? item.rating : null,
              managerComments: params.reviewType === "manager" ? (item.comments || null) : null,
            },
          });
        }
      }
    }

    await AuditService.log({
      tenantId,
      actorId,
      action: "PERFORMANCE_REVIEW_SUBMITTED",
      entityType: "OkrReview",
      entityId: review.id,
      metadata: { reviewType: params.reviewType, ratingScore: finalScore },
    });

    return review;
  }

  static async releaseReviews(tenantId: string, actorId: string, cycleId: string) {
    const db = getTenantDb();

    // Mark submitted reviews in cycle as approved/released
    const result = await db.okrReview.updateMany({
      where: {
        cycleId,
        cycle: { tenantId },
        status: "submitted",
      },
      data: {
        status: "approved",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PERFORMANCE_REVIEWS_RELEASED",
      entityType: "OkrCycle",
      entityId: cycleId,
      metadata: { releasedCount: result.count },
    });

    return result;
  }

  /**
   * 5. PERFORMANCE IMPROVEMENT PLANS (PIP) (P6-BR-018)
   */
  static async createPIP(
    tenantId: string,
    actorId: string,
    params: {
      employeeId: string;
      supervisorId: string;
      reason: string;
      startDate: string | Date;
      endDate: string | Date;
      expectedOutcomes: string;
      checkpoints?: any;
    }
  ) {
    const db = getTenantDb();

    const pip = await db.performanceImprovementPlan.create({
      data: {
        tenantId,
        employeeId: params.employeeId,
        supervisorId: params.supervisorId,
        reason: params.reason,
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate),
        expectedOutcomes: params.expectedOutcomes,
        checkpoints: params.checkpoints || undefined,
        status: "active",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PIP_INITIATED",
      entityType: "PerformanceImprovementPlan",
      entityId: pip.id,
      metadata: { employeeId: params.employeeId },
    });

    return pip;
  }

  static async concludePIP(
    tenantId: string,
    actorId: string,
    pipId: string,
    status: "successful" | "failed" | "extended",
    finalRemarks: string
  ) {
    const db = getTenantDb();

    const pip = await db.performanceImprovementPlan.update({
      where: { id: pipId },
      data: {
        status,
        finalRemarks,
        concludedAt: new Date(),
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PIP_CONCLUDED",
      entityType: "PerformanceImprovementPlan",
      entityId: pip.id,
      metadata: { status, finalRemarks },
    });

    return pip;
  }

  /**
   * 6. PERFORMANCE OVERVIEW METRICS
   */
  static async getOverviewMetrics(tenantId: string) {
    const db = getTenantDb();

    const [
      activeCycles,
      totalObjectives,
      achievedObjectives,
      reviews,
      activePips,
    ] = await Promise.all([
      db.okrCycle.count({ where: { tenantId, status: "active" } }),
      db.okrObjective.count({ where: { tenantId } }),
      db.okrObjective.count({ where: { tenantId, status: "achieved" } }),
      db.okrReview.findMany({
        where: { cycle: { tenantId }, status: { in: ["submitted", "approved"] } },
        select: { ratingScore: true },
      }),
      db.performanceImprovementPlan.count({ where: { tenantId, status: "active" } }),
    ]);

    const avgScore =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + Number(r.ratingScore || 0), 0) / reviews.length).toFixed(1)
        : "0.0";

    const goalCompletionPct =
      totalObjectives > 0 ? Math.round((achievedObjectives / totalObjectives) * 100) : 0;

    return {
      activeCycles,
      totalObjectives,
      goalCompletionPct,
      averageReviewScore: avgScore,
      totalReviewsSubmitted: reviews.length,
      activePips,
    };
  }
}
