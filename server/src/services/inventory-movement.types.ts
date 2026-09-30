import { Prisma } from "@prisma/client";

/**
 * Standard Stock Movement Types
 */
export const STOCK_MOVEMENT_TYPES = {
  PURCHASE_RECEIPT: "PURCHASE_RECEIPT",
  PURCHASE_RETURN: "PURCHASE_RETURN",
  SALES_INVOICE: "SALES_INVOICE",
  POS_SALE: "POS_SALE",
  SALES_RETURN: "SALES_RETURN",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
  OPENING_STOCK: "OPENING_STOCK",
  RECONCILIATION: "RECONCILIATION",
} as const;

export type StockMovementType =
  | (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES]
  | string;

export type DecimalValue = number | string | Prisma.Decimal;

export interface StockOperationBaseParams {
  tenantId: string;
  productId: string;
  warehouseId: string;
  quantity: DecimalValue;
  movementType: StockMovementType;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface IncreaseStockParams extends StockOperationBaseParams {}

export interface DecreaseStockParams extends StockOperationBaseParams {}

export interface AdjustStockParams {
  tenantId: string;
  productId: string;
  warehouseId: string;
  direction: "addition" | "subtraction";
  quantity: DecimalValue;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdById?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface TransferStockParams {
  tenantId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: DecimalValue;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface StockOperationResult {
  movementId: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  movementType: string;
  quantityDelta: Prisma.Decimal;
  beforeQuantity: Prisma.Decimal;
  afterQuantity: Prisma.Decimal;
}

export interface TransferStockResult {
  outMovement: StockOperationResult;
  inMovement: StockOperationResult;
  fromWarehouseBalanceAfter: Prisma.Decimal;
  toWarehouseBalanceAfter: Prisma.Decimal;
}

export interface TransferItemInput {
  productId: string;
  quantity: DecimalValue;
  unitCost?: number;
}
