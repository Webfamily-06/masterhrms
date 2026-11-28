"use strict";
/**
 * MASTERHRMS — HR Workflow Auto-Trigger Email Middleware
 * ======================================================
 * Non-blocking response interceptor mounted on /api that automatically triggers
 * the matching Universal HTML email template whenever an HR workflow mutation
 * (POST / PUT / PATCH) succeeds (HTTP 2xx).
 *
 * Covers all 24 HR workflow events and respects Settings -> Email Notification Settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrEmailAutoTriggerMiddleware = hrEmailAutoTriggerMiddleware;
const hr_workflow_email_service_1 = require("../services/hr-workflow-email.service");
function normalizePath(originalUrl) {
    return originalUrl.split("?")[0].replace(/^\/api(\/v1)?/, "").replace(/\/+$/, "");
}
function matchHrEmailEvent(method, path, body) {
    const m = method.toUpperCase();
    const isPost = m === "POST";
    const isUpdate = m === "PUT" || m === "PATCH";
    if (!isPost && !isUpdate)
        return null;
    const isStatusAction = isUpdate &&
        (/\/(status|approve|reject|review|advance-status|finalize|publish)$/i.test(path) ||
            Boolean(body?.status || body?.stage));
    // 1. Assign Document To Employee
    if (isPost && /^\/hr\/documents\/acknowledgements(\/campaign)?$/i.test(path)) {
        return {
            eventKey: "assignDocumentToEmployee",
            extractVars: (b, d) => ({
                document_title: d?.document?.title || d?.title || b?.documentTitle || b?.title || "HR Document",
                document_category: d?.document?.category?.name || b?.categoryName || "HR Documents",
                due_date: d?.dueDate || b?.dueDate || "",
                note: d?.notes || b?.notes || "Please review and acknowledge in the portal.",
            }),
        };
    }
    // 2. Award Create
    if (isPost && /^(\/hr\/lifecycle\/awards|\/hr\/awards|\/awards)$/i.test(path)) {
        return {
            eventKey: "awardCreate",
            extractVars: (b, d) => ({
                award_type: d?.awardType?.name || d?.awardTypeName || b?.awardTypeName || b?.title || "Employee Award",
                award_date: d?.awardDate || b?.awardDate || new Date().toISOString().slice(0, 10),
                award_gift: d?.gift || b?.gift || "Certificate of Recognition",
                award_description: d?.description || b?.description || "",
            }),
        };
    }
    // 3. Candidate Status Update
    if (isStatusAction && /^\/hr\/recruitment\/candidates\/[^/]+/i.test(path)) {
        return {
            eventKey: "candidateStatusUpdate",
            extractVars: (b, d) => ({
                candidate_name: d?.name || d?.fullName || b?.name || "Candidate",
                job_title: d?.jobPosting?.title || d?.jobTitle || b?.jobTitle || "Open Position",
                status: d?.status || b?.status || "Updated",
                stage: d?.stage || b?.stage || "",
                remarks: d?.notes || b?.remarks || b?.notes || "",
            }),
        };
    }
    // 4. Complaint Create
    if (isPost && /^\/hr\/lifecycle\/complaints$/i.test(path)) {
        return {
            eventKey: "complaintCreate",
            extractVars: (b, d) => ({
                complaint_id: d?.complaintCode || d?.id || "",
                complaint_title: d?.title || b?.title || "Employee Complaint",
                complaint_date: d?.complaintDate || b?.complaintDate || new Date().toISOString().slice(0, 10),
                description: d?.description || b?.description || "",
            }),
        };
    }
    // 5. Employee Contract Create
    if (isPost && /^\/hr\/documents\/contracts$/i.test(path)) {
        return {
            eventKey: "employeeContractCreate",
            extractVars: (b, d) => ({
                contract_number: d?.contractNumber || b?.contractNumber || "",
                contract_type: d?.contractType?.name || b?.contractTypeName || "Employment Contract",
                start_date: d?.startDate || b?.startDate || "",
                end_date: d?.endDate || b?.endDate || "",
                salary: d?.basicSalary || d?.salary || b?.basicSalary || b?.salary || "",
            }),
        };
    }
    // 6. Employee Contract Status Update
    if (isStatusAction && /^\/hr\/documents\/contracts\/[^/]+/i.test(path)) {
        return {
            eventKey: "employeeContractStatusUpdate",
            extractVars: (b, d) => ({
                contract_number: d?.contractNumber || b?.contractNumber || "",
                contract_type: d?.contractType?.name || b?.contractTypeName || "Employment Contract",
                status: d?.status || b?.status || "Updated",
                remarks: d?.notes || b?.remarks || "",
            }),
        };
    }
    // 7. Employee Create
    if (isPost && /^(\/hr\/employees|\/employees)$/i.test(path)) {
        return {
            eventKey: "employeeCreate",
            extractVars: (b, d) => ({
                employee_name: `${d?.firstName || b?.firstName || ""} ${d?.lastName || b?.lastName || ""}`.trim() || "New Employee",
                employee_code: d?.employeeCode || b?.employeeCode || "",
                employee_email: d?.email || b?.email || "",
                department: d?.department?.name || b?.departmentName || "",
                designation: d?.designation?.name || b?.designationName || "",
                joining_date: d?.hireDate || d?.joiningDate || b?.hireDate || new Date().toISOString().slice(0, 10),
            }),
        };
    }
    // 8. Employee Transfer
    if (isPost && /^\/hr\/lifecycle\/transfers$/i.test(path)) {
        return {
            eventKey: "employeeTransfer",
            extractVars: (b, d) => ({
                from_branch: d?.fromBranch?.name || b?.fromBranchName || "",
                to_branch: d?.toBranch?.name || b?.toBranchName || "",
                from_department: d?.fromDepartment?.name || b?.fromDepartmentName || "",
                to_department: d?.toDepartment?.name || b?.toDepartmentName || "",
                transfer_date: d?.transferDate || b?.transferDate || "",
                reason: d?.reason || b?.reason || "",
            }),
        };
    }
    // 9. Employee Transfer Status Update
    if (isStatusAction && /^\/hr\/lifecycle\/transfers\/[^/]+/i.test(path)) {
        return {
            eventKey: "employeeTransferStatusUpdate",
            extractVars: (b, d) => ({
                status: d?.status || b?.status || "Updated",
                transfer_date: d?.transferDate || b?.transferDate || "",
                remarks: d?.remarks || b?.remarks || "",
            }),
        };
    }
    // 10. Interview Create
    if (isPost && /^\/hr\/recruitment\/interviews$/i.test(path)) {
        return {
            eventKey: "interviewCreate",
            extractVars: (b, d) => ({
                candidate_name: d?.candidate?.name || b?.candidateName || "Candidate",
                job_title: d?.jobPosting?.title || b?.jobTitle || "Interview",
                interview_date: d?.scheduledDate || d?.interviewDate || b?.scheduledDate || "",
                interview_time: d?.scheduledTime || b?.scheduledTime || "",
                location: d?.location || b?.location || "Online",
                meeting_link: d?.meetingLink || b?.meetingLink || "",
            }),
        };
    }
    // 11. Interview Status Update
    if (isStatusAction && /^\/hr\/recruitment\/interviews\/[^/]+/i.test(path)) {
        return {
            eventKey: "interviewStatusUpdate",
            extractVars: (b, d) => ({
                candidate_name: d?.candidate?.name || b?.candidateName || "Candidate",
                status: d?.status || b?.status || "Updated",
                feedback: d?.feedback || b?.feedback || "",
            }),
        };
    }
    // 12. Job Applied
    if (isPost && /^\/hr\/recruitment\/(candidates|applications)$/i.test(path)) {
        return {
            eventKey: "jobApplied",
            extractVars: (b, d) => ({
                candidate_name: d?.name || d?.fullName || b?.name || "Applicant",
                job_title: d?.jobPosting?.title || b?.jobTitle || "Open Role",
                application_id: d?.id || "",
                applied_date: new Date().toISOString().slice(0, 10),
            }),
        };
    }
    // 13. Leave Status Update
    if (isStatusAction && /^(\/hr\/leave|\/leave|\/leaves)\//i.test(path)) {
        return {
            eventKey: "leaveStatusUpdate",
            extractVars: (b, d) => ({
                leave_type: d?.leaveType?.name || b?.leaveTypeName || "Leave",
                start_date: d?.startDate || b?.startDate || "",
                end_date: d?.endDate || b?.endDate || "",
                total_days: d?.totalDays || d?.days || b?.totalDays || "",
                status: d?.status || b?.status || "Updated",
                remarks: d?.rejectionReason || d?.remarks || b?.remarks || "",
            }),
        };
    }
    // 14. Offer Create
    if (isPost && /^\/hr\/recruitment\/offers$/i.test(path)) {
        return {
            eventKey: "offerCreate",
            extractVars: (b, d) => ({
                candidate_name: d?.candidate?.name || b?.candidateName || "Candidate",
                job_title: d?.jobTitle || b?.jobTitle || "Role",
                offered_salary: d?.salary || d?.offeredSalary || b?.salary || "",
                joining_date: d?.joiningDate || b?.joiningDate || "",
            }),
        };
    }
    // 15. Payroll Run Status Update
    if (isStatusAction && /^(\/hr\/payroll|\/payroll)\/runs\/[^/]+/i.test(path)) {
        return {
            eventKey: "payrollRunStatusUpdate",
            extractVars: (b, d) => ({
                pay_period: d?.payPeriod || d?.name || b?.payPeriod || "Current Cycle",
                status: d?.status || b?.status || "Updated",
                pay_date: d?.payDate || b?.payDate || new Date().toISOString().slice(0, 10),
            }),
        };
    }
    // 16. Promotion Create
    if (isPost && /^\/hr\/lifecycle\/promotions$/i.test(path)) {
        return {
            eventKey: "promotionCreate",
            extractVars: (b, d) => ({
                previous_designation: d?.previousDesignation || b?.previousDesignation || "",
                new_designation: d?.newDesignation || b?.newDesignation || "",
                promotion_date: d?.promotionDate || b?.promotionDate || "",
                salary_adjustment: d?.salaryAdjustment || b?.salaryAdjustment || "",
            }),
        };
    }
    // 17. Promotion Status Update
    if (isStatusAction && /^\/hr\/lifecycle\/promotions\/[^/]+/i.test(path)) {
        return {
            eventKey: "promotionStatusUpdate",
            extractVars: (b, d) => ({
                new_designation: d?.newDesignation || b?.newDesignation || "",
                status: d?.status || b?.status || "Updated",
                remarks: d?.remarks || b?.remarks || "",
            }),
        };
    }
    // 18. Resignation Status Update
    if (isStatusAction && /^\/hr\/lifecycle\/resignations\/[^/]+/i.test(path)) {
        return {
            eventKey: "resignationStatusUpdate",
            extractVars: (b, d) => ({
                resignation_date: d?.resignationDate || b?.resignationDate || "",
                last_working_day: d?.lastWorkingDay || b?.lastWorkingDay || "",
                status: d?.status || b?.status || "Updated",
                remarks: d?.remarks || b?.remarks || "",
            }),
        };
    }
    // 19. Termination Create
    if (isPost && /^\/hr\/lifecycle\/terminations$/i.test(path)) {
        return {
            eventKey: "terminationCreate",
            extractVars: (b, d) => ({
                termination_type: d?.terminationType || b?.terminationType || "Termination",
                notice_date: d?.noticeDate || b?.noticeDate || "",
                termination_date: d?.terminationDate || b?.terminationDate || "",
                reason: d?.reason || b?.reason || "",
            }),
        };
    }
    // 20. Termination Status Update
    if (isStatusAction && /^\/hr\/lifecycle\/terminations\/[^/]+/i.test(path)) {
        return {
            eventKey: "terminationStatusUpdate",
            extractVars: (b, d) => ({
                status: d?.status || b?.status || "Updated",
                termination_date: d?.terminationDate || b?.terminationDate || "",
                remarks: d?.remarks || b?.remarks || "",
            }),
        };
    }
    // 21. Trip Create
    if (isPost && /^\/hr\/lifecycle\/trips$/i.test(path)) {
        return {
            eventKey: "tripCreate",
            extractVars: (b, d) => ({
                trip_purpose: d?.purpose || b?.purpose || "Business Trip",
                destination: d?.destination || b?.destination || "",
                start_date: d?.startDate || b?.startDate || "",
                end_date: d?.endDate || b?.endDate || "",
                advance_amount: d?.advanceAmount || b?.advanceAmount || "",
            }),
        };
    }
    // 22. Trip Status Update
    if (isStatusAction && /^\/hr\/lifecycle\/trips\/[^/]+/i.test(path)) {
        return {
            eventKey: "tripStatusUpdate",
            extractVars: (b, d) => ({
                trip_purpose: d?.purpose || b?.purpose || "Business Trip",
                destination: d?.destination || b?.destination || "",
                status: d?.status || b?.status || "Updated",
                remarks: d?.remarks || b?.remarks || "",
            }),
        };
    }
    // 23. User Create
    if (isPost && /^\/workspace\/users$/i.test(path)) {
        return {
            eventKey: "userCreate",
            extractVars: (b, d) => ({
                user_name: d?.fullName || b?.fullName || "New User",
                user_email: d?.email || b?.email || "",
                role_name: d?.role?.name || b?.legacyRole || "Member",
            }),
        };
    }
    // 24. Warning Create
    if (isPost && /^(\/hr\/lifecycle\/warnings|\/warnings)$/i.test(path)) {
        return {
            eventKey: "warningCreate",
            extractVars: (b, d) => ({
                warning_type: d?.warningType || b?.warningType || "Formal Warning",
                warning_subject: d?.subject || d?.title || b?.subject || b?.title || "Disciplinary Notice",
                warning_date: d?.warningDate || b?.warningDate || new Date().toISOString().slice(0, 10),
                severity: d?.severity || b?.severity || "Medium",
                description: d?.description || b?.description || "",
            }),
        };
    }
    return null;
}
function hrEmailAutoTriggerMiddleware(req, res, next) {
    const path = normalizePath(req.originalUrl || req.path || "");
    const matched = matchHrEmailEvent(req.method, path, req.body);
    if (!matched) {
        next();
        return;
    }
    const originalJson = res.json.bind(res);
    res.json = ((payload) => {
        // Only auto-trigger when the HR mutation succeeded
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const tenantId = req.user?.tenantId;
            if (tenantId) {
                const resData = payload?.data ?? payload ?? {};
                const reqBody = req.body ?? {};
                void (async () => {
                    try {
                        const employeeId = resData?.employeeId ||
                            resData?.employee?.id ||
                            reqBody?.employeeId ||
                            null;
                        const contact = employeeId
                            ? await (0, hr_workflow_email_service_1.resolveEmployeeContact)(tenantId, String(employeeId))
                            : null;
                        const toEmail = contact?.email ||
                            resData?.email ||
                            resData?.candidate?.email ||
                            resData?.employee?.email ||
                            reqBody?.email ||
                            req.user?.email ||
                            "";
                        if (!toEmail)
                            return;
                        const extracted = matched.extractVars(reqBody, resData);
                        await (0, hr_workflow_email_service_1.dispatchHrWorkflowEmail)({
                            tenantId,
                            eventKey: matched.eventKey,
                            toEmail,
                            variables: {
                                employee_name: contact?.name || extracted.employee_name || extracted.user_name || "Team Member",
                                employee_code: contact?.employeeCode || extracted.employee_code || "",
                                employee_email: contact?.email || toEmail,
                                recipient_name: contact?.name || req.user?.email || "Team Member",
                                updated_date: new Date().toISOString().slice(0, 10),
                                ...extracted,
                            },
                        });
                    }
                    catch (err) {
                        console.warn(`[HrEmailAutoTrigger] Background dispatch error (${matched.eventKey}):`, err?.message);
                    }
                })();
            }
        }
        return originalJson(payload);
    });
    next();
}
