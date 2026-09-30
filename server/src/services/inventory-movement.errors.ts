/**
 * Inventory Movement Domain Error Classes
 * Consistent, structured domain errors for atomic stock operations
 */

export class InventoryDomainError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, status: number = 400, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidQuantityError extends InventoryDomainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "INVALID_QUANTITY", 400, details);
  }
}

export class InsufficientStockError extends InventoryDomainError {
  constructor(productId: string, warehouseId: string, requested: string, available: string) {
    super(
      `Insufficient stock for product ${productId} in warehouse ${warehouseId}. Requested: ${requested}, Available: ${available}`,
      "INSUFFICIENT_STOCK",
      409,
      { productId, warehouseId, requested, available }
    );
  }
}

export class ProductNotFoundError extends InventoryDomainError {
  constructor(productId: string, tenantId: string) {
    super(
      `Product ${productId} not found in tenant workspace ${tenantId}`,
      "PRODUCT_NOT_FOUND",
      404,
      { productId, tenantId }
    );
  }
}

export class WarehouseNotFoundError extends InventoryDomainError {
  constructor(warehouseId: string, tenantId: string) {
    super(
      `Warehouse ${warehouseId} not found in tenant workspace ${tenantId}`,
      "WAREHOUSE_NOT_FOUND",
      404,
      { warehouseId, tenantId }
    );
  }
}

export class StockConcurrencyError extends InventoryDomainError {
  constructor(productId: string, warehouseId: string) {
    super(
      `Concurrent modification conflict while updating stock for product ${productId} in warehouse ${warehouseId}`,
      "STOCK_CONCURRENCY_CONFLICT",
      409,
      { productId, warehouseId }
    );
  }
}

export class TenantIsolationError extends InventoryDomainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "TENANT_ISOLATION_VIOLATION", 403, details);
  }
}
