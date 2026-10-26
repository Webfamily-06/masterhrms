"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingService = void 0;
const tenant_context_1 = require("../context/tenant-context");
const outbox_service_1 = require("./outbox.service");
const audit_service_1 = require("./audit.service");
class TrainingService {
    /**
     * 1. TRAINING TYPES (MASTER)
     */
    static async createType(tenantId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTypeMaster.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                branchId: data.branchId || null,
                departmentId: data.departmentId || null,
                isActive: true,
            },
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
            },
        });
    }
    static async listTypes(tenantId, branchId, departmentId, search) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (branchId)
            where.branchId = branchId;
        if (departmentId)
            where.departmentId = departmentId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        return await db.trainingTypeMaster.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
                _count: { select: { sessions: true } },
            },
            orderBy: { name: "asc" },
        });
    }
    static async updateType(tenantId, id, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTypeMaster.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
                ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            },
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
            },
        });
    }
    static async deleteType(tenantId, id) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTypeMaster.delete({
            where: { id },
        });
    }
    /**
     * 2. TRAINERS (MASTER)
     */
    static async createTrainer(tenantId, actorId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const trainer = await db.trainer.create({
            data: {
                tenantId,
                name: data.name,
                contactNumber: data.contactNumber,
                email: data.email,
                yearsOfExperience: Number(data.yearsOfExperience) || 0,
                expertise: data.expertise,
                qualifications: data.qualifications,
                trainerType: data.trainerType || "internal",
                branchId: data.branchId || null,
                departmentId: data.departmentId || null,
                status: data.status || "active",
            },
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
            },
        });
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "training.trainer_created",
            entityType: "Trainer",
            entityId: trainer.id,
            newValues: { name: trainer.name, email: trainer.email, trainerType: trainer.trainerType },
        });
        return trainer;
    }
    static async listTrainers(tenantId, options) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (options?.branchId)
            where.branchId = options.branchId;
        if (options?.departmentId)
            where.departmentId = options.departmentId;
        if (options?.trainerType)
            where.trainerType = options.trainerType;
        if (options?.search) {
            where.OR = [
                { name: { contains: options.search, mode: "insensitive" } },
                { email: { contains: options.search, mode: "insensitive" } },
                { contactNumber: { contains: options.search, mode: "insensitive" } },
                { expertise: { contains: options.search, mode: "insensitive" } },
            ];
        }
        return await db.trainer.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
                _count: { select: { sessions: true } },
            },
            orderBy: { name: "asc" },
        });
    }
    static async getTrainer(tenantId, id) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainer.findFirst({
            where: { id, tenantId },
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
                sessions: {
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                        location: true,
                    },
                },
            },
        });
    }
    static async updateTrainer(tenantId, actorId, id, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const updated = await db.trainer.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.contactNumber !== undefined ? { contactNumber: data.contactNumber } : {}),
                ...(data.email !== undefined ? { email: data.email } : {}),
                ...(data.yearsOfExperience !== undefined ? { yearsOfExperience: Number(data.yearsOfExperience) || 0 } : {}),
                ...(data.expertise !== undefined ? { expertise: data.expertise } : {}),
                ...(data.qualifications !== undefined ? { qualifications: data.qualifications } : {}),
                ...(data.trainerType !== undefined ? { trainerType: data.trainerType } : {}),
                ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
                ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
            },
            include: {
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
            },
        });
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "training.trainer_updated",
            entityType: "Trainer",
            entityId: id,
            newValues: { name: updated.name, status: updated.status },
        });
        return updated;
    }
    static async deleteTrainer(tenantId, id) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainer.delete({
            where: { id },
        });
    }
    /**
     * 3. TRAINING PROGRAMS / COURSES
     */
    static async createProgram(tenantId, actorId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const program = await db.trainingCourse.create({
            data: {
                tenantId,
                title: data.title,
                slug,
                category: data.category || "Compliance & Security",
                instructor: data.instructor || "Internal Academy",
                durationHours: data.durationHours ?? 4.0,
                isMandatory: data.isMandatory ?? false,
                passingScore: data.passingScore ?? 80,
                description: data.description,
                bannerUrl: data.bannerUrl,
                status: "published",
            },
        });
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "training.program_created",
            entityType: "TrainingCourse",
            entityId: program.id,
            newValues: { title: program.title, category: program.category },
        });
        await outbox_service_1.OutboxService.publish({
            tenantId,
            eventType: "training.program_created",
            entityType: "TrainingCourse",
            entityId: program.id,
            payload: { title: program.title, isMandatory: program.isMandatory },
        });
        return program;
    }
    static async listPrograms(tenantId, category, search) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (category && category !== "all") {
            where.category = category;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        return await db.trainingCourse.findMany({
            where,
            include: {
                modules: true,
                sessions: {
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                    },
                },
                _count: { select: { enrollments: true, modules: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * 4. TRAINING SESSIONS / LIST
     */
    static async createSession(tenantId, actorId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        let courseId = data.courseId;
        if (!courseId) {
            let defaultCourse = await db.trainingCourse.findFirst({
                where: { tenantId, status: "published" },
            });
            if (!defaultCourse) {
                defaultCourse = await db.trainingCourse.create({
                    data: {
                        tenantId,
                        title: data.title || "Enterprise Training Curriculum",
                        slug: `training-${Date.now()}`,
                        category: "General Training",
                        instructor: data.trainer || "Lead Trainer",
                        status: "published",
                    },
                });
            }
            courseId = defaultCourse.id;
        }
        // Resolve trainer name if trainerId provided
        let trainerName = data.trainer || "Instructor";
        if (data.trainerId) {
            const tr = await db.trainer.findUnique({ where: { id: data.trainerId } });
            if (tr)
                trainerName = tr.name;
        }
        const sessionCode = `TRN-${Date.now().toString().slice(-6)}`;
        const session = await db.trainingSession.create({
            data: {
                tenantId,
                courseId,
                trainingTypeId: data.trainingTypeId || null,
                trainerId: data.trainerId || null,
                branchId: data.branchId || null,
                departmentId: data.departmentId || null,
                sessionCode,
                title: data.title,
                trainer: trainerName,
                startDate: start,
                endDate: end,
                startTime: data.startTime || null,
                endTime: data.endTime || null,
                location: data.location || "Main Training Room",
                capacity: Number(data.capacity) || 20,
                cost: Number(data.cost) || 0,
                description: data.description || null,
                status: data.status || "scheduled",
            },
            include: {
                trainingType: true,
                trainerRel: true,
                branch: true,
                department: true,
            },
        });
        // Assign initial employees if provided
        if (Array.isArray(data.assignedEmployeeIds) && data.assignedEmployeeIds.length > 0) {
            for (const empId of data.assignedEmployeeIds) {
                if (!empId)
                    continue;
                try {
                    await db.sessionAttendance.create({
                        data: {
                            tenantId,
                            sessionId: session.id,
                            employeeId: empId,
                            status: "registered",
                        },
                    });
                }
                catch {
                    // Ignore duplicate registrations
                }
            }
        }
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "training.session_created",
            entityType: "TrainingSession",
            entityId: session.id,
            newValues: { sessionCode, title: session.title, capacity: session.capacity, cost: session.cost },
        });
        await outbox_service_1.OutboxService.publish({
            tenantId,
            eventType: "training.session_created",
            entityType: "TrainingSession",
            entityId: session.id,
            payload: { sessionCode, title: session.title, cost: session.cost },
        });
        return session;
    }
    static async listSessions(tenantId, options) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (options?.courseId)
            where.courseId = options.courseId;
        if (options?.trainingTypeId)
            where.trainingTypeId = options.trainingTypeId;
        if (options?.trainerId)
            where.trainerId = options.trainerId;
        if (options?.branchId)
            where.branchId = options.branchId;
        if (options?.departmentId)
            where.departmentId = options.departmentId;
        if (options?.status && options.status !== "all")
            where.status = options.status;
        if (options?.search) {
            where.OR = [
                { title: { contains: options.search, mode: "insensitive" } },
                { location: { contains: options.search, mode: "insensitive" } },
                { trainer: { contains: options.search, mode: "insensitive" } },
            ];
        }
        return await db.trainingSession.findMany({
            where,
            include: {
                course: { select: { id: true, title: true, category: true } },
                trainingType: { select: { id: true, name: true } },
                trainerRel: { select: { id: true, name: true, contactNumber: true, email: true } },
                branch: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true } },
                attendances: {
                    include: {
                        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } },
                    },
                },
                _count: { select: { attendances: true, tasks: true } },
            },
            orderBy: { startDate: "asc" },
        });
    }
    static async getSession(tenantId, id) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingSession.findFirst({
            where: { id, tenantId },
            include: {
                course: true,
                trainingType: true,
                trainerRel: true,
                branch: true,
                department: true,
                attendances: {
                    include: {
                        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } },
                    },
                },
                tasks: {
                    include: {
                        assignee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                        _count: { select: { feedbacks: true } },
                    },
                },
            },
        });
    }
    static async updateSession(tenantId, actorId, id, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const existing = await db.trainingSession.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            throw new Error("Training session not found.");
        }
        let trainerName = data.trainer !== undefined ? data.trainer : existing.trainer;
        if (data.trainerId) {
            const tr = await db.trainer.findUnique({ where: { id: data.trainerId } });
            if (tr)
                trainerName = tr.name;
        }
        const updated = await db.trainingSession.update({
            where: { id },
            data: {
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
                ...(data.trainingTypeId !== undefined ? { trainingTypeId: data.trainingTypeId || null } : {}),
                ...(data.trainerId !== undefined ? { trainerId: data.trainerId || null } : {}),
                trainer: trainerName,
                ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
                ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
                ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
                ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
                ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
                ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
                ...(data.location !== undefined ? { location: data.location } : {}),
                ...(data.capacity !== undefined ? { capacity: Number(data.capacity) || 20 } : {}),
                ...(data.cost !== undefined ? { cost: Number(data.cost) || 0 } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
            },
            include: {
                trainingType: true,
                trainerRel: true,
                branch: true,
                department: true,
            },
        });
        // Check if status changed to completed and cost > 0 -> trigger automatic accounting audit
        if (data.status === "completed" && Number(updated.cost) > 0) {
            await audit_service_1.AuditService.record({
                tenantId,
                actorId,
                action: "training.completed_with_expense",
                entityType: "TrainingSession",
                entityId: id,
                newValues: {
                    title: updated.title,
                    cost: updated.cost,
                    accountCategory: "Staff Training & Development Expense",
                },
            });
        }
        return updated;
    }
    static async deleteSession(tenantId, id) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingSession.delete({
            where: { id },
        });
    }
    /**
     * 5. TRAINING TASKS
     */
    static async listTasks(tenantId, trainingId, search) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId, trainingId };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        return await db.trainingTask.findMany({
            where,
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
                },
                _count: { select: { feedbacks: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    static async createTask(tenantId, actorId, trainingId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const task = await db.trainingTask.create({
            data: {
                tenantId,
                trainingId,
                title: data.title,
                assignedToId: data.assignedToId || null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                description: data.description || null,
                status: "Pending",
            },
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
                },
                _count: { select: { feedbacks: true } },
            },
        });
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "training.task_created",
            entityType: "TrainingTask",
            entityId: task.id,
            newValues: { title: task.title, trainingId },
        });
        return task;
    }
    static async updateTask(tenantId, taskId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTask.update({
            where: { id: taskId },
            data: {
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId || null } : {}),
                ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
            },
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
                },
                _count: { select: { feedbacks: true } },
            },
        });
    }
    static async markTaskComplete(tenantId, taskId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTask.update({
            where: { id: taskId },
            data: {
                status: "Completed",
                completedAt: new Date(),
            },
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
                },
                _count: { select: { feedbacks: true } },
            },
        });
    }
    static async deleteTask(tenantId, taskId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTask.delete({
            where: { id: taskId },
        });
    }
    /**
     * 6. TASK FEEDBACKS
     */
    static async listFeedbacks(tenantId, taskId, search) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId, taskId };
        if (search) {
            where.OR = [
                { userName: { contains: search, mode: "insensitive" } },
                { comments: { contains: search, mode: "insensitive" } },
            ];
        }
        return await db.trainingTaskFeedback.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
    }
    static async createFeedback(tenantId, taskId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTaskFeedback.create({
            data: {
                tenantId,
                taskId,
                rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
                comments: data.comments,
                userId: data.userId || null,
                userName: data.userName || "Verified User",
            },
        });
    }
    static async deleteFeedback(tenantId, feedbackId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingTaskFeedback.delete({
            where: { id: feedbackId },
        });
    }
    /**
     * 7. SESSION REGISTRATION & ATTENDANCE
     */
    static async registerSession(tenantId, sessionId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        const session = await db.trainingSession.findUnique({
            where: { id: sessionId },
            include: { _count: { select: { attendances: true } } },
        });
        if (!session || session.tenantId !== tenantId) {
            throw new Error("Session not found.");
        }
        if (session.status === "cancelled" || session.status === "completed") {
            throw new Error(`Cannot register for session with status '${session.status}'.`);
        }
        if (session._count.attendances >= session.capacity) {
            throw new Error(`Session has reached its maximum capacity of ${session.capacity} participants.`);
        }
        const existing = await db.sessionAttendance.findUnique({
            where: {
                tenantId_sessionId_employeeId: {
                    tenantId,
                    sessionId,
                    employeeId,
                },
            },
        });
        if (existing) {
            throw new Error("Employee is already registered for this session.");
        }
        const attendance = await db.sessionAttendance.create({
            data: {
                tenantId,
                sessionId,
                employeeId,
                status: "registered",
            },
            include: {
                session: true,
                employee: true,
            },
        });
        await outbox_service_1.OutboxService.publish({
            tenantId,
            eventType: "training.registered",
            entityType: "SessionAttendance",
            entityId: attendance.id,
            payload: { sessionId, employeeId },
        });
        return attendance;
    }
    static async markSessionAttendance(tenantId, attendanceId, status, feedback, rating) {
        const db = (0, tenant_context_1.getTenantDb)();
        const attendance = await db.sessionAttendance.findUnique({
            where: { id: attendanceId },
        });
        if (!attendance || attendance.tenantId !== tenantId) {
            throw new Error("Attendance record not found.");
        }
        return await db.sessionAttendance.update({
            where: { id: attendanceId },
            data: {
                status,
                attendedAt: status === "attended" ? new Date() : attendance.attendedAt,
                feedback,
                rating,
            },
        });
    }
    /**
     * 8. EMPLOYEE ENROLLMENTS & COMPLETION
     */
    static async assignTraining(tenantId, actorId, courseId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        const course = await db.trainingCourse.findUnique({ where: { id: courseId } });
        if (!course || course.tenantId !== tenantId) {
            throw new Error("Training course not found.");
        }
        const enrollment = await db.courseEnrollment.upsert({
            where: {
                tenantId_courseId_employeeId: {
                    tenantId,
                    courseId,
                    employeeId,
                },
            },
            create: {
                tenantId,
                courseId,
                employeeId,
                status: "enrolled",
                progressPercent: 0,
            },
            update: {
                status: "enrolled",
            },
            include: {
                course: true,
                employee: true,
            },
        });
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "training.assigned",
            entityType: "CourseEnrollment",
            entityId: enrollment.id,
            newValues: { courseId, employeeId },
        });
        await outbox_service_1.OutboxService.publish({
            tenantId,
            eventType: "training.assigned",
            entityType: "CourseEnrollment",
            entityId: enrollment.id,
            payload: { courseId, employeeId, courseTitle: course.title },
        });
        return enrollment;
    }
    static async updateProgress(tenantId, enrollmentId, progressPercent, score) {
        const db = (0, tenant_context_1.getTenantDb)();
        const current = await db.courseEnrollment.findUnique({
            where: { id: enrollmentId },
            include: { course: true },
        });
        if (!current || current.tenantId !== tenantId) {
            throw new Error("Enrollment record not found.");
        }
        const isCompleted = progressPercent >= 100;
        const isPassed = isCompleted && (!score || score >= current.course.passingScore);
        const updated = await db.courseEnrollment.update({
            where: { id: enrollmentId },
            data: {
                progressPercent,
                score: score !== undefined ? score : current.score,
                status: isPassed ? "completed" : isCompleted ? "failed" : "in_progress",
                certifiedAt: isPassed && !current.certifiedAt ? new Date() : current.certifiedAt,
                certificateId: isPassed && !current.certificateId
                    ? `CERT-${Date.now().toString().slice(-8)}`
                    : current.certificateId,
            },
            include: {
                course: true,
                employee: true,
            },
        });
        if (isPassed && !current.certifiedAt) {
            await outbox_service_1.OutboxService.publish({
                tenantId,
                eventType: "training.certified",
                entityType: "CourseEnrollment",
                entityId: updated.id,
                payload: {
                    certificateId: updated.certificateId,
                    employeeId: updated.employeeId,
                    courseTitle: current.course.title,
                },
            });
        }
        return updated;
    }
    static async getEmployeeTrainings(tenantId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.courseEnrollment.findMany({
            where: { tenantId, employeeId },
            include: {
                course: {
                    include: {
                        modules: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    static async getEmployeeSessions(tenantId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.trainingSession.findMany({
            where: {
                tenantId,
                attendances: {
                    some: { employeeId },
                },
            },
            include: {
                course: true,
                trainingType: true,
                trainerRel: true,
                attendances: {
                    where: { employeeId },
                },
            },
            orderBy: { startDate: "asc" },
        });
    }
    /**
     * 9. OVERVIEW STATS
     */
    static async getOverview(tenantId) {
        const db = (0, tenant_context_1.getTenantDb)();
        const [coursesCount, sessionsCount, trainersCount, typesCount, totalEnrollments, completedEnrollments] = await Promise.all([
            db.trainingCourse.count({ where: { tenantId } }),
            db.trainingSession.count({ where: { tenantId } }),
            db.trainer.count({ where: { tenantId } }),
            db.trainingTypeMaster.count({ where: { tenantId } }),
            db.courseEnrollment.count({ where: { tenantId } }),
            db.courseEnrollment.count({ where: { tenantId, status: "completed" } }),
        ]);
        const completionRate = totalEnrollments > 0
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 88;
        return {
            activePrograms: coursesCount,
            sessionsScheduled: sessionsCount,
            trainersCount,
            typesCount,
            employeesEnrolled: totalEnrollments,
            completionRate,
        };
    }
}
exports.TrainingService = TrainingService;
