# MASTERHRMS — P3-A: Database Design & Migration Report

**Project:** MASTERHRMS (`Webfamily-06/masterhrms`)  
**Database:** Supabase PostgreSQL (`ofzbhbcnizyegroggkxl`, region `ap-south-1`)  
**Prisma Schema:** `server/prisma/schema.prisma`  
**Migration File:** `server/prisma/migrations/20261115000000_p3a_leave_encashment_compoff/migration.sql`  

---

## 1. Migration Safety & Non-Destructive Verification

- **Execution Method:** Verified additive SQL executed via `./server/node_modules/.bin/prisma db execute` followed by `./server/node_modules/.bin/prisma validate` and `./server/node_modules/.bin/prisma generate`.
- **Zero Destructive Operations:** No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `db push --force-reset`, or destructive type casts were used.
- **Pre/Post Migration Row Count Audit:**

| Table | Pre-Migration Rows | Post-Migration Rows | Status |
|---|---:|---:|---|
| `tenants` | 265 | 265 | Preserved |
| `leave_types` | 30 | 30 | Preserved |
| `leave_policies` | 11 | 11 | Preserved |
| `leave_requests` | 22 | 22 | Preserved |
| `leave_ledger_entries` | 137 | 137 | Preserved |
| `leave_encashment_requests` | 0 | 0 | Extended additively |
| `payroll_runs` | 4 | 4 | Preserved |
| `payslips` | 125 | 125 | Preserved |
| `salary_components` | 10 | 10 | Preserved |
| `employee_salary_assignments` | 32 | 32 | Preserved |
| `leave_encashment_configs` | — | 0 | Created |
| `comp_off_configs` | — | 0 | Created |
| `comp_off_usage_allocations` | — | 0 | Created |
| `leave_encashment_compoff_events` | — | 0 | Created |

---

## 2. Database Models Reused vs. Added

### 2.1 Existing Models Reused
1. **`LeaveEncashmentRequest` (`leave_encashment_requests`):** Reused as the canonical unified request table (`type = 'ENCASHMENT' | 'COMP_OFF'`), preserving all 14 original columns (`id`, `tenant_id`, `employee_id`, `leave_type_id`, `type`, `days`, `reason`, `status`, `approver_id`, `approved_at`, `payroll_ref`, `worked_on_date`, `created_at`, `updated_at`) and widening `status` (`VARCHAR(20)` -> `VARCHAR(40)`) and `payroll_ref` (`VARCHAR(50)` -> `VARCHAR(100)`).
2. **`LeaveLedgerEntry` (`leave_ledger_entries`):** Reused as the single authoritative leave balance ledger (`ACCRUAL`, `CARRY_FORWARD`, `CREDIT`, `DEBIT`, `ENCASHMENT`, `EXPIRY`).
3. **`LeaveType`, `LeavePolicy`, `LeaveRequest`:** Reused for leave catalog, policy scoping, and Comp-Off utilization via existing Leave Applications.
4. **`Employee`, `Attendance`, `OvertimeRequest`, `Holiday`, `ShiftRoster`, `AttendancePolicy`:** Reused for dynamic eligibility, tenure, hierarchy, and Comp-Off work verification.
5. **`PayrollRun`, `Payslip`, `SalaryComponent`, `SalaryStructure`, `EmployeeSalaryAssignment`, `EmployeeSalaryItem`:** Reused for dynamic salary calculation basis, configured daily-rate divisors, earning component mapping, and payroll disbursement tracking.
6. **`Notification` & `AuditLog`:** Reused for role-targeted notifications and immutable system audit trails.

### 2.2 Additive Columns on `leave_encashment_requests`
- **Workflow & Approval:** `request_code`, `approved_days`, `available_balance_snapshot`, `retained_balance_snapshot`, `effective_date`, `supporting_doc_url`, `submitted_by_id`, `submitted_at`, `manager_id`, `manager_approver_id`, `manager_approved_at`, `manager_comments`, `hr_approver_id`, `hr_approved_at`, `hr_comments`, `rejection_reason`, `clarification_note`, `cancellation_reason`, `cancelled_at`, `cancelled_by_id`.
- **Financial & Payroll (`NUMERIC(14,2)` / `NUMERIC(6,2)` — zero floating-point columns):** `encashment_config_id`, `config_version`, `currency`, `salary_basis_type`, `salary_basis_amount`, `daily_rate_divisor`, `daily_rate`, `gross_amount`, `adjustments_amount`, `net_payable_amount`, `calculation_snapshot` (`JSONB`), `payroll_component_id`, `payroll_period_month`, `payroll_period_year`, `payroll_run_id`, `payslip_id`, `payroll_status`, `payroll_processed_at`, `paid_at`, `failure_reason`.
- **Comp-Off Verification, Credit, Utilization & Expiry:** `comp_off_config_id`, `work_type`, `attendance_id`, `overtime_request_id`, `actual_worked_hours`, `credited_days`, `used_days`, `expired_days`, `remaining_days`, `credited_at`, `expires_at`, `expiry_warning_sent_at`, `expired_at`, `expiry_ledger_entry_id`.
- **Ledger & Reversal Traceability:** `ledger_entry_id`, `reversal_ledger_entry_id`, `reversed_at`, `reversed_by_id`, `reversal_reason`, `reversal_ref`, `idempotency_key`.

