import { renderUniversalEmail, TEMPLATE_PLACEHOLDER_BRANDING } from "./email-design-system";

export interface CoreUniversalEmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: "Calendar" | "Tasks" | "Payroll";
  html_body: string;
  variables: string[];
}

export const UNIVERSAL_CORE_TENANT_TEMPLATES: CoreUniversalEmailTemplate[] = [
  {
    id: "calendar-event-notification",
    name: "Calendar Event & Reminder Notification",
    subject: "Calendar Event: {{eventTitle}}",
    category: "Calendar",
    variables: [
      "{{company_name}}",
      "{{recipientName}}",
      "{{eventTitle}}",
      "{{eventDate}}",
      "{{eventStartTime}}",
      "{{eventEndTime}}",
      "{{eventLocation}}",
      "{{eventCategory}}",
      "{{organizerName}}",
      "{{eventDescription}}",
      "{{reminderText}}",
      "{{calendarUrl}}",
    ],
    html_body: renderUniversalEmail(
      {
        id: "calendar-event-notification",
        subject: "Calendar Event: {{eventTitle}}",
        category: "Calendar",
        heroTitle: "{{eventTitle}}",
        heroSubtitle: "Event Schedule & Reminder",
        statusBadge: { label: "{{eventCategory}}", tone: "info" },
        greeting: "Hello {{recipientName}},",
        messages: ["{{reminderText}}"],
        detailsTitle: "Event Details",
        details: [
          { label: "Date", value: "{{eventDate}}" },
          { label: "Time", value: "{{eventStartTime}} – {{eventEndTime}}" },
          { label: "Location", value: "{{eventLocation}}" },
          { label: "Organizer", value: "{{organizerName}}" },
          { label: "Description", value: "{{eventDescription}}" },
        ],
        primaryAction: {
          label: "Open in Calendar",
          url: "{{calendarUrl}}",
          tone: "primary",
        },
        supportingNote:
          "This calendar reminder was sent on behalf of {{company_name}}. Update your attendance directly in the workspace calendar.",
      },
      TEMPLATE_PLACEHOLDER_BRANDING
    ),
  },
  {
    id: "todo-task-created",
    name: "Task Created — New Task Assigned",
    subject: "New Task Assigned: {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{start_date}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: renderUniversalEmail(
      {
        id: "todo-task-created",
        subject: "New Task Assigned: {{task_title}}",
        category: "Tasks",
        heroTitle: "New Task Assigned",
        heroSubtitle: "{{task_title}}",
        statusBadge: { label: "{{priority}} Priority", tone: "info" },
        greeting: "Hello {{assignee_name}},",
        messages: [
          "A new actionable deliverable has been assigned to you by <strong>{{assigner_name}}</strong>.",
        ],
        detailsTitle: "Task Summary",
        details: [
          { label: "Task", value: "{{task_title}}" },
          { label: "Priority", value: "{{priority}}", badgeTone: "info" },
          { label: "Start Date", value: "{{start_date}}" },
          { label: "Due Date", value: "{{due_date}}" },
          { label: "Assigned By", value: "{{assigner_name}}" },
          { label: "Description", value: "{{task_description}}" },
        ],
        primaryAction: {
          label: "Open Task in Workspace",
          url: "{{task_url}}",
          tone: "primary",
        },
        supportingNote:
          "This task notification was sent on behalf of {{company_name}}.",
      },
      TEMPLATE_PLACEHOLDER_BRANDING
    ),
  },
  {
    id: "todo-task-assigned",
    name: "Task Reassigned / Additional Assignment",
    subject: "Task Assigned: {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: renderUniversalEmail(
      {
        id: "todo-task-assigned",
        subject: "Task Assigned: {{task_title}}",
        category: "Tasks",
        heroTitle: "Task Assignment Update",
        heroSubtitle: "{{task_title}}",
        statusBadge: { label: "{{priority}} Priority", tone: "info" },
        greeting: "Hello {{assignee_name}},",
        messages: [
          "You have been added as an assignee to the following task by <strong>{{assigner_name}}</strong>.",
        ],
        detailsTitle: "Task Details",
        details: [
          { label: "Task", value: "{{task_title}}" },
          { label: "Priority", value: "{{priority}}", badgeTone: "info" },
          { label: "Due Date", value: "{{due_date}}" },
          { label: "Assigned By", value: "{{assigner_name}}" },
          { label: "Description", value: "{{task_description}}" },
        ],
        primaryAction: {
          label: "View Assigned Task",
          url: "{{task_url}}",
          tone: "primary",
        },
        supportingNote:
          "This task assignment update was sent on behalf of {{company_name}}.",
      },
      TEMPLATE_PLACEHOLDER_BRANDING
    ),
  },
  {
    id: "todo-task-reminder-2-days",
    name: "Task Reminder — Due in 2 Days",
    subject: "Reminder: Task due in 2 days — {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: renderUniversalEmail(
      {
        id: "todo-task-reminder-2-days",
        subject: "Reminder: Task due in 2 days — {{task_title}}",
        category: "Tasks",
        heroTitle: "Upcoming Task Deadline",
        heroSubtitle: "Due in 2 days — {{due_date}}",
        statusBadge: { label: "Due in 2 Days", tone: "warning" },
        greeting: "Hello {{assignee_name}},",
        messages: [
          "This is a courtesy reminder that your assigned task is due in <strong>2 days</strong> on <strong>{{due_date}}</strong>.",
        ],
        detailsTitle: "Task Summary",
        details: [
          { label: "Task", value: "{{task_title}}" },
          { label: "Target Due", value: "{{due_date}}" },
          { label: "Priority", value: "{{priority}}", badgeTone: "warning" },
          { label: "Assigned By", value: "{{assigner_name}}" },
          { label: "Description", value: "{{task_description}}" },
        ],
        reminder: {
          title: "Deadline Approaching",
          message:
            "Please review your checklist and update task progress before {{due_date}}.",
          tone: "warning",
        },
        primaryAction: {
          label: "Review & Complete Task",
          url: "{{task_url}}",
          tone: "primary",
        },
      },
      TEMPLATE_PLACEHOLDER_BRANDING
    ),
  },
  {
    id: "todo-task-reminder-1-day",
    name: "Task Reminder — Due Tomorrow",
    subject: "Urgent Reminder: Task due tomorrow — {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: renderUniversalEmail(
      {
        id: "todo-task-reminder-1-day",
        subject: "Urgent Reminder: Task due tomorrow — {{task_title}}",
        category: "Tasks",
        heroTitle: "Task Due Tomorrow",
        heroSubtitle: "Final 24-hour reminder — {{due_date}}",
        statusBadge: { label: "Due Tomorrow", tone: "danger" },
        greeting: "Hello {{assignee_name}},",
        messages: [
          "Your assigned task is due <strong>tomorrow</strong> on <strong>{{due_date}}</strong>. Please ensure all deliverables and checklists are finalized.",
        ],
        detailsTitle: "Task Summary",
        details: [
          { label: "Task", value: "{{task_title}}" },
          { label: "Due Date", value: "{{due_date}}" },
          { label: "Priority", value: "{{priority}}", badgeTone: "danger" },
          { label: "Assigned By", value: "{{assigner_name}}" },
          { label: "Description", value: "{{task_description}}" },
        ],
        reminder: {
          title: "Action Required Within 24 Hours",
          message:
            "Complete this deliverable before the deadline to avoid escalation.",
          tone: "danger",
        },
        primaryAction: {
          label: "Complete Task Now",
          url: "{{task_url}}",
          tone: "danger",
        },
      },
      TEMPLATE_PLACEHOLDER_BRANDING
    ),
  },
  {
    id: "et-2",
    name: "Payslip Generated Notification",
    subject: "Your Monthly Payslip for {{month}} is Ready",
    category: "Payroll",
    variables: [
      "{{company_name}}",
      "{{employee_name}}",
      "{{month}}",
      "{{net_pay}}",
      "{{payslip_url}}",
    ],
    html_body: renderUniversalEmail(
      {
        id: "et-2",
        subject: "Your Monthly Payslip for {{month}} is Ready",
        category: "Payroll",
        heroTitle: "Monthly Payslip Ready",
        heroSubtitle: "Payroll statement for {{month}}",
        statusBadge: { label: "Published", tone: "success" },
        greeting: "Hello {{employee_name}},",
        messages: [
          "Your official salary payslip for <strong>{{month}}</strong> has been generated and is now available to download in your employee portal.",
        ],
        detailsTitle: "Payslip Summary",
        details: [
          { label: "Employee", value: "{{employee_name}}" },
          { label: "Pay Period", value: "{{month}}" },
          { label: "Net Disbursed Pay", value: "<strong>{{net_pay}}</strong>" },
        ],
        primaryAction: {
          label: "Download Payslip",
          url: "{{payslip_url}}",
          tone: "primary",
        },
        supportingNote:
          "This is a confidential payroll statement issued by {{company_name}}. Contact HR or Payroll if you notice any discrepancy.",
      },
      TEMPLATE_PLACEHOLDER_BRANDING
    ),
  },
];
