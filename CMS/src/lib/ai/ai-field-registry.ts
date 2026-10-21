/**
 * MasterHRMS — Universal AI Field Registry & Security Policies
 * 
 * Defines all explicitly verified text-entry fields supported by the
 * Universal AI Assistant, along with strict sensitive data exclusion rules.
 */

export interface SupportedAiField {
  moduleSlug: string;
  formId: string;
  fieldKey: string;
  defaultLabel: string;
  placeholderHint?: string;
  maxLength?: number;
}

/**
 * Inventory of explicitly tested & supported form fields across the enterprise application.
 */
export const VERIFIED_AI_FIELDS: SupportedAiField[] = [
  // 1. Announcements
  {
    moduleSlug: "announcements",
    formId: "announcement-form",
    fieldKey: "title",
    defaultLabel: "Announcement Title",
    placeholderHint: "Headline or core topic",
    maxLength: 150,
  },
  {
    moduleSlug: "announcements",
    formId: "announcement-form",
    fieldKey: "body",
    defaultLabel: "Announcement Body",
    placeholderHint: "Detailed announcement text",
    maxLength: 1000,
  },

  // 2. Recruitment
  {
    moduleSlug: "recruitment",
    formId: "job-posting-form",
    fieldKey: "description",
    defaultLabel: "Job Description",
    placeholderHint: "Role summary and responsibilities",
    maxLength: 1000,
  },
  {
    moduleSlug: "recruitment",
    formId: "job-posting-form",
    fieldKey: "requirements",
    defaultLabel: "Job Requirements & Qualifications",
    placeholderHint: "Hard and soft skill requirements",
    maxLength: 800,
  },
  {
    moduleSlug: "recruitment",
    formId: "job-posting-form",
    fieldKey: "benefits",
    defaultLabel: "Employee Perks & Benefits",
    placeholderHint: "Growth opportunities and perks",
    maxLength: 500,
  },
  {
    moduleSlug: "recruitment",
    formId: "offer-letter-form",
    fieldKey: "body",
    defaultLabel: "Offer Letter Template Body",
    placeholderHint: "Formal employment offer details",
    maxLength: 1500,
  },

  // 3. Training & Development
  {
    moduleSlug: "training",
    formId: "training-program-form",
    fieldKey: "description",
    defaultLabel: "Training Course Overview",
    placeholderHint: "Curriculum and target objectives",
    maxLength: 1000,
  },

  // 4. Performance & Appraisals
  {
    moduleSlug: "performance",
    formId: "review-form",
    fieldKey: "comments",
    defaultLabel: "Manager Review Feedback",
    placeholderHint: "Constructive feedback and guidance",
    maxLength: 800,
  },

  // 5. OKR & Goals
  {
    moduleSlug: "okr",
    formId: "goal-form",
    fieldKey: "description",
    defaultLabel: "Strategic Goal / Objective Description",
    placeholderHint: "SMART milestones and key results",
    maxLength: 600,
  },

  // 6. Helpdesk & Support
  {
    moduleSlug: "support",
    formId: "ticket-reply-form",
    fieldKey: "reply",
    defaultLabel: "Helpdesk Ticket Resolution Reply",
    placeholderHint: "Customer issue resolution steps",
    maxLength: 1000,
  },

  // 7. Planning & Strategy
  {
    moduleSlug: "planning",
    formId: "charter-form",
    fieldKey: "description",
    defaultLabel: "Strategic Charter Description",
    placeholderHint: "Initiative scope and pillars",
    maxLength: 1000,
  },
  {
    moduleSlug: "planning",
    formId: "charter-form",
    fieldKey: "organisational_effects",
    defaultLabel: "Organisational Effects & Change Impact",
    placeholderHint: "Operational and cultural shifts",
    maxLength: 800,
  },
  {
    moduleSlug: "planning",
    formId: "charter-form",
    fieldKey: "goal_description",
    defaultLabel: "Strategic Objectives & KPIs",
    placeholderHint: "Business metrics and targets",
    maxLength: 800,
  },
  {
    moduleSlug: "planning",
    formId: "challenge-form",
    fieldKey: "explanation",
    defaultLabel: "Strategic Challenge Problem Statement",
    placeholderHint: "Market challenge definition",
    maxLength: 800,
  },
];

/**
 * Strict exclusion patterns: Never allow AI generation helpers on sensitive,
 * authentication, financial, or statutory entry controls.
 */
export const DISALLOWED_SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /credential/i,
  /pan/i,
  /aadhaar/i,
  /ssn/i,
  /social_security/i,
  /tax/i,
  /salary/i,
  /statutory/i,
  /payroll/i,
  /bank/i,
  /account_no/i,
  /routing/i,
  /ifsc/i,
  /cvv/i,
  /pin/i,
  /otp/i,
  /auth_code/i,
  /mfa/i,
  /credit_card/i,
  /card_number/i,
];

/**
 * Evaluates whether a target input or textarea field is eligible for AI generation.
 */
export function isFieldEligibleForAi(
  moduleSlug: string,
  fieldKey: string,
  options?: { inputType?: string; fieldLabel?: string; allowAnyVerified?: boolean }
): { eligible: boolean; reason?: string; fieldDef?: SupportedAiField } {
  // 1. Hard block password and secret input types
  if (options?.inputType === "password") {
    return { eligible: false, reason: "Password fields are strictly excluded from AI generation" };
  }

  // 2. Hard block sensitive naming patterns
  const candidateStrings = [fieldKey, options?.fieldLabel || ""].filter(Boolean);
  for (const str of candidateStrings) {
    for (const pattern of DISALLOWED_SENSITIVE_FIELD_PATTERNS) {
      if (pattern.test(str)) {
        return {
          eligible: false,
          reason: `Sensitive field pattern matching '${pattern.source}' is strictly excluded`,
        };
      }
    }
  }

  // 3. Match against explicitly verified fields inventory
  const match = VERIFIED_AI_FIELDS.find(
    (f) => f.moduleSlug.toLowerCase() === moduleSlug.toLowerCase() && f.fieldKey.toLowerCase() === fieldKey.toLowerCase()
  );

  if (match) {
    return { eligible: true, fieldDef: match };
  }

  // 4. If allowAnyVerified is false, reject unverified field
  return {
    eligible: false,
    reason: `Field '${moduleSlug}.${fieldKey}' is not in the verified AI registry`,
  };
}
