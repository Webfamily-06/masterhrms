# MASTERHRMS — PHASE P5 RECRUITMENT & TALENT
## Pre-Implementation Discovery, Codebase Audit & Reconciliation Report

**Date:** October 7, 2026  
**Status:** AUDIT COMPLETE — BUSINESS RULES LOCKED — PROCEED TO IMPLEMENTATION  
**Author:** Antigravity Full-Stack Architect  

---

### 1. Executive Audit Overview

Phase P5 covers the complete **Recruitment, Applicant Tracking System (ATS), Talent Acquisition, Onboarding, and Candidate-to-Employee Conversion** lifecycle.

The primary authorized lifecycle is:
```
Job Posting → Application / Candidate → Screening → Assessment → Interview Rounds → Offer → Acceptance → Onboarding → Employee Conversion
```

This audit reconciles all 18 canonical HR panel routes (`HR-REC-01` through `HR-REC-18`), 5 Employee Self-Service routes (`ME-REC-01` through `ME-REC-05`), and the public career portal (`/careers`).

---

### 2. Route Audit & Disposition Matrix

| Route ID | Route Path | Current Status | Disposition | Audit Finding & Action Plan |
|---|---|---|---|---|
| **HR-REC-01** | `/hr/recruitment/job-postings` | PT | **REFACTOR & EXTEND** | Legacy tab in `/recruitment`; build dedicated page with lifecycle (`draft` → `pending_approval` → `published` → `on_hold` → `closed`), headcount checks, department/designation linkages, salary bands, and publication channel toggles. |
| **HR-REC-02** | `/hr/recruitment/candidates` | PT | **REFACTOR & EXTEND** | Legacy candidate table in `/recruitment`; implement full Candidate Directory, Candidate 360 profile drawer with tabs (Details, Timeline, Resume, Interviews, Offers, Onboarding, Notes), duplicate warning banner, recruiter assignment, and stage filtering. |
| **HR-REC-03** | `/hr/recruitment/interviews` | PT | **REFACTOR & EXTEND** | Legacy single interview endpoint; implement interview schedule board, interviewer conflict detection, round assignment, and 5-tier scorecard submission modal (`STRONG_YES` to `STRONG_NO`). |
| **HR-REC-04** | `/hr/recruitment/offers` | NS | **NEW IMPLEMENTATION** | Build authoritative Job Offers console linking Candidate + Job + CTC breakdown (P4 compatible) + approval workflow + template rendering + send/acceptance tracking. |
| **HR-REC-05** | `/hr/recruitment/candidate-onboarding` | NS | **NEW IMPLEMENTATION** | Pre-joining checklist tracker, document verification, background verification (BGV), IT asset request trigger, and 1-click **Candidate → Employee Conversion** calling P2 `EmployeeService.createEmployeeAtomic`. |
| **HR-REC-06** | `/hr/recruitment/assessments` | NS | **NEW IMPLEMENTATION** | Assessment management console with reusable question templates, candidate assignment, time limits, scoring, and auto-evaluation results. |
| **HR-REC-07** | `/hr/recruitment/onboarding-checklists` | NS | **NEW IMPLEMENTATION** | Master checklist template builder (name, target department/role, sequence, due offsets, mandatory items). |
| **HR-REC-08** | `/hr/recruitment/check-items` | NS | **NEW IMPLEMENTATION** | Master check-item library (Document Submission, BGV, Laptop Provisioning, Email Creation, NDA Sign-off). |
| **HR-REC-09** | `/hr/recruitment/career-site` | PT | **REFACTOR & EXTEND** | Administrative management portal for public career site: company bio, hero banner, published job visibility controls, and application intake analytics. |
| **HR-REC-10** | `/hr/recruitment/job-categories` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Job Categories (Engineering, Sales, Operations, HR, Finance) with tenant isolation, search, sort, and modal CRUD. |
| **HR-REC-11** | `/hr/recruitment/job-types` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Job Types (Full-time, Part-time, Contract, Internship). |
| **HR-REC-12** | `/hr/recruitment/job-locations` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Job Locations (City, State, Country, Remote flag, Office address). |
| **HR-REC-13** | `/hr/recruitment/candidate-sources` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Candidate Sources (Career Site, LinkedIn, Referral, Campus, Direct, Vendor). |
| **HR-REC-14** | `/hr/recruitment/interview-types` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Interview Types (Screening Call, Technical Round, System Design, Culture Fit, HR Round). |
| **HR-REC-15** | `/hr/recruitment/interview-rounds` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Interview Round Templates (Sequence, round name, default duration, evaluation rubric). |
| **HR-REC-16** | `/hr/recruitment/offer-templates` | NS | **NEW IMPLEMENTATION** | Offer letter template builder with dynamic token placeholders (`{{CANDIDATE_NAME}}`, `{{DESIGNATION}}`, `{{ANNUAL_CTC}}`, `{{JOINING_DATE}}`). |
| **HR-REC-17** | `/hr/recruitment/pipeline` | NS | **NEW IMPLEMENTATION** | Interactive Kanban Pipeline Board with drag-and-drop / select-to-move stages (`applied`, `screening`, `assessment`, `interview`, `offered`, `hired`, `rejected`) and candidate funnel metrics. |
| **HR-REC-18** | `/hr/recruitment/referrals` | PT | **REFACTOR & EXTEND** | Employee referral review queue linking referee candidates, tracking candidate hiring progression, and logging referral credits. |
| **ME-REC-01** | `/me/recruitment/job-postings` | NS | **NEW IMPLEMENTATION** | Employee internal job board displaying open company vacancies, internal application button, and referral submission modal. |
| **ME-REC-02** | `/me/recruitment/interviews` | NS | **NEW IMPLEMENTATION** | Employee interviewer portal displaying scheduled candidate interviews assigned to the logged-in user, meeting links, resume preview, and scorecard feedback submission. |
| **ME-REC-03** | `/me/recruitment/onboarding` | NS | **NEW IMPLEMENTATION** | New hire self-onboarding portal showing pre-joining checklist, document upload inputs, profile verification, and completion progress bar. |
| **ME-REC-04** | `/me/recruitment/assessments` | NS | **NEW IMPLEMENTATION** | Candidate/employee assessment portal for taking assigned skill evaluations, timed tests, and reviewing results. |
| **ME-REC-05** | `/me/recruitment/career` | NS | **NEW IMPLEMENTATION** | My Referrals & Career portal tracking employee submitted referrals, referee hiring stages, and referral status. |

