# MASTERHRMS — Phase P7 Discovery and Architecture Audit

## 1. Executive Summary
Phase P7 authorizes the comprehensive implementation of four enterprise operational domains:
1. **Training (TR):** Employee training records, sessions, programs, and training types.
2. **Assets (AST):** Asset management, assignment, digital acknowledgement, maintenance, requests, and depreciation.
3. **Meetings (COM):** Corporate meeting scheduling with conflict detection, conference rooms, types, and action item tracking.
4. **Documents (DOC):** Document repository, employee contracts, contract types & templates, policy acknowledgements, and letters center.

This audit establishes the exact baseline in `server/prisma/schema.prisma`, existing REST endpoints, route files, navigation registry, and test suites to ensure 100% preservation of P0–P6 functionality and fail-closed multi-tenancy.

---

## 2. Existing Schema & Model Audit

| Domain | Model Name | Table Name | Status | Audit Findings & Required Action |
|---|---|---|---|---|
| **Training** | `TrainingCourse` | `training_courses` | Exists | Course catalog model. Used for training programs. Has title, category, instructor, durationHours, isMandatory. |
| **Training** | `CourseModule` | `course_modules` | Exists | Modules within training courses. |
| **Training** | `CourseEnrollment` | `course_enrollments` | Exists | Maps employee to course. Has progressPercent, score, status, certificateId. |
| **Training** | `TrainingTypeMaster` | `training_types` | **Missing** | Need model for training classifications (Technical, Compliance, Leadership, Soft Skills). |
| **Training** | `TrainingSession` | `training_sessions` | **Missing** | Need scheduled session model with dates, room/location, capacity, trainer, and status. |
| **Training** | `SessionAttendance` | `session_attendances` | **Missing** | Need model tracking employee session registrations and attendance status. |
| **Assets** | `AssetCategory` | `asset_categories` | Exists | Category taxonomy with name, slug, prefix, icon. |
| **Assets** | `Asset` | `assets` | Exists | Core asset table. Needs depreciation attributes: `usefulLifeMonths`, `salvageValue`, `depreciationMethod`. |
| **Assets** | `AssetAssignment` | `asset_assignments` | Exists | Assignment log. Needs `acknowledgedAt`, `acknowledgementSignature`, and `tenantId` field for fail-closed isolation. |
| **Assets** | `AssetRequest` | `asset_requests` | Exists | Equipment request queue. Has priority, status, purpose. |
| **Assets** | `AssetMaintenance` | `asset_maintenance` | Exists | Service & maintenance log. Needs `tenantId` field. |
| **Assets** | `AssetDepreciationSchedule` | `asset_depreciation_schedules` | **Missing** | Model to persist calculated monthly/annual depreciation book values. |
| **Meetings** | `MeetingRoom` | `meeting_rooms` | **Missing** | Conference rooms / meeting spaces with capacity, amenities, location, active status. |
| **Meetings** | `MeetingTypeMaster` | `meeting_types` | **Missing** | Meeting types taxonomy (All-Hands, Standup, 1-on-1, Board, Review). |
| **Meetings** | `Meeting` | `meetings` | **Missing** | Core meetings table with start/end time, room, organizer, agenda, status. |
| **Meetings** | `MeetingAttendee` | `meeting_attendees` | **Missing** | Attendee mappings with RSVP status (pending, accepted, declined, tentative). |
| **Meetings** | `MeetingActionItem` | `meeting_action_items` | **Missing** | Action items with assignee, due date, priority, and completion status. |
| **Documents** | `CompanyDocument` | `company_documents` | Exists | Vault documents with category, fileUrl, signature, status. |
| **Documents** | `ContractType` | `contract_types` | Exists | Contract classifications (Full-Time, Fixed-Term, Consultant, NDA). |
| **Documents** | `EmployeeContract` | `employee_contracts` | Exists | Individual employee contracts with term dates, salary, status. |
| **Documents** | `DocumentRequest` | `document_requests` | Exists | Employee requests for official letters (Bonafide, Experience, NOC, Salary). |
| **Documents** | `DocumentCategory` | `document_categories` | **Missing** | Document category taxonomy. |
| **Documents** | `DocumentTemplate` | `document_templates` | **Missing** | Reusable templates for contracts, policies, and generated letters. |
| **Documents** | `DocumentAcknowledgement` | `document_acknowledgements` | **Missing** | Policy sign-off audit records (employee, documentId, acknowledgedAt, ipAddress). |
| **Documents** | `GeneratedLetter` | `generated_letters` | **Missing** | Generated HR letters with merged tokens, html body, and issuer. |

---

## 3. Route Inventory Audit & Mapping

### HR Portal Routes (`/hr/*`)

