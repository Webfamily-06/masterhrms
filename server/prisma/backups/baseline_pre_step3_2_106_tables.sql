-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_secret` VARCHAR(255) NULL,
    `two_factor_backup_codes` TEXT NULL,
    `two_factor_confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `logo_url` VARCHAR(500) NULL,
    `timezone` VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tenants_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NULL,
    `full_name` VARCHAR(255) NULL,
    `avatar_url` VARCHAR(500) NULL,
    `tenant_id` VARCHAR(36) NULL,
    `phone` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role` ENUM('super_admin', 'hr_admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
    `tenant_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_roles_user_id_role_tenant_id_key`(`user_id`, `role`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `department_id` VARCHAR(36) NULL,
    `manager_id` VARCHAR(36) NULL,
    `employee_code` VARCHAR(50) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `position` VARCHAR(150) NULL,
    `employment_type` ENUM('full_time', 'part_time', 'contract', 'intern') NOT NULL DEFAULT 'full_time',
    `status` ENUM('active', 'on_leave', 'terminated') NOT NULL DEFAULT 'active',
    `salary` DECIMAL(12, 2) NULL,
    `joined_at` DATETIME(3) NULL,
    `pan` VARCHAR(20) NULL,
    `aadhaar` VARCHAR(20) NULL,
    `uan` VARCHAR(20) NULL,
    `esi_number` VARCHAR(50) NULL,
    `bank_name` VARCHAR(100) NULL,
    `bank_account` VARCHAR(50) NULL,
    `bank_ifsc` VARCHAR(20) NULL,
    `bank_branch` VARCHAR(100) NULL,
    `date_of_birth` DATE NULL,
    `gender` VARCHAR(20) NULL,
    `tax_regime` VARCHAR(20) NOT NULL DEFAULT 'new',
    `state` VARCHAR(100) NULL,
    `pf_eligible` BOOLEAN NOT NULL DEFAULT true,
    `esi_eligible` BOOLEAN NOT NULL DEFAULT true,
    `pt_eligible` BOOLEAN NOT NULL DEFAULT true,
    `tds_eligible` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employees_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `employees_tenant_id_department_id_idx`(`tenant_id`, `department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `check_in` DATETIME(3) NULL,
    `check_out` DATETIME(3) NULL,
    `hours` DECIMAL(5, 2) NULL,
    `status` ENUM('present', 'absent', 'half_day', 'late', 'on_leave') NOT NULL DEFAULT 'present',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_tenant_id_date_idx`(`tenant_id`, `date`),
    INDEX `attendance_tenant_id_status_idx`(`tenant_id`, `status`),
    UNIQUE INDEX `attendance_tenant_id_employee_id_date_key`(`tenant_id`, `employee_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_types` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `days_per_year` INTEGER NOT NULL DEFAULT 0,
    `color` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `leave_type_id` VARCHAR(36) NULL,
    `approver_id` VARCHAR(36) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `days` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `reason` TEXT NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_requests_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `leave_requests_tenant_id_employee_id_idx`(`tenant_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_runs` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `period_month` INTEGER NOT NULL,
    `period_year` INTEGER NOT NULL,
    `total_amount` DECIMAL(15, 2) NULL,
    `total_net` DECIMAL(15, 2) NULL,
    `total_deductions` DECIMAL(15, 2) NULL,
    `employee_count` INTEGER NOT NULL DEFAULT 0,
    `approval_status` VARCHAR(30) NOT NULL DEFAULT 'draft',
    `approved_by` VARCHAR(150) NULL,
    `approved_at` DATETIME(3) NULL,
    `status` ENUM('draft', 'processing', 'completed', 'paid') NOT NULL DEFAULT 'draft',
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payroll_runs_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `payroll_runs_tenant_id_period_year_period_month_idx`(`tenant_id`, `period_year`, `period_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payslips` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `payroll_run_id` VARCHAR(36) NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `period_month` INTEGER NOT NULL,
    `period_year` INTEGER NOT NULL,
    `gross_salary` DECIMAL(12, 2) NOT NULL,
    `deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `net_salary` DECIMAL(12, 2) NOT NULL,
    `breakdown` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payslips_tenant_id_employee_id_idx`(`tenant_id`, `employee_id`),
    INDEX `payslips_tenant_id_payroll_run_id_idx`(`tenant_id`, `payroll_run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_components` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `calculation_type` VARCHAR(50) NOT NULL,
    `formula_string` VARCHAR(500) NULL,
    `default_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `is_taxable` BOOLEAN NOT NULL DEFAULT true,
    `is_statutory` BOOLEAN NOT NULL DEFAULT false,
    `include_in_pf` BOOLEAN NOT NULL DEFAULT false,
    `include_in_esi` BOOLEAN NOT NULL DEFAULT false,
    `round_off` VARCHAR(20) NOT NULL DEFAULT 'nearest',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `salary_components_tenant_id_type_idx`(`tenant_id`, `type`),
    UNIQUE INDEX `salary_components_tenant_id_code_key`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_structures` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `base_calculation_days` INTEGER NOT NULL DEFAULT 26,
    `pay_frequency` VARCHAR(30) NOT NULL DEFAULT 'monthly',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `salary_structures_tenant_id_is_default_idx`(`tenant_id`, `is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_structure_items` (
    `id` VARCHAR(36) NOT NULL,
    `structure_id` VARCHAR(36) NOT NULL,
    `component_id` VARCHAR(36) NOT NULL,
    `calculation_type` VARCHAR(50) NOT NULL,
    `value` DECIMAL(12, 4) NOT NULL DEFAULT 0.00,
    `formula` VARCHAR(500) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `salary_structure_items_structure_id_sort_order_idx`(`structure_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_salary_assignments` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `structure_id` VARCHAR(36) NULL,
    `ctc_annual` DECIMAL(15, 2) NOT NULL,
    `ctc_monthly` DECIMAL(15, 2) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT true,
    `tax_regime` VARCHAR(20) NOT NULL DEFAULT 'new',
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_salary_assignments_tenant_id_employee_id_is_current_idx`(`tenant_id`, `employee_id`, `is_current`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_salary_items` (
    `id` VARCHAR(36) NOT NULL,
    `assignment_id` VARCHAR(36) NOT NULL,
    `component_id` VARCHAR(36) NOT NULL,
    `monthly_amount` DECIMAL(12, 2) NOT NULL,
    `annual_amount` DECIMAL(15, 2) NOT NULL,

    INDEX `employee_salary_items_assignment_id_idx`(`assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `statutory_rules` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `rule_type` VARCHAR(50) NOT NULL,
    `state_code` VARCHAR(50) NULL,
    `config_json` JSON NOT NULL,
    `effective_from` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `statutory_rules_tenant_id_rule_type_is_active_idx`(`tenant_id`, `rule_type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_tax_declarations` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `financial_year` VARCHAR(20) NOT NULL,
    `tax_regime` VARCHAR(20) NOT NULL DEFAULT 'new',
    `house_rent_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `landlord_pan` VARCHAR(20) NULL,
    `landlord_name` VARCHAR(150) NULL,
    `landlord_address` TEXT NULL,
    `section_80c` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `section_80d` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `section_80g` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `home_loan_interest` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `other_income` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_deduction_claimed` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_deduction_approved` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
    `verified_by` VARCHAR(150) NULL,
    `verified_at` DATETIME(3) NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_tax_declarations_tenant_id_financial_year_status_idx`(`tenant_id`, `financial_year`, `status`),
    UNIQUE INDEX `employee_tax_declarations_tenant_id_employee_id_financial_ye_key`(`tenant_id`, `employee_id`, `financial_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_declaration_proofs` (
    `id` VARCHAR(36) NOT NULL,
    `declaration_id` VARCHAR(36) NOT NULL,
    `section` VARCHAR(50) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `declared_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `approved_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `rejection_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tax_declaration_proofs_declaration_id_section_idx`(`declaration_id`, `section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_snapshots` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `payroll_run_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `period_month` INTEGER NOT NULL,
    `period_year` INTEGER NOT NULL,
    `snapshot_data` JSON NOT NULL,
    `ctc_annual` DECIMAL(15, 2) NOT NULL,
    `gross_earned` DECIMAL(12, 2) NOT NULL,
    `total_deductions` DECIMAL(12, 2) NOT NULL,
    `net_pay` DECIMAL(12, 2) NOT NULL,
    `lop_days` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `payable_days` DECIMAL(5, 2) NOT NULL DEFAULT 26.00,
    `is_locked` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payroll_snapshots_tenant_id_payroll_run_id_idx`(`tenant_id`, `payroll_run_id`),
    INDEX `payroll_snapshots_tenant_id_employee_id_period_year_period_m_idx`(`tenant_id`, `employee_id`, `period_year`, `period_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generic_form_templates` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'statutory',
    `entity_type` VARCHAR(50) NOT NULL DEFAULT 'employee',
    `description` TEXT NULL,
    `layout_json` JSON NULL,
    `fields_json` JSON NOT NULL,
    `formulas_json` JSON NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `generic_form_templates_tenant_id_category_is_published_idx`(`tenant_id`, `category`, `is_published`),
    UNIQUE INDEX `generic_form_templates_tenant_id_code_key`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_pages` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `meta_description` VARCHAR(500) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `content` JSON NOT NULL,
    `updated_by` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cms_pages_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'active',
    `price_monthly` DECIMAL(16, 3) NOT NULL DEFAULT 0,
    `price_annual` DECIMAL(16, 3) NOT NULL DEFAULT 0,
    `max_employees` INTEGER NULL,
    `max_users` INTEGER NULL,
    `features` JSON NULL,
    `included_addon_ids` JSON NULL,
    `is_popular` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `plan_id` VARCHAR(100) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'active',
    `billing_cycle` VARCHAR(20) NOT NULL DEFAULT 'monthly',
    `max_employees` INTEGER NULL,
    `max_users` INTEGER NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_subscriptions_tenant_id_key`(`tenant_id`),
    INDEX `tenant_subscriptions_plan_id_status_idx`(`plan_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_policy_audits` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `subscription_id` VARCHAR(36) NULL,
    `actor_user_id` VARCHAR(36) NOT NULL,
    `before` JSON NULL,
    `after` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscription_policy_audits_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addons` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `tagline` VARCHAR(300) NULL,
    `description` TEXT NULL,
    `long_description` LONGTEXT NULL,
    `category` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `price_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `icon` VARCHAR(500) NULL,
    `screenshots` JSON NULL,
    `features` JSON NULL,
    `developer` VARCHAR(255) NULL,
    `version` VARCHAR(50) NULL,
    `docs_url` VARCHAR(500) NULL,
    `gallery_video` VARCHAR(500) NULL,
    `install_url` VARCHAR(500) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `addons_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_addons` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `addon_slug` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `plan` VARCHAR(50) NOT NULL DEFAULT 'standard',
    `trial_ends_at` DATETIME(3) NULL,
    `renews_at` DATETIME(3) NULL,
    `features` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tenant_addons_tenant_id_status_idx`(`tenant_id`, `status`),
    UNIQUE INDEX `tenant_addons_tenant_id_addon_slug_key`(`tenant_id`, `addon_slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `okr_cycles` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `period_type` VARCHAR(50) NOT NULL DEFAULT 'quarterly',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `okr_objectives` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `cycle_id` VARCHAR(36) NOT NULL,
    `parent_id` VARCHAR(36) NULL,
    `category` VARCHAR(100) NULL DEFAULT 'Strategy',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `owner_id` VARCHAR(36) NOT NULL,
    `department_id` VARCHAR(36) NULL,
    `alignment_type` VARCHAR(50) NOT NULL DEFAULT 'individual',
    `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `okr_objectives_tenant_id_cycle_id_idx`(`tenant_id`, `cycle_id`),
    INDEX `okr_objectives_tenant_id_owner_id_idx`(`tenant_id`, `owner_id`),
    INDEX `okr_objectives_tenant_id_parent_id_idx`(`tenant_id`, `parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `okr_key_results` (
    `id` VARCHAR(36) NOT NULL,
    `objective_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `measurement_type` VARCHAR(50) NOT NULL DEFAULT 'percentage',
    `start_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `target_value` DECIMAL(12, 2) NOT NULL DEFAULT 100.00,
    `current_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `weight` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `okr_checkins` (
    `id` VARCHAR(36) NOT NULL,
    `key_result_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `progress_value` DECIMAL(12, 2) NOT NULL,
    `confidence_score` INTEGER NOT NULL DEFAULT 8,
    `notes` TEXT NULL,
    `blockers` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `okr_reviews` (
    `id` VARCHAR(36) NOT NULL,
    `cycle_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `reviewer_id` VARCHAR(36) NOT NULL,
    `review_type` VARCHAR(50) NOT NULL DEFAULT 'manager',
    `rating_score` DECIMAL(3, 1) NULL,
    `feedback_text` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_categories` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(50) NULL DEFAULT '💻',
    `prefix` VARCHAR(20) NOT NULL DEFAULT 'AST',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asset_categories_tenant_id_slug_key`(`tenant_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `asset_tag` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'laptop',
    `category_id` VARCHAR(36) NULL,
    `brand` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `serial_number` VARCHAR(150) NULL,
    `is_batch` BOOLEAN NOT NULL DEFAULT false,
    `total_quantity` INTEGER NOT NULL DEFAULT 1,
    `available_quantity` INTEGER NOT NULL DEFAULT 1,
    `unit` VARCHAR(50) NOT NULL DEFAULT 'pcs',
    `location` VARCHAR(150) NULL,
    `images` JSON NULL,
    `qr_code` VARCHAR(255) NULL,
    `purchase_date` DATE NULL,
    `purchase_price` DECIMAL(12, 2) NULL,
    `vendor` VARCHAR(150) NULL,
    `warranty_expiry` DATE NULL,
    `condition` VARCHAR(50) NOT NULL DEFAULT 'good',
    `status` VARCHAR(50) NOT NULL DEFAULT 'available',
    `assigned_employee_id` VARCHAR(36) NULL,
    `assigned_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assets_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `assets_tenant_id_category_idx`(`tenant_id`, `category`),
    UNIQUE INDEX `assets_tenant_id_asset_tag_key`(`tenant_id`, `asset_tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_assignments` (
    `id` VARCHAR(36) NOT NULL,
    `asset_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NULL,
    `department_id` VARCHAR(36) NULL,
    `location_name` VARCHAR(150) NULL,
    `target_type` VARCHAR(50) NOT NULL DEFAULT 'employee',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expected_return_date` DATE NULL,
    `returned_at` DATETIME(3) NULL,
    `condition_on_assign` VARCHAR(50) NOT NULL DEFAULT 'good',
    `condition_on_return` VARCHAR(50) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_requests` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `asset_id` VARCHAR(36) NULL,
    `category_name` VARCHAR(100) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `purpose` TEXT NOT NULL,
    `priority` VARCHAR(50) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `admin_notes` TEXT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_disposal_batches` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `batch_number` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `period` VARCHAR(50) NOT NULL DEFAULT 'Q4',
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `total_items_count` INTEGER NOT NULL DEFAULT 0,
    `total_book_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_recovery_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `justification` TEXT NULL,
    `approved_by` VARCHAR(100) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_disposal_items` (
    `id` VARCHAR(36) NOT NULL,
    `batch_id` VARCHAR(36) NOT NULL,
    `asset_id` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `reason` TEXT NOT NULL,
    `book_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `disposal_method` VARCHAR(50) NOT NULL DEFAULT 'scrap',
    `recovery_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_maintenance` (
    `id` VARCHAR(36) NOT NULL,
    `asset_id` VARCHAR(36) NOT NULL,
    `service_type` VARCHAR(50) NOT NULL DEFAULT 'corrective',
    `service_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `next_service_date` DATE NULL,
    `vendor` VARCHAR(150) NULL,
    `cost` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `issue_description` TEXT NOT NULL,
    `resolution_details` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_activity_logs` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `asset_id` VARCHAR(36) NULL,
    `action_type` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `performed_by` VARCHAR(100) NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_postings` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `department_id` VARCHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `requirements` TEXT NULL,
    `benefits` TEXT NULL,
    `location` VARCHAR(150) NOT NULL DEFAULT 'Remote',
    `employment_type` VARCHAR(50) NOT NULL DEFAULT 'full_time',
    `experience_level` VARCHAR(50) NOT NULL DEFAULT 'Mid-Level',
    `salary_min` DECIMAL(12, 2) NULL,
    `salary_max` DECIMAL(12, 2) NULL,
    `openings_count` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(50) NOT NULL DEFAULT 'published',
    `closing_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_postings_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_candidates` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `job_posting_id` VARCHAR(36) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `resume_url` VARCHAR(500) NULL,
    `portfolio_url` VARCHAR(500) NULL,
    `cover_letter` TEXT NULL,
    `years_of_experience` DOUBLE NULL DEFAULT 0,
    `current_company` VARCHAR(150) NULL,
    `expected_salary` DECIMAL(12, 2) NULL,
    `stage` VARCHAR(50) NOT NULL DEFAULT 'applied',
    `rating` DOUBLE NULL DEFAULT 0,
    `interviewer_notes` TEXT NULL,
    `is_converted_to_employee` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_candidates_tenant_id_stage_idx`(`tenant_id`, `stage`),
    INDEX `job_candidates_job_posting_id_stage_idx`(`job_posting_id`, `stage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_candidate_interviews` (
    `id` VARCHAR(36) NOT NULL,
    `candidate_id` VARCHAR(36) NOT NULL,
    `interviewer_id` VARCHAR(36) NULL,
    `interview_type` VARCHAR(100) NOT NULL DEFAULT 'Technical Round',
    `scheduled_at` DATETIME(3) NOT NULL,
    `meeting_link` VARCHAR(500) NULL,
    `feedback` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shift_definitions` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `start_time` VARCHAR(10) NOT NULL DEFAULT '09:30',
    `end_time` VARCHAR(10) NOT NULL DEFAULT '18:30',
    `break_minutes` INTEGER NOT NULL DEFAULT 60,
    `allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_overtime_eligible` BOOLEAN NOT NULL DEFAULT true,
    `color` VARCHAR(50) NOT NULL DEFAULT 'blue',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shift_definitions_tenant_id_code_idx`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shift_rosters` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `shift_id` VARCHAR(36) NOT NULL,
    `roster_date` DATE NOT NULL,
    `notes` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'assigned',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shift_rosters_tenant_id_roster_date_idx`(`tenant_id`, `roster_date`),
    UNIQUE INDEX `shift_rosters_tenant_id_employee_id_roster_date_key`(`tenant_id`, `employee_id`, `roster_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shift_swap_requests` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `requester_employee_id` VARCHAR(36) NOT NULL,
    `target_employee_id` VARCHAR(36) NOT NULL,
    `shift_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending_peer',
    `manager_notes` TEXT NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shift_swap_requests_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_categories` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `monthly_limit` DECIMAL(12, 2) NULL,
    `requires_receipt` BOOLEAN NOT NULL DEFAULT true,
    `icon` VARCHAR(50) NOT NULL DEFAULT 'Receipt',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expense_categories_tenant_id_code_key`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_claims` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `claim_code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `expense_date` DATE NOT NULL,
    `merchant` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `receipt_url` VARCHAR(500) NULL,
    `receipt_name` VARCHAR(200) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `reimbursement_method` VARCHAR(50) NULL,
    `payroll_month` VARCHAR(20) NULL,
    `approver_notes` TEXT NULL,
    `approved_at` DATETIME(3) NULL,
    `reimbursed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expense_claims_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `expense_claims_tenant_id_employee_id_idx`(`tenant_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_courses` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'Compliance & Security',
    `instructor` VARCHAR(150) NOT NULL DEFAULT 'Internal Academy',
    `duration_hours` DOUBLE NOT NULL DEFAULT 4.0,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `passing_score` INTEGER NOT NULL DEFAULT 80,
    `description` TEXT NULL,
    `banner_url` VARCHAR(500) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'published',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `training_courses_tenant_id_category_idx`(`tenant_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_modules` (
    `id` VARCHAR(36) NOT NULL,
    `course_id` VARCHAR(36) NOT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 1,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NULL,
    `video_url` VARCHAR(500) NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 30,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `course_modules_course_id_order_index_idx`(`course_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_enrollments` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `course_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `progress_percent` INTEGER NOT NULL DEFAULT 0,
    `score` DOUBLE NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'not_started',
    `certificate_id` VARCHAR(50) NULL,
    `certified_at` DATETIME(3) NULL,
    `expiry_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `course_enrollments_tenant_id_status_idx`(`tenant_id`, `status`),
    UNIQUE INDEX `course_enrollments_tenant_id_course_id_employee_id_key`(`tenant_id`, `course_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_exits` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `exit_code` VARCHAR(50) NOT NULL,
    `resignation_date` DATE NOT NULL,
    `last_working_day` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `exit_type` VARCHAR(50) NOT NULL DEFAULT 'resignation',
    `status` VARCHAR(50) NOT NULL DEFAULT 'serving_notice',
    `notice_period_days` INTEGER NOT NULL DEFAULT 60,
    `it_clearance` BOOLEAN NOT NULL DEFAULT false,
    `it_notes` TEXT NULL,
    `it_cleared_at` DATETIME(3) NULL,
    `finance_clearance` BOOLEAN NOT NULL DEFAULT false,
    `finance_notes` TEXT NULL,
    `finance_cleared_at` DATETIME(3) NULL,
    `hr_clearance` BOOLEAN NOT NULL DEFAULT false,
    `hr_notes` TEXT NULL,
    `hr_cleared_at` DATETIME(3) NULL,
    `admin_clearance` BOOLEAN NOT NULL DEFAULT false,
    `admin_notes` TEXT NULL,
    `admin_cleared_at` DATETIME(3) NULL,
    `fnf_settlement_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `fnf_settlement_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `fnf_settled_at` DATETIME(3) NULL,
    `relieving_letter_code` VARCHAR(50) NULL,
    `exit_interview_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_exits_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `employee_exits_tenant_id_employee_id_idx`(`tenant_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exit_checklist_items` (
    `id` VARCHAR(36) NOT NULL,
    `exit_id` VARCHAR(36) NOT NULL,
    `department` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_by` VARCHAR(100) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exit_checklist_items_exit_id_department_idx`(`exit_id`, `department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_documents` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NULL,
    `document_code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'Employment Contract',
    `file_url` VARCHAR(500) NULL,
    `file_name` VARCHAR(200) NOT NULL,
    `file_size` VARCHAR(50) NOT NULL DEFAULT '1.2 MB',
    `file_type` VARCHAR(50) NOT NULL DEFAULT 'application/pdf',
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending_signature',
    `requires_signature` BOOLEAN NOT NULL DEFAULT true,
    `signature_data_url` LONGTEXT NULL,
    `signer_name` VARCHAR(150) NULL,
    `signed_at` DATETIME(3) NULL,
    `signer_ip` VARCHAR(100) NULL,
    `expiry_date` DATE NULL,
    `verified_by` VARCHAR(150) NULL,
    `verified_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `company_documents_tenant_id_category_idx`(`tenant_id`, `category`),
    INDEX `company_documents_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `company_documents_tenant_id_employee_id_idx`(`tenant_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `helpdesk_tickets` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `ticket_code` VARCHAR(50) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'IT & Hardware',
    `priority` VARCHAR(50) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(50) NOT NULL DEFAULT 'open',
    `assigned_agent` VARCHAR(150) NULL,
    `description` TEXT NOT NULL,
    `sla_hours` INTEGER NOT NULL DEFAULT 24,
    `resolution_notes` TEXT NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `helpdesk_tickets_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `helpdesk_tickets_tenant_id_category_idx`(`tenant_id`, `category`),
    INDEX `helpdesk_tickets_tenant_id_employee_id_idx`(`tenant_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `helpdesk_comments` (
    `id` VARCHAR(36) NOT NULL,
    `ticket_id` VARCHAR(36) NOT NULL,
    `author_name` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_staff` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `helpdesk_comments_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_support_tickets` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `ticket_code` VARCHAR(50) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `request_type` VARCHAR(100) NOT NULL DEFAULT 'general_support',
    `target_addon_slug` VARCHAR(100) NULL,
    `priority` VARCHAR(50) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(50) NOT NULL DEFAULT 'open',
    `admin_notes` TEXT NULL,
    `super_admin_action` VARCHAR(100) NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `platform_support_tickets_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `platform_support_tickets_request_type_status_idx`(`request_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_ticket_messages` (
    `id` VARCHAR(36) NOT NULL,
    `ticket_id` VARCHAR(36) NOT NULL,
    `sender_type` VARCHAR(50) NOT NULL,
    `sender_name` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `attachment_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platform_ticket_messages_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'company_news',
    `priority` VARCHAR(50) NOT NULL DEFAULT 'normal',
    `target_type` VARCHAR(50) NOT NULL DEFAULT 'all_company',
    `target_department_id` VARCHAR(36) NULL,
    `is_pinned` BOOLEAN NOT NULL DEFAULT false,
    `publish_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiry_date` DATETIME(3) NULL,
    `author_id` VARCHAR(36) NULL,
    `author_name` VARCHAR(150) NOT NULL DEFAULT 'Management / HR',
    `attachment_url` VARCHAR(500) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `acknowledgement_required` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `announcements_tenant_id_category_idx`(`tenant_id`, `category`),
    INDEX `announcements_tenant_id_is_pinned_idx`(`tenant_id`, `is_pinned`),
    INDEX `announcements_tenant_id_publish_date_idx`(`tenant_id`, `publish_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcement_acknowledgements` (
    `id` VARCHAR(36) NOT NULL,
    `announcement_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `acknowledged_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `comments` VARCHAR(255) NULL,

    INDEX `announcement_acknowledgements_announcement_id_idx`(`announcement_id`),
    INDEX `announcement_acknowledgements_employee_id_idx`(`employee_id`),
    UNIQUE INDEX `announcement_acknowledgements_announcement_id_employee_id_key`(`announcement_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_forms` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'general',
    `status` VARCHAR(50) NOT NULL DEFAULT 'published',
    `target_audience` VARCHAR(50) NOT NULL DEFAULT 'all_company',
    `target_department_id` VARCHAR(36) NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `allow_multiple_submissions` BOOLEAN NOT NULL DEFAULT false,
    `deadline` DATETIME(3) NULL,
    `author_id` VARCHAR(36) NULL,
    `author_name` VARCHAR(150) NOT NULL DEFAULT 'HR Operations',
    `response_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `custom_forms_tenant_id_category_idx`(`tenant_id`, `category`),
    INDEX `custom_forms_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_fields` (
    `id` VARCHAR(36) NOT NULL,
    `form_id` VARCHAR(36) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `description` VARCHAR(500) NULL,
    `field_type` VARCHAR(50) NOT NULL,
    `options` TEXT NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `placeholder` VARCHAR(255) NULL,
    `default_value` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `form_fields_form_id_order_index_idx`(`form_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_submissions` (
    `id` VARCHAR(36) NOT NULL,
    `form_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `employee_id` VARCHAR(36) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(50) NOT NULL DEFAULT 'submitted',
    `reviewer_notes` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `form_submissions_form_id_idx`(`form_id`),
    INDEX `form_submissions_tenant_id_form_id_idx`(`tenant_id`, `form_id`),
    INDEX `form_submissions_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_response_values` (
    `id` VARCHAR(36) NOT NULL,
    `submission_id` VARCHAR(36) NOT NULL,
    `field_id` VARCHAR(36) NOT NULL,
    `field_label` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `form_response_values_submission_id_idx`(`submission_id`),
    INDEX `form_response_values_field_id_idx`(`field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biometric_devices` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `device_name` VARCHAR(255) NOT NULL,
    `device_model` VARCHAR(100) NOT NULL DEFAULT 'ZKTeco MB20',
    `device_type` VARCHAR(50) NOT NULL DEFAULT 'hybrid',
    `purpose` VARCHAR(20) NOT NULL DEFAULT 'both',
    `ip_address` VARCHAR(100) NULL,
    `port` INTEGER NOT NULL DEFAULT 4370,
    `serial_number` VARCHAR(100) NOT NULL,
    `location` VARCHAR(150) NOT NULL DEFAULT 'Main Entrance',
    `status` VARCHAR(50) NOT NULL DEFAULT 'online',
    `sync_protocol` VARCHAR(50) NOT NULL DEFAULT 'push_api_webhook',
    `api_key` VARCHAR(100) NOT NULL,
    `last_sync_at` DATETIME(3) NULL,
    `total_punch_logs` INTEGER NOT NULL DEFAULT 0,
    `auto_attendance_sync` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `biometric_devices_api_key_key`(`api_key`),
    INDEX `biometric_devices_tenant_id_status_idx`(`tenant_id`, `status`),
    UNIQUE INDEX `biometric_devices_tenant_id_serial_number_key`(`tenant_id`, `serial_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biometric_punch_logs` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `device_id` VARCHAR(36) NOT NULL,
    `employee_code` VARCHAR(50) NOT NULL,
    `employee_id` VARCHAR(36) NULL,
    `punch_time` DATETIME(3) NOT NULL,
    `punch_type` VARCHAR(50) NOT NULL DEFAULT 'auto',
    `verification_mode` VARCHAR(50) NOT NULL DEFAULT 'fingerprint',
    `sync_status` VARCHAR(50) NOT NULL DEFAULT 'processed',
    `raw_payload` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `biometric_punch_logs_tenant_id_punch_time_idx`(`tenant_id`, `punch_time`),
    INDEX `biometric_punch_logs_tenant_id_sync_status_idx`(`tenant_id`, `sync_status`),
    INDEX `biometric_punch_logs_device_id_idx`(`device_id`),
    INDEX `biometric_punch_logs_employee_code_idx`(`employee_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chart_of_accounts` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `account_code` VARCHAR(50) NOT NULL,
    `account_name` VARCHAR(150) NOT NULL,
    `account_type` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'current_asset',
    `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `chart_of_accounts_tenant_id_account_type_idx`(`tenant_id`, `account_type`),
    UNIQUE INDEX `chart_of_accounts_tenant_id_account_code_key`(`tenant_id`, `account_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_entries` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `entry_number` VARCHAR(50) NOT NULL,
    `entry_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `reference` VARCHAR(150) NULL,
    `reference_type` VARCHAR(50) NULL,
    `description` TEXT NOT NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(30) NOT NULL DEFAULT 'posted',
    `created_by_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `journal_entries_tenant_id_entry_date_idx`(`tenant_id`, `entry_date`),
    UNIQUE INDEX `journal_entries_tenant_id_entry_number_key`(`tenant_id`, `entry_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_items` (
    `id` VARCHAR(36) NOT NULL,
    `journal_entry_id` VARCHAR(36) NOT NULL,
    `account_id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `debit` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `credit` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `journal_items_journal_entry_id_idx`(`journal_entry_id`),
    INDEX `journal_items_account_id_idx`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `contract_number` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `contract_type` VARCHAR(50) NOT NULL DEFAULT 'employment',
    `party_name` VARCHAR(150) NOT NULL,
    `party_email` VARCHAR(255) NOT NULL,
    `party_phone` VARCHAR(50) NULL,
    `value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `terms_content` TEXT NOT NULL,
    `signature_data` LONGTEXT NULL,
    `signed_by_name` VARCHAR(150) NULL,
    `signed_at` DATETIME(3) NULL,
    `signature_ip` VARCHAR(50) NULL,
    `document_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contracts_tenant_id_status_idx`(`tenant_id`, `status`),
    UNIQUE INDEX `contracts_tenant_id_contract_number_key`(`tenant_id`, `contract_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_plans` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `fiscal_year` VARCHAR(20) NOT NULL,
    `period_type` VARCHAR(30) NOT NULL DEFAULT 'monthly',
    `department_id` VARCHAR(36) NULL,
    `budgeted_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `spent_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(30) NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_plans_tenant_id_fiscal_year_idx`(`tenant_id`, `fiscal_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_goals` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `goal_type` VARCHAR(50) NOT NULL DEFAULT 'revenue',
    `target_amount` DECIMAL(15, 2) NOT NULL,
    `current_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `start_date` DATE NOT NULL,
    `target_date` DATE NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `financial_goals_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `color` VARCHAR(30) NULL DEFAULT '#3b82f6',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `image` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `short_name` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_rates` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `location` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(150) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'Product',
    `sku` VARCHAR(100) NOT NULL,
    `barcode` VARCHAR(100) NULL,
    `hsn_sac` VARCHAR(50) NULL,
    `category_id` VARCHAR(36) NULL,
    `brand_id` VARCHAR(36) NULL,
    `unit_id` VARCHAR(36) NULL,
    `tax_rate_id` VARCHAR(36) NULL,
    `sale_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `purchase_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `low_stock_threshold` INTEGER NOT NULL DEFAULT 5,
    `image` VARCHAR(500) NULL,
    `additional_images` JSON NULL,
    `short_description` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_tenant_id_category_id_idx`(`tenant_id`, `category_id`),
    INDEX `products_tenant_id_is_active_idx`(`tenant_id`, `is_active`),
    UNIQUE INDEX `products_tenant_id_sku_key`(`tenant_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_warehouses` (
    `id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `warehouse_id` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_warehouses_product_id_warehouse_id_key`(`product_id`, `warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(50) NULL,
    `gstin` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'India',
    `postal_code` VARCHAR(30) NULL,
    `credit_limit` DECIMAL(15, 2) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customers_tenant_id_email_idx`(`tenant_id`, `email`),
    INDEX `customers_tenant_id_phone_idx`(`tenant_id`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(50) NULL,
    `gstin` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'India',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `suppliers_tenant_id_email_idx`(`tenant_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `invoice_no` VARCHAR(100) NOT NULL,
    `type` VARCHAR(30) NOT NULL DEFAULT 'pos',
    `customer_id` VARCHAR(36) NULL,
    `customer_name` VARCHAR(255) NULL,
    `customer_gstin` VARCHAR(50) NULL,
    `warehouse_id` VARCHAR(36) NULL,
    `cashier_id` VARCHAR(36) NULL,
    `cashier_name` VARCHAR(150) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `discount_pct` DECIMAL(5, 2) NULL,
    `discount_amt` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_mode` VARCHAR(30) NULL DEFAULT 'sgst_cgst',
    `cgst` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `sgst` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `igst` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_tax` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `payment_status` VARCHAR(30) NOT NULL DEFAULT 'paid',
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Cash',
    `notes` TEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sales_tenant_id_date_idx`(`tenant_id`, `date`),
    INDEX `sales_tenant_id_payment_status_idx`(`tenant_id`, `payment_status`),
    UNIQUE INDEX `sales_tenant_id_invoice_no_key`(`tenant_id`, `invoice_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_details` (
    `id` VARCHAR(36) NOT NULL,
    `sale_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NULL,
    `hsn_sac` VARCHAR(50) NULL,
    `unit` VARCHAR(30) NULL,
    `price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_payments` (
    `id` VARCHAR(36) NOT NULL,
    `sale_id` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `method` VARCHAR(50) NOT NULL DEFAULT 'Cash',
    `reference_no` VARCHAR(100) NULL,
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_gateway_transactions` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `sale_id` VARCHAR(36) NULL,
    `provider` VARCHAR(30) NOT NULL,
    `provider_order_id` VARCHAR(120) NOT NULL,
    `provider_payment_id` VARCHAR(120) NULL,
    `amount` DECIMAL(16, 3) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `status` VARCHAR(30) NOT NULL,
    `method` VARCHAR(50) NULL,
    `verified_at` DATETIME(3) NULL,
    `payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_gateway_transactions_provider_payment_id_key`(`provider_payment_id`),
    INDEX `payment_gateway_transactions_tenant_id_status_created_at_idx`(`tenant_id`, `status`, `created_at`),
    UNIQUE INDEX `payment_gateway_transactions_tenant_id_provider_provider_ord_key`(`tenant_id`, `provider`, `provider_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_webhook_events` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NULL,
    `provider` VARCHAR(30) NOT NULL,
    `delivery_key` VARCHAR(64) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `signature_ok` BOOLEAN NOT NULL DEFAULT false,
    `payload` JSON NOT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_webhook_events_delivery_key_key`(`delivery_key`),
    INDEX `payment_webhook_events_tenant_id_provider_received_at_idx`(`tenant_id`, `provider`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `held_orders` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `label` VARCHAR(100) NULL,
    `customer_name` VARCHAR(255) NULL,
    `cart_data` JSON NOT NULL,
    `held_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `purchase_no` VARCHAR(100) NOT NULL,
    `supplier_id` VARCHAR(36) NULL,
    `warehouse_id` VARCHAR(36) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'received',
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `payment_status` VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    `notes` TEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchases_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `purchases_tenant_id_supplier_id_idx`(`tenant_id`, `supplier_id`),
    UNIQUE INDEX `purchases_tenant_id_purchase_no_key`(`tenant_id`, `purchase_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_details` (
    `id` VARCHAR(36) NOT NULL,
    `purchase_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transfers` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `transfer_no` VARCHAR(100) NOT NULL,
    `from_warehouse_id` VARCHAR(36) NOT NULL,
    `to_warehouse_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'completed',
    `notes` TEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_transfers_tenant_id_transfer_no_key`(`tenant_id`, `transfer_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transfer_details` (
    `id` VARCHAR(36) NOT NULL,
    `transfer_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustments` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `warehouse_id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(30) NOT NULL DEFAULT 'addition',
    `reason` VARCHAR(255) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustment_details` (
    `id` VARCHAR(36) NOT NULL,
    `adjustment_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `thread_id` VARCHAR(100) NOT NULL,
    `sender_id` VARCHAR(36) NOT NULL,
    `sender_name` VARCHAR(150) NOT NULL,
    `sender_avatar` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `attachments` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_tenant_id_thread_id_idx`(`tenant_id`, `thread_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_roles` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `workspace_roles_tenant_id_name_key`(`tenant_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `resource` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_code_key`(`code`),
    INDEX `permissions_module_resource_idx`(`module`, `resource`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `permission_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role_assignments` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_role_assignments_user_id_tenant_id_key`(`user_id`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_modules` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `module_key` VARCHAR(50) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_modules_tenant_id_module_key_key`(`tenant_id`, `module_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `two_factor_otps` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `used_at` DATETIME(3) NULL,

    INDEX `two_factor_otps_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_leads` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `contact_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(50) NULL,
    `company` VARCHAR(150) NULL,
    `stage` VARCHAR(50) NOT NULL DEFAULT 'new',
    `value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `source` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `assigned_to` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `crm_leads_tenant_id_stage_idx`(`tenant_id`, `stage`),
    INDEX `crm_leads_tenant_id_email_idx`(`tenant_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_proposals` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `proposal_no` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `client_name` VARCHAR(150) NOT NULL,
    `client_email` VARCHAR(150) NULL,
    `client_gstin` VARCHAR(50) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `valid_until` DATETIME(3) NULL,
    `items` JSON NULL,
    `terms` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `crm_proposals_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `start_date` DATETIME(3) NULL,
    `due_date` DATETIME(3) NULL,
    `budget` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `client_name` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `projects_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_tasks` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'todo',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `assigned_to` VARCHAR(150) NULL,
    `due_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_tasks_tenant_id_project_id_idx`(`tenant_id`, `project_id`),
    INDEX `project_tasks_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_registers` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `warehouse_id` VARCHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'closed',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `register_shifts` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `register_id` VARCHAR(36) NOT NULL,
    `cashier_id` VARCHAR(36) NULL,
    `cashier_name` VARCHAR(150) NOT NULL,
    `opening_float` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `cash_sales` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `card_sales` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `upi_sales` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `cash_in` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `cash_out` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `expected_cash` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `actual_cash` DECIMAL(15, 2) NULL,
    `variance` DECIMAL(15, 2) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    `notes` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_types` ADD CONSTRAINT `leave_types_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_payroll_run_id_fkey` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_components` ADD CONSTRAINT `salary_components_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_structures` ADD CONSTRAINT `salary_structures_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_structure_items` ADD CONSTRAINT `salary_structure_items_structure_id_fkey` FOREIGN KEY (`structure_id`) REFERENCES `salary_structures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_structure_items` ADD CONSTRAINT `salary_structure_items_component_id_fkey` FOREIGN KEY (`component_id`) REFERENCES `salary_components`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_assignments` ADD CONSTRAINT `employee_salary_assignments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_assignments` ADD CONSTRAINT `employee_salary_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_assignments` ADD CONSTRAINT `employee_salary_assignments_structure_id_fkey` FOREIGN KEY (`structure_id`) REFERENCES `salary_structures`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_items` ADD CONSTRAINT `employee_salary_items_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `employee_salary_assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_items` ADD CONSTRAINT `employee_salary_items_component_id_fkey` FOREIGN KEY (`component_id`) REFERENCES `salary_components`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `statutory_rules` ADD CONSTRAINT `statutory_rules_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_tax_declarations` ADD CONSTRAINT `employee_tax_declarations_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_tax_declarations` ADD CONSTRAINT `employee_tax_declarations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_declaration_proofs` ADD CONSTRAINT `tax_declaration_proofs_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `employee_tax_declarations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_snapshots` ADD CONSTRAINT `payroll_snapshots_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_snapshots` ADD CONSTRAINT `payroll_snapshots_payroll_run_id_fkey` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_snapshots` ADD CONSTRAINT `payroll_snapshots_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generic_form_templates` ADD CONSTRAINT `generic_form_templates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_policy_audits` ADD CONSTRAINT `subscription_policy_audits_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_policy_audits` ADD CONSTRAINT `subscription_policy_audits_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `tenant_subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_addons` ADD CONSTRAINT `tenant_addons_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_cycles` ADD CONSTRAINT `okr_cycles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_objectives` ADD CONSTRAINT `okr_objectives_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_objectives` ADD CONSTRAINT `okr_objectives_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `okr_cycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_objectives` ADD CONSTRAINT `okr_objectives_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `okr_objectives`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_objectives` ADD CONSTRAINT `okr_objectives_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_key_results` ADD CONSTRAINT `okr_key_results_objective_id_fkey` FOREIGN KEY (`objective_id`) REFERENCES `okr_objectives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_checkins` ADD CONSTRAINT `okr_checkins_key_result_id_fkey` FOREIGN KEY (`key_result_id`) REFERENCES `okr_key_results`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_checkins` ADD CONSTRAINT `okr_checkins_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_reviews` ADD CONSTRAINT `okr_reviews_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `okr_cycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_reviews` ADD CONSTRAINT `okr_reviews_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `okr_reviews` ADD CONSTRAINT `okr_reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_categories` ADD CONSTRAINT `asset_categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_assigned_employee_id_fkey` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_requests` ADD CONSTRAINT `asset_requests_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_requests` ADD CONSTRAINT `asset_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_disposal_batches` ADD CONSTRAINT `asset_disposal_batches_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_disposal_items` ADD CONSTRAINT `asset_disposal_items_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `asset_disposal_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_disposal_items` ADD CONSTRAINT `asset_disposal_items_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_maintenance` ADD CONSTRAINT `asset_maintenance_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_activity_logs` ADD CONSTRAINT `asset_activity_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_activity_logs` ADD CONSTRAINT `asset_activity_logs_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_postings` ADD CONSTRAINT `job_postings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_postings` ADD CONSTRAINT `job_postings_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_candidates` ADD CONSTRAINT `job_candidates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_candidates` ADD CONSTRAINT `job_candidates_job_posting_id_fkey` FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_candidate_interviews` ADD CONSTRAINT `job_candidate_interviews_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `job_candidates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_candidate_interviews` ADD CONSTRAINT `job_candidate_interviews_interviewer_id_fkey` FOREIGN KEY (`interviewer_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_definitions` ADD CONSTRAINT `shift_definitions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_rosters` ADD CONSTRAINT `shift_rosters_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_rosters` ADD CONSTRAINT `shift_rosters_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_rosters` ADD CONSTRAINT `shift_rosters_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shift_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_swap_requests` ADD CONSTRAINT `shift_swap_requests_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_swap_requests` ADD CONSTRAINT `shift_swap_requests_requester_employee_id_fkey` FOREIGN KEY (`requester_employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_swap_requests` ADD CONSTRAINT `shift_swap_requests_target_employee_id_fkey` FOREIGN KEY (`target_employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_courses` ADD CONSTRAINT `training_courses_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_modules` ADD CONSTRAINT `course_modules_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `training_courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `training_courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_exits` ADD CONSTRAINT `employee_exits_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_exits` ADD CONSTRAINT `employee_exits_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exit_checklist_items` ADD CONSTRAINT `exit_checklist_items_exit_id_fkey` FOREIGN KEY (`exit_id`) REFERENCES `employee_exits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_documents` ADD CONSTRAINT `company_documents_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_documents` ADD CONSTRAINT `company_documents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `helpdesk_tickets` ADD CONSTRAINT `helpdesk_tickets_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `helpdesk_tickets` ADD CONSTRAINT `helpdesk_tickets_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `helpdesk_comments` ADD CONSTRAINT `helpdesk_comments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `helpdesk_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_support_tickets` ADD CONSTRAINT `platform_support_tickets_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_ticket_messages` ADD CONSTRAINT `platform_ticket_messages_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `platform_support_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_target_department_id_fkey` FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcement_acknowledgements` ADD CONSTRAINT `announcement_acknowledgements_announcement_id_fkey` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcement_acknowledgements` ADD CONSTRAINT `announcement_acknowledgements_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_forms` ADD CONSTRAINT `custom_forms_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_forms` ADD CONSTRAINT `custom_forms_target_department_id_fkey` FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_forms` ADD CONSTRAINT `custom_forms_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_form_id_fkey` FOREIGN KEY (`form_id`) REFERENCES `custom_forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_form_id_fkey` FOREIGN KEY (`form_id`) REFERENCES `custom_forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_response_values` ADD CONSTRAINT `form_response_values_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `form_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_response_values` ADD CONSTRAINT `form_response_values_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `form_fields`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `biometric_devices` ADD CONSTRAINT `biometric_devices_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `biometric_punch_logs` ADD CONSTRAINT `biometric_punch_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `biometric_punch_logs` ADD CONSTRAINT `biometric_punch_logs_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `biometric_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `biometric_punch_logs` ADD CONSTRAINT `biometric_punch_logs_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_items` ADD CONSTRAINT `journal_items_journal_entry_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_items` ADD CONSTRAINT `journal_items_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_plans` ADD CONSTRAINT `budget_plans_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_plans` ADD CONSTRAINT `budget_plans_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_goals` ADD CONSTRAINT `financial_goals_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_rates` ADD CONSTRAINT `tax_rates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_tax_rate_id_fkey` FOREIGN KEY (`tax_rate_id`) REFERENCES `tax_rates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_warehouses` ADD CONSTRAINT `product_warehouses_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_warehouses` ADD CONSTRAINT `product_warehouses_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_payments` ADD CONSTRAINT `sale_payments_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_webhook_events` ADD CONSTRAINT `payment_webhook_events_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `held_orders` ADD CONSTRAINT `held_orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_details` ADD CONSTRAINT `purchase_details_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_details` ADD CONSTRAINT `purchase_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_from_warehouse_id_fkey` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_to_warehouse_id_fkey` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer_details` ADD CONSTRAINT `stock_transfer_details_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer_details` ADD CONSTRAINT `stock_transfer_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustment_details` ADD CONSTRAINT `stock_adjustment_details_adjustment_id_fkey` FOREIGN KEY (`adjustment_id`) REFERENCES `stock_adjustments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustment_details` ADD CONSTRAINT `stock_adjustment_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_roles` ADD CONSTRAINT `workspace_roles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `workspace_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `workspace_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_modules` ADD CONSTRAINT `tenant_modules_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `two_factor_otps` ADD CONSTRAINT `two_factor_otps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_leads` ADD CONSTRAINT `crm_leads_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_proposals` ADD CONSTRAINT `crm_proposals_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `register_shifts` ADD CONSTRAINT `register_shifts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `register_shifts` ADD CONSTRAINT `register_shifts_register_id_fkey` FOREIGN KEY (`register_id`) REFERENCES `cash_registers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

