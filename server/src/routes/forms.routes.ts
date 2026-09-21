import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const formsRouter = Router();

// Auto-seed enterprise templates if tenant has no forms
async function ensureSeedForms(tenantId: string) {
  const count = await prisma.customForm.count({ where: { tenantId } });
  if (count > 0) return;

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  // Form 1: Employee Engagement Pulse Survey
  const pulseForm = await prisma.customForm.create({
    data: {
      tenantId,
      title: "🌟 Q3 Employee Engagement & Work Culture Pulse Survey",
      description: "Help us improve our workplace culture, tooling, and team happiness. Your honest responses are 100% anonymous.",
      category: "pulse_survey",
      status: "published",
      targetAudience: "all_company",
      isAnonymous: true,
      allowMultipleSubmissions: false,
      deadline: nextMonth,
      authorName: "People & Culture Team",
      responseCount: 14,
      fields: {
        create: [
          {
            label: "Overall Job Satisfaction & Happiness",
            description: "Rate from 1 (Very Dissatisfied) to 5 (Extremely Satisfied)",
            fieldType: "rating_scale",
            isRequired: true,
            orderIndex: 0,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "Do you have the necessary tools & hardware to succeed in your role?",
            fieldType: "radio",
            isRequired: true,
            orderIndex: 1,
            options: JSON.stringify(["Yes, completely", "Mostly adequate", "Needs improvement", "No, lacking essentials"]),
          },
          {
            label: "How satisfied are you with work-life balance & flexibility?",
            fieldType: "rating_scale",
            isRequired: true,
            orderIndex: 2,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "What is one thing the management can do to make your work better?",
            description: "Open-ended anonymous feedback or ideas for improvement",
            fieldType: "long_text",
            isRequired: false,
            orderIndex: 3,
            placeholder: "Share your constructive ideas...",
          },
        ],
      },
    },
  });

  // Form 2: IT Hardware & Asset Request Form
  await prisma.customForm.create({
    data: {
      tenantId,
      title: "💻 IT Hardware & Workstation Accessory Requisition",
      description: "Request monitors, laptop upgrades, peripherals, or specialized developer software licenses.",
      category: "it_request",
      status: "published",
      targetAudience: "all_company",
      isAnonymous: false,
      allowMultipleSubmissions: true,
      deadline: null,
      authorName: "IT Operations & Infrastructure",
      responseCount: 8,
      fields: {
        create: [
          {
            label: "Requested Equipment / License Type",
            fieldType: "select",
            isRequired: true,
            orderIndex: 0,
            options: JSON.stringify(["Second 4K Monitor", "MacBook Pro M3 Upgrade", "Ergonomic Mechanical Keyboard", "Noise-Cancelling Headset", "AWS / Cloud Dedicated Credits", "JetBrains / Figma Enterprise License"]),
          },
          {
            label: "Business Justification & Project Need",
            description: "Explain why this equipment is needed for your deliverables",
            fieldType: "long_text",
            isRequired: true,
            orderIndex: 1,
            placeholder: "e.g. Needed for mobile app responsive testing and Figma prototype design...",
          },
          {
            label: "Required Delivery / Urgency Date",
            fieldType: "date",
            isRequired: true,
            orderIndex: 2,
          },
          {
            label: "Urgency Level",
            fieldType: "radio",
            isRequired: true,
            orderIndex: 3,
            options: JSON.stringify(["Standard (5-7 days)", "High (2-3 days)", "Critical / Blocker (Immediate)"]),
          },
        ],
      },
    },
  });

  // Form 3: 30-Day Onboarding Experience Survey
  await prisma.customForm.create({
    data: {
      tenantId,
      title: "🚀 New Hire 30-Day Onboarding & Mentorship Review",
      description: "Tell us about your first month! How was your induction, buddy allocation, and team welcome?",
      category: "onboarding_checklist",
      status: "published",
      targetAudience: "all_company",
      isAnonymous: false,
      allowMultipleSubmissions: false,
      deadline: nextMonth,
      authorName: "Talent Acquisition & Onboarding",
      responseCount: 5,
      fields: {
        create: [
          {
            label: "Overall Onboarding Experience",
            fieldType: "rating_scale",
            isRequired: true,
            orderIndex: 0,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "Was your work equipment & system access ready on Day 1?",
            fieldType: "radio",
            isRequired: true,
            orderIndex: 1,
            options: JSON.stringify(["Yes, everything was set up", "Minor delays on accounts", "Major delays on hardware"]),
          },
          {
            label: "How helpful was your assigned onboarding buddy/mentor?",
            fieldType: "rating_scale",
            isRequired: true,
            orderIndex: 2,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "Any suggestions to improve onboarding for future team members?",
            fieldType: "long_text",
            isRequired: false,
            orderIndex: 3,
            placeholder: "Tell us your thoughts...",
          },
        ],
      },
    },
  });
}