---

### 3. Database Schema Audit & Model Extensions

The database already possesses baseline models for `JobPosting`, `JobCandidate`, `JobCandidateInterview`, `CampusCandidate`, and `EmployeeReferral`. To fulfill the complete P5 enterprise ATS lifecycle, we extend the schema with:

1. **Recruitment Masters:**
   - `JobCategory`: `id`, `tenantId`, `name`, `code`, `description`, `isActive`.
   - `JobType`: `id`, `tenantId`, `name`, `code`, `description`, `isActive`.
   - `JobLocation`: `id`, `tenantId`, `name`, `code`, `city`, `state`, `country`, `isRemote`, `address`, `isActive`.
   - `CandidateSource`: `id`, `tenantId`, `name`, `code`, `type`, `isActive`.
   - `InterviewTypeMaster`: `id`, `tenantId`, `name`, `code`, `description`, `defaultDurationMinutes`, `isActive`.
   - `InterviewRoundMaster`: `id`, `tenantId`, `name`, `sequence`, `interviewTypeId`, `description`, `isActive`.
   - `OfferTemplate`: `id`, `tenantId`, `name`, `code`, `bodyHtml`, `termsAndConditions`, `isActive`.
   - `OnboardingChecklistTemplate`: `id`, `tenantId`, `name`, `code`, `description`, `departmentId`, `targetRole`, `isActive`.
   - `OnboardingCheckItem`: `id`, `tenantId`, `templateId`, `title`, `description`, `category`, `isMandatory`, `dueOffsetDays`, `sequence`, `assigneeRole`.

2. **Assessments:**
   - `AssessmentTemplate`: `id`, `tenantId`, `title`, `code`, `description`, `timeLimitMinutes`, `passScore`, `questionsJson`, `isActive`.
   - `CandidateAssessment`: `id`, `tenantId`, `candidateId`, `templateId`, `jobPostingId`, `status`, `assignedAt`, `completedAt`, `score`, `totalScore`, `passed`, `responsesJson`, `evaluationNotes`, `evaluatorId`.

3. **Offers:**
   - `CandidateOffer`: `id`, `tenantId`, `candidateId`, `jobPostingId`, `designationId`, `departmentId`, `branchId`, `joiningDate`, `ctcStructureJson`, `annualCtc`, `monthlyGross`, `status`, `templateId`, `offerLetterHtml`, `approvedBy`, `approvedAt`, `sentAt`, `respondedAt`, `comments`.

4. **Candidate Onboarding:**
   - `CandidateOnboarding`: `id`, `tenantId`, `candidateId`, `offerId`, `templateId`, `joiningDate`, `status`, `dropReason`, `buddyId`, `hrOwnerId`, `itAccountCreated`, `bgvStatus`.
   - `CandidateOnboardingTask`: `id`, `tenantId`, `onboardingId`, `title`, `description`, `category`, `isMandatory`, `sequence`, `dueOffsetDays`, `status`, `documentUrl`, `verifiedBy`, `verifiedAt`, `notes`.

5. **Enhance `JobPosting` and `JobCandidate`:**
   - `JobPosting`: Add `jobCode`, `categoryId`, `typeId`, `locationId`, `designationId`, `branchId`, `hiringManagerId`, `recruiterId`, `approvedBy`, `approvedAt`, `publishedAt`.
   - `JobCandidate`: Add `sourceId`, `noticePeriodDays`, `currentCtc`, `skills`, `education`, `location`, `recruiterId`, `tags`, `duplicateOfId`.
   - `JobCandidateInterview`: Add `roundNumber`, `roundName`, `durationMinutes`, `recommendation`, `criteriaRatingsJson`.

All new models will be registered in `DIRECT_TENANT_MODELS` and `CHILD_DEPENDENT_MODELS` in `server/src/config/tenant-models.config.ts`.
