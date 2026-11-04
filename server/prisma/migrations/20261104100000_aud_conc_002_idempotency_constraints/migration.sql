-- Migration: 20261104100000_aud_conc_002_idempotency_constraints (PostgreSQL 17.11 compatible)
-- Enforces hard database-level idempotency for payroll accounting and loan deduction workflows

-- Preflight: Exhaustive verification of existing partial unique indexes (No substring matches)
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Check 1: uq_journal_entries_tenant_payroll_run
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'uq_journal_entries_tenant_payroll_run') THEN
        SELECT 
            n.nspname AS schema_name,
            ct.relname AS table_name,
            am.amname AS access_method,
            i.indisunique AS is_unique,
            i.indisvalid AS is_valid,
            i.indisready AS is_ready,
            string_agg(a.attname, ', ' ORDER BY u.attposition) AS key_columns,
            pg_get_expr(i.indpred, i.indrelid) AS predicate
        INTO rec
        FROM pg_index i
        JOIN pg_class ct ON ct.oid = i.indrelid
        JOIN pg_class ci ON ci.oid = i.indexrelid
        JOIN pg_am am ON am.oid = ci.relam
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS u(attnum, attposition) ON true
        JOIN pg_attribute a ON a.attrelid = ct.oid AND a.attnum = u.attnum
        WHERE ci.relname = 'uq_journal_entries_tenant_payroll_run'
        GROUP BY n.nspname, ct.relname, am.amname, i.indisunique, i.indisvalid, i.indisready, i.indpred, i.indrelid;

        IF rec.schema_name != 'public' OR rec.table_name != 'journal_entries' THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" exists on %.% (expected public.journal_entries).', rec.schema_name, rec.table_name;
        END IF;
        IF rec.access_method != 'btree' THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" access method is "%" (expected "btree").', rec.access_method;
        END IF;
        IF NOT rec.is_unique THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" is NOT unique.';
        END IF;
        IF NOT rec.is_valid THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" is INVALID (indisvalid=false). Manual remediation required.';
        END IF;
        IF NOT rec.is_ready THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" is NOT ready (indisready=false).';
        END IF;
        IF rec.key_columns != 'tenant_id, reference' THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" indexed columns are "%" (expected "tenant_id, reference").', rec.key_columns;
        END IF;
        IF rec.predicate != '((reference IS NOT NULL) AND ((reference_type)::text = ''payroll''::text))' THEN
            RAISE EXCEPTION 'Index conflict: "uq_journal_entries_tenant_payroll_run" predicate is "%" (expected "((reference IS NOT NULL) AND ((reference_type)::text = ''payroll''::text))").', rec.predicate;
        END IF;
    END IF;

    -- Check 2: uq_loan_installments_loan_payroll_run
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'uq_loan_installments_loan_payroll_run') THEN
        SELECT 
            n.nspname AS schema_name,
            ct.relname AS table_name,
            am.amname AS access_method,
            i.indisunique AS is_unique,
            i.indisvalid AS is_valid,
            i.indisready AS is_ready,
            string_agg(a.attname, ', ' ORDER BY u.attposition) AS key_columns,
            pg_get_expr(i.indpred, i.indrelid) AS predicate
        INTO rec
        FROM pg_index i
        JOIN pg_class ct ON ct.oid = i.indrelid
        JOIN pg_class ci ON ci.oid = i.indexrelid
        JOIN pg_am am ON am.oid = ci.relam
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS u(attnum, attposition) ON true
        JOIN pg_attribute a ON a.attrelid = ct.oid AND a.attnum = u.attnum
        WHERE ci.relname = 'uq_loan_installments_loan_payroll_run'
        GROUP BY n.nspname, ct.relname, am.amname, i.indisunique, i.indisvalid, i.indisready, i.indpred, i.indrelid;

        IF rec.schema_name != 'public' OR rec.table_name != 'loan_installments' THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" exists on %.% (expected public.loan_installments).', rec.schema_name, rec.table_name;
        END IF;
        IF rec.access_method != 'btree' THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" access method is "%" (expected "btree").', rec.access_method;
        END IF;
        IF NOT rec.is_unique THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" is NOT unique.';
        END IF;
        IF NOT rec.is_valid THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" is INVALID (indisvalid=false). Manual remediation required.';
        END IF;
        IF NOT rec.is_ready THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" is NOT ready (indisready=false).';
        END IF;
        IF rec.key_columns != 'loan_id, payroll_run_id' THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" indexed columns are "%" (expected "loan_id, payroll_run_id").', rec.key_columns;
        END IF;
        IF rec.predicate != '(payroll_run_id IS NOT NULL)' THEN
            RAISE EXCEPTION 'Index conflict: "uq_loan_installments_loan_payroll_run" predicate is "%" (expected "(payroll_run_id IS NOT NULL)").', rec.predicate;
        END IF;
    END IF;
END $$;

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
