"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LmsService = void 0;
const prisma_1 = require("../prisma");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class LmsService {
    /**
     * Create a new course in the Learning Management System
     */
    static async createCourse(tenantId, data) {
        const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const course = await db.trainingCourse.create({
            data: {
                tenantId,
                title: data.title,
                slug,
                category: data.category || "General Professional Development",
                instructor: data.instructor || "Academy Lead",
                durationHours: data.durationHours || 4.0,
                isMandatory: data.isMandatory || false,
                passingScore: data.passingScore || 80,
                description: data.description || null,
                status: "published",
            },
        });
        return course;
    }
    /**
     * Enroll employee into course
     */
    static async enrollEmployee(tenantId, courseId, employeeId) {
        const course = await db.trainingCourse.findFirst({
            where: { id: courseId, tenantId },
        });
        if (!course) {
            throw new Error("Course not found.");
        }
        const existing = await db.courseEnrollment.findFirst({
            where: { courseId, employeeId },
        });
        if (existing) {
            return existing;
        }
        const enrollment = await db.courseEnrollment.create({
            data: {
                tenantId,
                courseId,
                employeeId,
                status: "in_progress",
                progressPercent: 0,
            },
        });
        return enrollment;
    }
    /**
     * Record module / quiz progress towards course completion
     */
    static async updateProgress(tenantId, enrollmentId, progressPercentage, score) {
        const enrollment = await db.courseEnrollment.findFirst({
            where: { id: enrollmentId, tenantId },
            include: { course: true },
        });
        if (!enrollment) {
            throw new Error("Enrollment not found.");
        }
        const progress = Math.min(100, Math.max(0, progressPercentage));
        const isCompleted = progress === 100;
        const isPassed = score !== undefined ? score >= enrollment.course.passingScore : isCompleted;
        const certId = isCompleted && isPassed ? `CERT-${enrollmentId.substring(0, 8).toUpperCase()}` : null;
        const updated = await db.courseEnrollment.update({
            where: { id: enrollmentId },
            data: {
                progressPercent: progress,
                score: score !== undefined ? score : undefined,
                status: isCompleted ? (isPassed ? "completed" : "failed") : "in_progress",
                certifiedAt: isCompleted && isPassed ? new Date() : null,
                certificateId: certId || undefined,
            },
        });
        return updated;
    }
    /**
     * Generate verifiable course completion certificate
     */
    static async getCertificate(tenantId, enrollmentId) {
        const enrollment = await db.courseEnrollment.findFirst({
            where: { id: enrollmentId, tenantId, status: "completed" },
            include: { course: true, employee: true },
        });
        if (!enrollment) {
            throw new Error("Completed enrollment certificate not found.");
        }
        return {
            certificateId: enrollment.certificateId || `CERT-${enrollment.id.substring(0, 8).toUpperCase()}`,
            courseTitle: enrollment.course.title,
            recipientName: `${enrollment.employee.firstName} ${enrollment.employee.lastName}`,
            completedAt: (enrollment.certifiedAt || enrollment.updatedAt)?.toISOString(),
            score: enrollment.score ?? 100,
            issuer: "MasterHRMS Academy",
        };
    }
}
exports.LmsService = LmsService;
