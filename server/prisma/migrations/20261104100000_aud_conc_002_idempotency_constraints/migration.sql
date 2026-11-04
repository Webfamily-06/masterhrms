-- Migration: 20261104100000_aud_conc_002_idempotency_constraints (PostgreSQL 17 compatible)
-- Enforces hard database-level idempotency for payroll accounting and loan deduction workflows

-- 1. General Ledger Single-Posting Constraint per Payroll Run
-- Guarantees that a tenant can have at most one General Ledger journal entry for a given payroll run reference.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_journal_entries_tenant_payroll_run"
ON "journal_entries" ("tenant_id", "reference")
WHERE "reference" IS NOT NULL AND "reference_type" = 'payroll';

-- 2. Employee Loan Installment Deduction Idempotency Constraint
-- Guarantees that a given loan can only have one deduction installment linked to a specific payroll run.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_loan_installments_loan_payroll_run"
ON "loan_installments" ("loan_id", "payroll_run_id")
WHERE "payroll_run_id" IS NOT NULL;
