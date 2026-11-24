import { rawPrisma } from "../prisma";
import { NotificationService } from "../services/notification.service";

function getTodayDateBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return { start, end, dateKey, now };
}

async function resolveComplaintRecipientUserIds(tenantId: string, assignedInvestigatorId?: string | null): Promise<string[]> {
  const userIds = new Set<string>();

  if (assignedInvestigatorId) {
    const assignedEmp = await rawPrisma.employee.findFirst({
      where: { id: assignedInvestigatorId, tenantId },
      select: { userId: true },
    });
    if (assignedEmp?.userId) {
      userIds.add(assignedEmp.userId);
    }
  }

  // Also notify HR Admins / Managers for this tenant
  const hrUserRoles = await (rawPrisma as any).userRole.findMany({
    where: {
      tenantId,
      role: {
        name: { in: ["admin", "tenant_admin", "hr_admin", "hr_manager", "compliance_admin"] },
      },
    },
    select: { userId: true },
    take: 25,
  }).catch(() => []);

  for (const ur of hrUserRoles) {
    if (ur?.userId) userIds.add(ur.userId);
  }

  return Array.from(userIds);
}

/**
 * Dispatches an in-app notification for a single complaint if its followUpDate is today.
 * Uses NotificationService idempotency (eventId + reminderId) so it never duplicates on the same day.
 */
export async function dispatchComplaintFollowUpNotificationIfDueToday(complaint: {
  id: string;
  tenantId: string;
  ticketCode?: string | null;
  subject: string;
  followUpDate?: Date | string | null;
  followUpAction?: string | null;
  assignedInvestigatorId?: string | null;
  status?: string | null;
}): Promise<number> {
  if (!complaint.followUpDate) return 0;
  if ((complaint.status || "").toLowerCase() === "dismissed") return 0;

  const { start, end, dateKey } = getTodayDateBounds();
  const fDate = new Date(complaint.followUpDate);
  if (isNaN(fDate.getTime()) || fDate < start || fDate > end) {
    return 0;
  }

  const recipients = await resolveComplaintRecipientUserIds(
    complaint.tenantId,
    complaint.assignedInvestigatorId
  );

  let sent = 0;
  for (const userId of recipients) {
    try {
      await NotificationService.createNotification({
        tenantId: complaint.tenantId,
        userId,
        type: "COMPLAINT_FOLLOWUP_REMINDER",
        title: `Follow-up Due Today: ${complaint.subject}`,
        message: complaint.followUpAction
          ? `Scheduled follow-up (${complaint.ticketCode || "Complaint"}): ${complaint.followUpAction}`
          : `Complaint "${complaint.subject}" (${complaint.ticketCode || "Case"}) has a follow-up scheduled for today.`,
        actionUrl: "/hr/lifecycle/complaints",
        metadata: {
          eventId: complaint.id,
          reminderId: `complaint-followup-${dateKey}`,
          complaintId: complaint.id,
          ticketCode: complaint.ticketCode || null,
          followUpDate: dateKey,
        },
      });
      sent += 1;
    } catch (err: any) {
      console.warn("[ComplaintFollowUpCron] Failed to notify user:", userId, err?.message);
    }
  }
  return sent;
}

/**
 * Scheduled daily morning office-time job (09:00 local time) to trigger in-app
 * notifications for all complaints with a follow-up date scheduled for today.
 */
export async function runComplaintFollowUpReminderCron(): Promise<{
  checked: number;
  notificationsSent: number;
}> {
  const { start, end } = getTodayDateBounds();

  const dueComplaints = await (rawPrisma.employeeComplaint as any).findMany({
    where: {
      followUpDate: {
        gte: start,
        lte: end,
      },
      status: { not: "dismissed" },
    },
    select: {
      id: true,
      tenantId: true,
      ticketCode: true,
      subject: true,
      followUpDate: true,
      followUpAction: true,
      assignedInvestigatorId: true,
      status: true,
    },
  });

  let notificationsSent = 0;
  for (const c of dueComplaints) {
    notificationsSent += await dispatchComplaintFollowUpNotificationIfDueToday(c);
  }

  return {
    checked: dueComplaints.length,
    notificationsSent,
  };
}