### 2.3 New Additive Tables
1. **`LeaveEncashmentConfig` (`leave_encashment_configs`):** Tenant-scoped, versioned encashment rule engine (`enabled`, `eligible_leave_type_ids`, `min_service_months`, `min_remaining_balance`, `max_encashable_days_per_request`, `max_encashable_days_per_year`, `min_retained_balance`, `encashment_frequency`, `periodic_limit_days`, `allow_ess_submission`, `require_supporting_doc`, `applicable_categories`, `branch_id`, `department_id`, `approval_mode`, `salary_basis_type`, `salary_component_codes`, `daily_rate_divisor_mode`, `daily_rate_divisor`, `payroll_component_id`, `effective_from`, `effective_to`, `status`, `version`, `previous_version_id`).
2. **`CompOffConfig` (`comp_off_configs`):** Tenant-scoped, versioned Comp-Off rule engine (`enabled`, `comp_off_leave_type_id`, `eligible_work_types`, `allow_weekly_off`, `allow_public_holiday`, `allow_approved_overtime`, `allow_workday_extra_hours`, `require_attendance_record`, `require_approved_overtime_for_ot`, `min_qualifying_hours`, `half_day_hours_threshold`, `full_day_hours_threshold`, `max_credit_per_day`, `max_monthly_credits`, `max_yearly_credits`, `submission_deadline_days`, `expiry_days`, `expiry_warning_days`, `half_day_allowed`, `applicable_categories`, `branch_id`, `department_id`, `approval_mode`, `effective_from`, `effective_to`, `status`, `version`, `previous_version_id`).
3. **`CompOffUsageAllocation` (`comp_off_usage_allocations`):** FIFO lot allocation table linking approved/pending `LeaveRequest` rows from Leave Applications directly to earned Comp-Off credit lots (`RESERVED`, `CONSUMED`, `RESTORED`) with exact `days_allocated` and `ledger_entry_id`.
4. **`LeaveEncashmentCompOffEvent` (`leave_encashment_compoff_events`):** Append-only, immutable per-request event log (`ON DELETE RESTRICT`) capturing every state transition, approval step, payroll event, ledger reference, expiry sweep, and reversal.

---

## 3. Indexes, Check Constraints & Idempotency Guards

### 3.1 Partial Unique Idempotency Indexes
- `uq_leave_encash_compoff_idempotency`: Enforces unique `(tenant_id, idempotency_key)` where `idempotency_key IS NOT NULL`.
- `uq_compoff_active_work_date`: Prevents duplicate active Comp-Off claims for `(tenant_id, employee_id, worked_on_date)` when `status NOT IN ('REJECTED', 'CANCELLED', 'REVERSED')`.
- `uq_compoff_active_overtime_ref`: Prevents claiming the same `overtime_request_id` twice within a tenant.
- `uq_encashment_payroll_run_once`: Prevents duplicate attachment of an encashment request to a payroll run.
- `uq_leave_ledger_encash_expiry_once`: Enforces single `ENCASHMENT` or `EXPIRY` ledger entry per `(tenant_id, reference_id, entry_type)`.

### 3.2 Tenant-Scoped Composite Indexes
- `idx_leave_encash_tenant_type_status_created` on `(tenant_id, type, status, created_at DESC)`
- `idx_leave_encash_tenant_payroll_period` on `(tenant_id, payroll_period_year, payroll_period_month, payroll_status)`
- `idx_leave_encash_tenant_expiry` on `(tenant_id, type, status, expires_at)`
- `idx_leave_encash_tenant_manager_status` on `(tenant_id, manager_id, status)`
- `idx_leave_encash_config_tenant_active` & `idx_comp_off_config_tenant_active` on `(tenant_id, status, effective_from, effective_to)`
- `idx_comp_off_usage_tenant_emp_status` & `idx_comp_off_usage_tenant_leave`
- `idx_leave_encash_event_request_time`, `idx_leave_encash_event_emp_time`, `idx_leave_encash_event_type_time`

### 3.3 Rollback Strategy
Because all changes are strictly additive (`CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`, and widening `VARCHAR`), rollback (if ever required in an emergency) consists solely of dropping the 4 new tables and additive columns/indexes while keeping the original 14 `leave_encashment_requests` columns and all existing `leave_*` / `payroll_*` tables untouched.