| Route ID | Canonical Path | Description | Existing State | Target Action |
|---|---|---|---|---|
| `HR-TR-01` | `/hr/training/employee-trainings` | Employee training records & progress | Legacy flat `/training` | Create canonical page with filter toolbar & certificate tracker |
| `HR-TR-02` | `/hr/training/sessions` | Training session schedule & cohorts | Subtab in legacy | Create dedicated scheduler with capacity tracking & status |
| `HR-TR-03` | `/hr/training/programs` | Course / program catalog | Subtab in legacy | Create dedicated program builder & module editor |
| `HR-TR-04` | `/hr/training/types` | Training types master | Missing | Create master data page |
| `HR-AST-01` | `/hr/assets/dashboard` | Asset dashboard | Legacy flat `/asset-dashboard` | Create canonical stat overview & allocation metrics |
| `HR-AST-02` | `/hr/assets` | Asset registry | Legacy flat `/assets` | Create canonical asset table with assignment modal |
| `HR-AST-03` | `/hr/assets/depreciation` | Asset depreciation | Legacy mock | Create depreciation calculation engine & book value table |
| `HR-AST-04` | `/hr/assets/types` | Asset types / category master | In legacy `/assets` | Create dedicated category management page |
| `HR-AST-05` | `/hr/assets/requests-maintenance` | Asset requests & maintenance | Subtabs in legacy | Create unified workflow page for requests and repairs |
| `HR-COM-01` | `/hr/meetings` | Meetings schedule & conflict engine | Missing | Create meeting scheduler with room/attendee conflict validation |
| `HR-COM-02` | `/hr/meetings/action-items` | Corporate action items queue | Missing | Create action item tracker with owner, priority, status |
| `HR-COM-03` | `/hr/meetings/types` | Meeting types master | Missing | Create master taxonomy page |
| `HR-COM-04` | `/hr/meetings/rooms` | Meeting rooms master | Missing | Create meeting rooms management page with amenities |
| `HR-DOC-01` | `/hr/documents` | Document vault & policy repository | Legacy flat `/documents` | Create canonical document repository with secure uploads |
| `HR-DOC-02` | `/hr/documents/contracts` | Employee contracts management | Missing | Create contract management queue with signature tracking |
| `HR-DOC-03` | `/hr/documents/acknowledgements` | Mandatory policy sign-off campaigns | Missing | Create acknowledgement campaign monitor & compliance % |
| `HR-DOC-04` | `/hr/documents/contract-templates` | Contract legal templates | Missing | Create contract template builder with token placeholders |
| `HR-DOC-05` | `/hr/documents/document-templates` | General document templates | Missing | Create document template catalog |
| `HR-DOC-06` | `/hr/documents/contract-types` | Contract types master | Missing | Create contract type master page |
| `HR-DOC-07` | `/hr/documents/categories` | Document categories master | Missing | Create category taxonomy page |
| `HR-DOC-08` | `/hr/documents/letters` | Letters center | Missing | Create letter generator with token merge & print/download |

### Employee Self-Service Routes (`/me/*`)

| Route ID | Canonical Path | Description | Existing State | Target Action |
|---|---|---|---|---|
| `ME-TR-01` | `/me/training/trainings` | My assigned trainings & progress | In profile tab | Create dedicated ESS training hub with module completion |
| `ME-TR-02` | `/me/training/sessions` | Upcoming sessions & registration | Missing | Create self-registration session calendar |
| `ME-TR-03` | `/me/training/programs` | Browse training catalog | Missing | Create course catalog browsing page |
| `ME-AST-01` | `/me/assets/dashboard` | My assigned assets summary | Missing | Create asset overview cards & custody status |
| `ME-AST-02` | `/me/assets` | My assets & digital acknowledgement | Missing | Create asset acknowledgement sign-off & condition log |
| `ME-AST-03` | `/me/assets/requests` | Request equipment / repair | Missing | Create equipment request & repair ticket submission |
| `ME-COM-01` | `/me/meetings` | My meetings & RSVP | Missing | Create my meetings calendar with accept/decline actions |
| `ME-COM-02` | `/me/meetings/action-items` | My assigned action items | Missing | Create my action items task list with status toggle |
| `ME-DOC-01` | `/me/documents` | Company policies & guidelines | Missing | Create policy library with download & view |
| `ME-DOC-02` | `/me/documents/contracts` | My employment contracts & e-sign | Missing | Create contract viewer with signature modal |
| `ME-DOC-03` | `/me/documents/acknowledgements` | Mandatory policy sign-off queue | Missing | Create pending acknowledgement sign-off workflow |
| `ME-DOC-04` | `/me/documents/requests` | Request HR letters | In legacy API | Create official letter request form (Bonafide, NOC, etc.) |

---

## 4. Multi-Tenant Isolation & Fail-Closed Protection
All newly introduced tenant-owned models will be registered in `DIRECT_TENANT_MODELS` in `server/src/config/tenant-models.config.ts`.
Any unscoped queries are strictly rejected by the tenant proxy facade.

---

## 5. Summary of Architecture Decision
1. **Reuse Existing Models Where Valid:** Reuse `TrainingCourse`, `CourseEnrollment`, `Asset`, `AssetCategory`, `AssetAssignment`, `AssetRequest`, `AssetMaintenance`, `CompanyDocument`, `ContractType`, `EmployeeContract`, `DocumentRequest`.
2. **Add Missing Models:** Add `TrainingTypeMaster`, `TrainingSession`, `SessionAttendance`, `AssetDepreciationSchedule`, `MeetingRoom`, `MeetingTypeMaster`, `Meeting`, `MeetingAttendee`, `MeetingActionItem`, `DocumentCategory`, `DocumentTemplate`, `DocumentAcknowledgement`, `GeneratedLetter`.
3. **Mount Canonical REST Routers:**
   - `hrTrainingRouter` & `meTrainingRouter` (`/api/v1/hr/training`, `/api/v1/me/training`)
   - `hrAssetsRouter` & `meAssetsRouter` (`/api/v1/hr/assets`, `/api/v1/me/assets`)
   - `hrMeetingsRouter` & `meMeetingsRouter` (`/api/v1/hr/meetings`, `/api/v1/me/meetings`)
   - `hrDocumentsRouter` & `meDocumentsRouter` (`/api/v1/hr/documents`, `/api/v1/me/documents`)
