# MASTERHRMS — PHASE P5 RECRUITMENT & TALENT
## Business Rule Decisions & Policy Register

**Date:** October 7, 2026  
**Status:** LOCKED — OFFICIAL PRODUCT OWNER ALIGNED DOCTRINE  
**Author:** Antigravity Full-Stack Architect & Product Alignment  

---

### Official Decision Register

| ID | Domain | Business Rule / Policy Question | Decision & Approved Specification | Status |
|---|---|---|---|---|
| **P5-BR-001** | Job Posting | Approval & Headcount Validation | All new job postings start in `draft`. Transition to `published` requires approval if openings exceed 1 or budget is specified. Recruiter or HR Admin submits; HR Director / Department Head approves. Unapproved drafts cannot be published to the public career site. | **LOCKED** |
| **P5-BR-002** | Job Posting | Salary Bands & Compensation Range | `salaryMin` and `salaryMax` must be validated to ensure `salaryMin <= salaryMax`. When a `designationId` is selected, the posting validates against the designation salary band min/max if configured. | **LOCKED** |
| **P5-BR-003** | Candidate | Duplicate Detection & Merge Policy | Candidate duplication is evaluated by exact match on normalized `email` (primary) and `phone` (secondary). System warns the recruiter if an existing candidate is found. Recruiter can link the application to the existing candidate or merge records while preserving interview notes and evaluation history. | **LOCKED** |
| **P5-BR-004** | Pipeline | Stage Transition Rules & Rejection | Stage progression: `applied` → `screening` → `assessment` → `interview` → `offered` → `hired`. Candidates can move to `rejected`, `on_hold`, or `withdrawn` from any active stage. Moving to `rejected` strictly requires a mandatory rejection reason (e.g. `Skills Mismatch`, `Salary Mismatch`, `Failed Assessment`, `Interview Feedback`, `Candidate Withdrew`). | **LOCKED** |
| **P5-BR-005** | Assessments | Pass Criteria & Auto-Evaluation | Assessment templates define passing score percentage (default 60%). Multiple choice questions are auto-graded upon candidate test submission; descriptive questions require recruiter/evaluator manual grading. Passed tests update candidate score and enable interview progression. | **LOCKED** |
| **P5-BR-006** | Interviews | Calendar Conflict & Overlap Prevention | Before scheduling an interview, system checks interviewer calendar availability against existing interviews and punch schedules for that date/time window. Overlapping interviews for the same interviewer or candidate generate a scheduling conflict warning and block double-booking. | **LOCKED** |
| **P5-BR-007** | Interviews | Structured Scorecard & Recommendations | Interviewers submit structured evaluations using a 5-point recommendation scale: `STRONG_YES` (5), `YES` (4), `NEUTRAL` (3), `NO` (2), `STRONG_NO` (1), along with category scores (Technical Skills, Problem Solving, Culture Fit, Communication) from 1 to 5 and qualitative notes. Scorecards become immutable once submitted. | **LOCKED** |
| **P5-BR-008** | Offers | Offer Hierarchy & P4 Salary Integration | Candidate offers must link to Candidate, Job, Designation, Department, Branch, Joining Date, and CTC structure. Offer CTC components must match P4 Salary Component codes (`BASIC`, `HRA`, `SPECIAL`, etc.). Offers start as `draft`, require Finance/HR approval, transition to `sent`, and have an expiry window (default 7 days). | **LOCKED** |
| **P5-BR-009** | Onboarding | Pre-Joining Checklist & Document Collection | Offer acceptance automatically triggers a `CandidateOnboarding` record seeded from the role's `OnboardingChecklistTemplate`. Tasks include document submission (Photo, ID Proof, Address Proof, Degree, Relieving Letter, Payslips), background verification (BGV), and IT account creation. | **LOCKED** |
| **P5-BR-010** | Conversion | Candidate → Employee Conversion Gateway | **The most critical integration:** When an onboarding candidate is marked `ready_to_join` or `joined`, HR initiates 1-click conversion. The system transactional calls P2 `EmployeeService.createEmployeeAtomic` to provision the authoritative Employee record, User account, and initial organization linkages. On success, candidate is marked `isConvertedToEmployee = true`, `stage = 'hired'`, and `convertedEmployeeId` is stored. No second employee creation engine is created. | **LOCKED** |
| **P5-BR-011** | Referrals | Referral Tracking & Payroll Linkage | Employees can refer candidates via `/me/recruitment/job-postings` or `/hr/recruitment/referrals`. The referee candidate is linked to the referring employee ID. System tracks hiring progress (`pending` → `interviewing` → `hired`). Referral bonus payout is flagged as an approved payroll reimbursement/bonus item for P4 processing without guessing unapproved bonus payout rules. | **LOCKED** |
| **P5-BR-012** | Career Site | Public Visibility & Candidate Intake | Public `/careers` route displays only jobs where `status === 'published'`. Internal hiring team notes, budgets, recruiter assignments, and confidential fields are stripped from public responses. Career site applications create candidate records with `source = 'Career Site'` directly in the tenant's ATS pipeline. | **LOCKED** |

---

### Non-Invention Guarantee
All above rules are derived directly from the authorized MasterHRMS specification, standard enterprise HRMS ATS practices, and seamless backward-compatible linkages to P0 Architecture, P1 Platform Foundation, P2 Employee Service, P3 Attendance, and P4 Payroll.
