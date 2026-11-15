-- ============================================================================
-- MASTERHRMS — P3-A: Leave Encashment & Comp-Off Additive Migration
-- Strictly non-destructive, idempotent, tenant-scoped schema extension.
-- Zero table drops, zero column drops, zero data truncation.
-- ============================================================================

-- 1. Leave Encashment Configuration (versioned, tenant-scoped)
CREATE TABLE IF NOT EXISTS "leave_encashment_configs" (
  "id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "eligible_leave_type_ids" JSONB,
  "leave_type_id" VARCHAR(36),
  "eligibility_criteria" JSONB,
  "min_service_months" INTEGER NOT NULL DEFAULT 0,
  "min_remaining_balance" NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  "max_encashable_days_per_request" NUMERIC(6,2) NOT NULL DEFAULT 15.00,
  "max_encashable_days_per_year" NUMERIC(6,2) NOT NULL DEFAULT 30.00,
  "min_retained_balance" NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  "encashment_frequency" VARCHAR(30) NOT NULL DEFAULT 'ANNUAL',
  "periodic_limit_days" NUMERIC(6,2),
  "allow_ess_submission" BOOLEAN NOT NULL DEFAULT true,
  "require_supporting_doc" BOOLEAN NOT NULL DEFAULT false,
  "applicable_categories" JSONB,
  "branch_id" VARCHAR(36),
  "department_id" VARCHAR(36),
  "approval_mode" VARCHAR(30) NOT NULL DEFAULT 'MANAGER_THEN_HR',
  "salary_basis_type" VARCHAR(30) NOT NULL DEFAULT 'BASIC',
  "salary_component_codes" JSONB,
  "daily_rate_divisor_mode" VARCHAR(30) NOT NULL DEFAULT 'SALARY_STRUCTURE',
  "daily_rate_divisor" NUMERIC(6,2),
  "payroll_component_id" VARCHAR(36),
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "version" INTEGER NOT NULL DEFAULT 1,
  "previous_version_id" VARCHAR(36),
  "created_by_id" VARCHAR(36),
  "updated_by_id" VARCHAR(36),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_encashment_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leave_encashment_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "leave_encashment_configs_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "leave_encashment_configs_payroll_component_id_fkey" FOREIGN KEY ("payroll_component_id") REFERENCES "salary_components"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "chk_leave_encash_config_non_negative" CHECK (
    "min_service_months" >= 0
    AND "min_remaining_balance" >= 0
    AND "max_encashable_days_per_request" > 0
    AND "max_encashable_days_per_year" >= "max_encashable_days_per_request"
    AND "min_retained_balance" >= 0
    AND ("daily_rate_divisor" IS NULL OR "daily_rate_divisor" > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_leave_encash_config_tenant_code_ver"
  ON "leave_encashment_configs" ("tenant_id", "code", "version");
CREATE INDEX IF NOT EXISTS "idx_leave_encash_config_tenant_active"
  ON "leave_encashment_configs" ("tenant_id", "status", "effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "idx_leave_encash_config_tenant_scope"
  ON "leave_encashment_configs" ("tenant_id", "branch_id", "department_id");

-- 2. Comp-Off Configuration (versioned, tenant-scoped)
CREATE TABLE IF NOT EXISTS "comp_off_configs" (
  "id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "comp_off_leave_type_id" VARCHAR(36),
  "eligible_work_types" JSONB,
  "allow_weekly_off" BOOLEAN NOT NULL DEFAULT true,
  "allow_public_holiday" BOOLEAN NOT NULL DEFAULT true,
  "allow_approved_overtime" BOOLEAN NOT NULL DEFAULT true,
  "allow_workday_extra_hours" BOOLEAN NOT NULL DEFAULT false,
  "require_attendance_record" BOOLEAN NOT NULL DEFAULT true,
  "require_approved_overtime_for_ot" BOOLEAN NOT NULL DEFAULT true,
  "min_qualifying_hours" NUMERIC(5,2) NOT NULL DEFAULT 4.00,
  "half_day_hours_threshold" NUMERIC(5,2) NOT NULL DEFAULT 4.00,
  "full_day_hours_threshold" NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  "max_credit_per_day" NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  "max_monthly_credits" NUMERIC(6,2) NOT NULL DEFAULT 4.00,
  "max_yearly_credits" NUMERIC(6,2) NOT NULL DEFAULT 24.00,
  "submission_deadline_days" INTEGER NOT NULL DEFAULT 30,
  "expiry_days" INTEGER NOT NULL DEFAULT 90,
  "expiry_warning_days" INTEGER NOT NULL DEFAULT 7,
  "allow_ess_submission" BOOLEAN NOT NULL DEFAULT true,
  "require_supporting_doc" BOOLEAN NOT NULL DEFAULT false,
  "half_day_allowed" BOOLEAN NOT NULL DEFAULT true,
  "applicable_categories" JSONB,
  "branch_id" VARCHAR(36),
  "department_id" VARCHAR(36),
  "approval_mode" VARCHAR(30) NOT NULL DEFAULT 'MANAGER_THEN_HR',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "version" INTEGER NOT NULL DEFAULT 1,
  "previous_version_id" VARCHAR(36),
  "created_by_id" VARCHAR(36),
  "updated_by_id" VARCHAR(36),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comp_off_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comp_off_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comp_off_configs_comp_off_leave_type_id_fkey" FOREIGN KEY ("comp_off_leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "chk_comp_off_config_non_negative" CHECK (
    "min_qualifying_hours" > 0
    AND "half_day_hours_threshold" > 0
    AND "full_day_hours_threshold" >= "half_day_hours_threshold"
    AND "max_credit_per_day" > 0
    AND "max_monthly_credits" > 0
    AND "max_yearly_credits" >= "max_monthly_credits"
    AND "submission_deadline_days" >= 0
    AND "expiry_days" > 0
    AND "expiry_warning_days" >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_comp_off_config_tenant_code_ver"
  ON "comp_off_configs" ("tenant_id", "code", "version");
CREATE INDEX IF NOT EXISTS "idx_comp_off_config_tenant_active"
  ON "comp_off_configs" ("tenant_id", "status", "effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "idx_comp_off_config_tenant_scope"
  ON "comp_off_configs" ("tenant_id", "branch_id", "department_id");

-- 3. Additive Column Extensions on leave_encashment_requests
ALTER TABLE "leave_encashment_requests" ALTER COLUMN "status" TYPE VARCHAR(40);
ALTER TABLE "leave_encashment_requests" ALTER COLUMN "payroll_ref" TYPE VARCHAR(100);

ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "request_code" VARCHAR(40);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "approved_days" NUMERIC(6,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "available_balance_snapshot" NUMERIC(6,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "retained_balance_snapshot" NUMERIC(6,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "effective_date" DATE;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "supporting_doc_url" VARCHAR(500);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "submitted_by_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "manager_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "manager_approver_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "manager_approved_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "manager_comments" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "hr_approver_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "hr_approved_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "hr_comments" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "clarification_note" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "cancelled_by_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "encashment_config_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "comp_off_config_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "config_version" INTEGER;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "salary_basis_type" VARCHAR(30);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "salary_basis_amount" NUMERIC(14,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "daily_rate_divisor" NUMERIC(6,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "daily_rate" NUMERIC(14,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "gross_amount" NUMERIC(14,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "adjustments_amount" NUMERIC(14,2) DEFAULT 0.00;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "net_payable_amount" NUMERIC(14,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "calculation_snapshot" JSONB;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payroll_component_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payroll_period_month" INTEGER;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payroll_period_year" INTEGER;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payroll_run_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payslip_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payroll_status" VARCHAR(30);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "payroll_processed_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "ledger_entry_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "reversal_ledger_entry_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "reversed_by_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "reversal_reason" TEXT;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "reversal_ref" VARCHAR(100);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "work_type" VARCHAR(30);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "attendance_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "overtime_request_id" VARCHAR(36);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "actual_worked_hours" NUMERIC(5,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "credited_days" NUMERIC(6,2);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "used_days" NUMERIC(6,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "expired_days" NUMERIC(6,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "remaining_days" NUMERIC(6,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "credited_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "expiry_warning_sent_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP(3);
ALTER TABLE "leave_encashment_requests" ADD COLUMN IF NOT EXISTS "expiry_ledger_entry_id" VARCHAR(36);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_encashment_requests_encashment_config_id_fkey') THEN
    ALTER TABLE "leave_encashment_requests"
      ADD CONSTRAINT "leave_encashment_requests_encashment_config_id_fkey"
      FOREIGN KEY ("encashment_config_id") REFERENCES "leave_encashment_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_encashment_requests_comp_off_config_id_fkey') THEN
    ALTER TABLE "leave_encashment_requests"
      ADD CONSTRAINT "leave_encashment_requests_comp_off_config_id_fkey"
      FOREIGN KEY ("comp_off_config_id") REFERENCES "comp_off_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_encashment_requests_payroll_component_id_fkey') THEN
    ALTER TABLE "leave_encashment_requests"
      ADD CONSTRAINT "leave_encashment_requests_payroll_component_id_fkey"
      FOREIGN KEY ("payroll_component_id") REFERENCES "salary_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_encashment_requests_payroll_run_id_fkey') THEN
    ALTER TABLE "leave_encashment_requests"
      ADD CONSTRAINT "leave_encashment_requests_payroll_run_id_fkey"
      FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_encashment_requests_payslip_id_fkey') THEN
    ALTER TABLE "leave_encashment_requests"
      ADD CONSTRAINT "leave_encashment_requests_payslip_id_fkey"
      FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_leave_encashment_positive_days') THEN
    ALTER TABLE "leave_encashment_requests"
      ADD CONSTRAINT "chk_leave_encashment_positive_days"
      CHECK ("days" > 0 AND "used_days" >= 0 AND "expired_days" >= 0 AND "remaining_days" >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_leave_encash_tenant_type_status_created"
  ON "leave_encashment_requests" ("tenant_id", "type", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_leave_encash_tenant_payroll_period"
  ON "leave_encashment_requests" ("tenant_id", "payroll_period_year", "payroll_period_month", "payroll_status");
CREATE INDEX IF NOT EXISTS "idx_leave_encash_tenant_expiry"
  ON "leave_encashment_requests" ("tenant_id", "type", "status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_leave_encash_tenant_manager_status"
  ON "leave_encashment_requests" ("tenant_id", "manager_id", "status");

-- Partial unique idempotency & duplicate-prevention indexes
CREATE UNIQUE INDEX IF NOT EXISTS "uq_leave_encash_compoff_idempotency"
  ON "leave_encashment_requests" ("tenant_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_compoff_active_work_date"
  ON "leave_encashment_requests" ("tenant_id", "employee_id", "worked_on_date")
  WHERE "type" = 'COMP_OFF'
    AND "worked_on_date" IS NOT NULL
    AND "status" NOT IN ('REJECTED', 'CANCELLED', 'REVERSED');

CREATE UNIQUE INDEX IF NOT EXISTS "uq_compoff_active_overtime_ref"
  ON "leave_encashment_requests" ("tenant_id", "overtime_request_id")
  WHERE "type" = 'COMP_OFF'
    AND "overtime_request_id" IS NOT NULL
    AND "status" NOT IN ('REJECTED', 'CANCELLED', 'REVERSED');

CREATE UNIQUE INDEX IF NOT EXISTS "uq_encashment_payroll_run_once"
  ON "leave_encashment_requests" ("tenant_id", "id", "payroll_run_id")
  WHERE "payroll_run_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_leave_ledger_encash_expiry_once"
  ON "leave_ledger_entries" ("tenant_id", "reference_id", "entry_type")
  WHERE "reference_id" IS NOT NULL AND "entry_type" IN ('ENCASHMENT', 'EXPIRY');

-- 4. Comp-Off Usage Allocations (FIFO lot tracking across Leave Applications)
CREATE TABLE IF NOT EXISTS "comp_off_usage_allocations" (
  "id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36) NOT NULL,
  "employee_id" VARCHAR(36) NOT NULL,
  "comp_off_request_id" VARCHAR(36) NOT NULL,
  "leave_request_id" VARCHAR(36) NOT NULL,
  "days_allocated" NUMERIC(5,2) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
  "ledger_entry_id" VARCHAR(36),
  "restored_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comp_off_usage_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comp_off_usage_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comp_off_usage_allocations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comp_off_usage_allocations_comp_off_request_id_fkey" FOREIGN KEY ("comp_off_request_id") REFERENCES "leave_encashment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "comp_off_usage_allocations_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_comp_off_usage_positive" CHECK ("days_allocated" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_comp_off_usage_lot_leave"
  ON "comp_off_usage_allocations" ("tenant_id", "comp_off_request_id", "leave_request_id");
CREATE INDEX IF NOT EXISTS "idx_comp_off_usage_tenant_emp_status"
  ON "comp_off_usage_allocations" ("tenant_id", "employee_id", "status");
CREATE INDEX IF NOT EXISTS "idx_comp_off_usage_tenant_leave"
  ON "comp_off_usage_allocations" ("tenant_id", "leave_request_id");

-- 5. Immutable Transaction & Approval History Events
CREATE TABLE IF NOT EXISTS "leave_encashment_compoff_events" (
  "id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36) NOT NULL,
  "request_id" VARCHAR(36) NOT NULL,
  "employee_id" VARCHAR(36) NOT NULL,
  "transaction_type" VARCHAR(40) NOT NULL,
  "event_type" VARCHAR(50) NOT NULL,
  "from_status" VARCHAR(40),
  "to_status" VARCHAR(40),
  "actor_id" VARCHAR(36),
  "actor_name" VARCHAR(150),
  "actor_role" VARCHAR(60),
  "days" NUMERIC(6,2),
  "amount" NUMERIC(14,2),
  "payroll_ref" VARCHAR(100),
  "ledger_entry_id" VARCHAR(36),
  "comments" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_encashment_compoff_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leave_encashment_compoff_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "leave_encashment_compoff_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "leave_encashment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "leave_encashment_compoff_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_leave_encash_event_request_time"
  ON "leave_encashment_compoff_events" ("tenant_id", "request_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_leave_encash_event_emp_time"
  ON "leave_encashment_compoff_events" ("tenant_id", "employee_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_leave_encash_event_type_time"
  ON "leave_encashment_compoff_events" ("tenant_id", "event_type", "created_at" DESC);
