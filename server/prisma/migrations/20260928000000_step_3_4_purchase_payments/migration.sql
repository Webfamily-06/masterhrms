-- Step 3.4 — Purchasing Lifecycle & Accounts Payable
-- Additive migration: creates PurchasePayment ledger table and adds paymentStatus index on purchases.

-- 1. Discrete payment-installment ledger for purchase orders (mirrors sale_payments pattern)
CREATE TABLE `purchase_payments` (
  `id`              VARCHAR(36)   NOT NULL,
  `purchase_id`     VARCHAR(36)   NOT NULL,
  `tenant_id`       VARCHAR(36)   NOT NULL,
  `amount`          DECIMAL(15,2) NOT NULL,
  `method`          VARCHAR(50)   NOT NULL DEFAULT 'Bank Transfer',
  `reference_no`    VARCHAR(100)  NULL,
  `idempotency_key` VARCHAR(128)  NULL,
  `notes`           VARCHAR(255)  NULL,
  `paid_at`         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_id`   VARCHAR(36)   NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_payments_purchase_id_idempotency_key_key` (`purchase_id`, `idempotency_key`),
  KEY `purchase_payments_tenant_id_paid_at_idx` (`tenant_id`, `paid_at`),

  CONSTRAINT `purchase_payments_purchase_id_fkey`
    FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_payments_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Perf index: list purchases by payment status (needed for AP aging)
CREATE INDEX `purchases_tenant_id_payment_status_idx` ON `purchases`(`tenant_id`, `payment_status`);
