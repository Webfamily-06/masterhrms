"use strict";
/**
 * Inventory Movement Domain Error Classes
 * Consistent, structured domain errors for atomic stock operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantIsolationError = exports.StockConcurrencyError = exports.WarehouseNotFoundError = exports.ProductNotFoundError = exports.InsufficientStockError = exports.InvalidQuantityError = exports.InventoryDomainError = void 0;
class InventoryDomainError extends Error {
    code;
    status;
    details;
    constructor(message, code, status = 400, details) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.status = status;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.InventoryDomainError = InventoryDomainError;
class InvalidQuantityError extends InventoryDomainError {
    constructor(message, details) {
        super(message, "INVALID_QUANTITY", 400, details);
    }
}
exports.InvalidQuantityError = InvalidQuantityError;
class InsufficientStockError extends InventoryDomainError {
    constructor(productId, warehouseId, requested, available) {
        super(`Insufficient stock for product ${productId} in warehouse ${warehouseId}. Requested: ${requested}, Available: ${available}`, "INSUFFICIENT_STOCK", 409, { productId, warehouseId, requested, available });
    }
}
exports.InsufficientStockError = InsufficientStockError;
class ProductNotFoundError extends InventoryDomainError {
    constructor(productId, tenantId) {
        super(`Product ${productId} not found in tenant workspace ${tenantId}`, "PRODUCT_NOT_FOUND", 404, { productId, tenantId });
    }
}
exports.ProductNotFoundError = ProductNotFoundError;
class WarehouseNotFoundError extends InventoryDomainError {
    constructor(warehouseId, tenantId) {
        super(`Warehouse ${warehouseId} not found in tenant workspace ${tenantId}`, "WAREHOUSE_NOT_FOUND", 404, { warehouseId, tenantId });
    }
}
exports.WarehouseNotFoundError = WarehouseNotFoundError;
class StockConcurrencyError extends InventoryDomainError {
    constructor(productId, warehouseId) {
        super(`Concurrent modification conflict while updating stock for product ${productId} in warehouse ${warehouseId}`, "STOCK_CONCURRENCY_CONFLICT", 409, { productId, warehouseId });
    }
}
exports.StockConcurrencyError = StockConcurrencyError;
class TenantIsolationError extends InventoryDomainError {
    constructor(message, details) {
        super(message, "TENANT_ISOLATION_VIOLATION", 403, details);
    }
}
exports.TenantIsolationError = TenantIsolationError;