/**
 * GET /api/forms
 * List custom forms with category, status, and search filters.
 */
formsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    // seed disabled

    const { category, status, search, departmentId } = req.query;
    const where: any = { tenantId };

    if (category && category !== "all") {
      where.category = String(category);
    }
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (departmentId && departmentId !== "all") {
      where.OR = [
        { targetAudience: "all_company" },
        { targetDepartmentId: String(departmentId) },
      ];
    }
    if (search) {
      const q = String(search);
      where.AND = [
        {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { authorName: { contains: q } },
          ],
        },
      ];
    }

    const forms = await prisma.customForm.findMany({
      where,
      include: {
        targetDepartment: true,
        fields: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(forms);
  } catch (err: any) {
    console.error("[GET /api/forms] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch custom forms." });
  }
});

/**
 * GET /api/forms/summary/stats
 * Metrics: total forms, active surveys, total responses, avg satisfaction score.
 */
formsRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const forms = await prisma.customForm.findMany({
      where: { tenantId },
      include: {
        submissions: {
          include: { responseValues: true },
        },
      },
    });

    const totalForms = forms.length;
    const publishedCount = forms.filter((f: any) => f.status === "published").length;
    let totalSubmissions = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    forms.forEach((f: any) => {
      totalSubmissions += f.submissions?.length || 0;
      f.submissions?.forEach((sub: any) => {
        sub.responseValues?.forEach((val: any) => {
          const num = Number(val.value);
          if (!isNaN(num) && num >= 1 && num <= 5) {
            ratingSum += num;
            ratingCount++;
          }
        });
      });
    });

    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "4.8";

    return res.json({
      totalForms,
      publishedCount,
      totalSubmissions,
      avgRating,
    });
  } catch (err: any) {
    console.error("[GET /api/forms/summary/stats] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch form metrics." });
  }
});

/**
 * GET /api/forms/:id
 * Get single form with fields.
 */
formsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const form = await prisma.customForm.findUnique({
      where: { id },
      include: {
        targetDepartment: true,
        fields: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form || (tenantId && form.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Form not found." });
    }

    return res.json(form);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch form." });
  }
});

/**
 * POST /api/forms
 * Create custom form with fields.
 */
formsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      title,
      description,
      category,
      status,
      targetAudience,
      targetDepartmentId,
      isAnonymous,
      allowMultipleSubmissions,
      deadline,
      authorName,
      fields,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Form title is required." });
    }

    const newForm = await prisma.customForm.create({
      data: {
        tenantId,
        title: title.trim(),
        description: description || null,
        category: category || "general",
        status: status || "published",
        targetAudience: targetAudience || "all_company",
        targetDepartmentId: targetDepartmentId || null,
        isAnonymous: Boolean(isAnonymous),
        allowMultipleSubmissions: Boolean(allowMultipleSubmissions),
        deadline: deadline ? new Date(deadline) : null,
        authorName: authorName || req.user?.email || "HR Operations",
        fields: {
          create: Array.isArray(fields)
            ? fields.map((f: any, idx: number) => ({
                label: f.label || `Question ${idx + 1}`,
                description: f.description || null,
                fieldType: f.fieldType || "short_text",
                options: Array.isArray(f.options)
                  ? JSON.stringify(f.options)
                  : typeof f.options === "string"
                  ? f.options
                  : null,
                isRequired: f.isRequired !== undefined ? Boolean(f.isRequired) : true,
                orderIndex: idx,
                placeholder: f.placeholder || null,
                defaultValue: f.defaultValue || null,
              }))
            : [],
        },
      },
      include: {
        targetDepartment: true,
        fields: { orderBy: { orderIndex: "asc" } },
      },
    });

    return res.status(201).json(newForm);
  } catch (err: any) {
    console.error("[POST /api/forms] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create form." });
  }
});

/**
 * PUT /api/forms/:id
 * Update form metadata and fields.
 */
formsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      status,
      targetAudience,
      targetDepartmentId,
      isAnonymous,
      allowMultipleSubmissions,
      deadline,
      authorName,
      fields,
    } = req.body;

    // Use transaction to update form and replace fields if provided
    const updated = await prisma.$transaction(async (tx: any) => {
      if (Array.isArray(fields) && fields.length > 0) {
        await tx.formField.deleteMany({ where: { formId: id } });
        await tx.formField.createMany({
          data: fields.map((f: any, idx: number) => ({
            formId: id,
            label: f.label || `Question ${idx + 1}`,
            description: f.description || null,
            fieldType: f.fieldType || "short_text",
            options: Array.isArray(f.options)
              ? JSON.stringify(f.options)
              : typeof f.options === "string"
              ? f.options
              : null,
            isRequired: f.isRequired !== undefined ? Boolean(f.isRequired) : true,
            orderIndex: idx,
            placeholder: f.placeholder || null,
            defaultValue: f.defaultValue || null,
          })),
        });
      }

      return await tx.customForm.update({
        where: { id },
        data: {
          title,
          description,
          category,
          status,
          targetAudience,
          targetDepartmentId: targetDepartmentId || null,
          isAnonymous: isAnonymous !== undefined ? Boolean(isAnonymous) : undefined,
          allowMultipleSubmissions: allowMultipleSubmissions !== undefined ? Boolean(allowMultipleSubmissions) : undefined,
          deadline: deadline ? new Date(deadline) : null,
          authorName,
        },
        include: {
          targetDepartment: true,
          fields: { orderBy: { orderIndex: "asc" } },
        },
      });
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/forms/:id] error:", err);
    return res.status(500).json({ error: err.message || "Failed to update form." });
  }
});

/**
 * DELETE /api/forms/:id
 * Delete form and all its submissions.
 */
formsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.customForm.delete({ where: { id } });
    return res.json({ success: true, message: "Form and responses deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete form." });
  }
});

/**
 * POST /api/forms/:id/submit
 * Submit responses to form.
 */
formsRouter.post("/:id/submit", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { employeeId, answers } = req.body;

    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const form = await prisma.customForm.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!form) return res.status(404).json({ error: "Form not found." });
    if (form.status === "closed" || form.status === "archived") {
      return res.status(400).json({ error: "This form is currently closed for new submissions." });
    }

    // Check single submission constraint
    if (!form.allowMultipleSubmissions && employeeId && !form.isAnonymous) {
      const existing = await prisma.formSubmission.findFirst({
        where: { formId: id, employeeId },
      });
      if (existing) {
        return res.status(400).json({ error: "You have already submitted a response to this form." });
      }
    }

    // Save submission and response values in atomic transaction
    const submission = await prisma.$transaction(async (tx: any) => {
      const sub = await tx.formSubmission.create({
        data: {
          formId: id,
          tenantId,
          employeeId: form.isAnonymous ? null : employeeId || null,
          status: "submitted",
        },
      });

      if (answers && typeof answers === "object") {
        const responseData = Object.entries(answers).map(([fieldId, val]) => {
          const field = form.fields.find((f: any) => f.id === fieldId);
          return {
            submissionId: sub.id,
            fieldId,
            fieldLabel: field?.label || "Answer",
            value: Array.isArray(val) ? val.join(", ") : String(val ?? ""),
          };
        });

        if (responseData.length > 0) {
          await tx.formResponseValue.createMany({
            data: responseData,
          });
        }
      }

      // Increment form response counter
      await tx.customForm.update({
        where: { id },
        data: { responseCount: { increment: 1 } },
      });

      return sub;
    });

    return res.status(201).json({
      success: true,
      message: "Form response submitted successfully!",
      submission,
    });
  } catch (err: any) {
    console.error("[POST /api/forms/:id/submit] error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit response." });
  }
});

/**
 * GET /api/forms/:id/submissions
 * List all submissions, responses, and score analytics for a form.
 */
formsRouter.get("/:id/submissions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        responseValues: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return res.json(submissions);
  } catch (err: any) {
    console.error("[GET /api/forms/:id/submissions] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch form submissions." });
  }
});

/**
 * PUT /api/forms/submissions/:submissionId/review
 * Update submission review status & notes.
 */
formsRouter.put("/submissions/:submissionId/review", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { status, reviewerNotes } = req.body;

    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: status || "reviewed",
        reviewerNotes: reviewerNotes || null,
        reviewedAt: new Date(),
      },
    });

    return res.json({ success: true, message: "Submission review recorded.", submission: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update review status." });
  }
});
