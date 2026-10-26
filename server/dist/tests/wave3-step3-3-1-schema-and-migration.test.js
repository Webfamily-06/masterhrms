"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const tenant_models_config_1 = require("../config/tenant-models.config");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const assertions = [];
function record(id, category, name, passed, details) {
    assertions.push({ id, category, name, passed, details });
    const tag = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${tag}] ${id}: ${name}`);
    if (!passed || process.env.VERBOSE) {
        console.log(`       Details: ${details}`);
    }
}
async function runStep331Verification() {
    console.log("================================================================================");
    console.log("PHASE C — WAVE 3 — STEP 3.3.1: SCHEMA & MIGRATION VERIFICATION SUITE");
    console.log("Validating: Decimal Precisions, StockMovement Model, Tenant Classification, & Migrations");
    console.log("================================================================================\n");
    try {
        // -------------------------------------------------------------------------
        // 1. Tenant Model Classification Verification
        // -------------------------------------------------------------------------
        const isDirect = tenant_models_config_1.DIRECT_TENANT_MODELS.has("StockMovement");
        const classification = (0, tenant_models_config_1.getModelClassification)("StockMovement");
        record("TEST-1A", "Tenant Classification", "StockMovement is explicitly classified as DIRECT_TENANT", isDirect && classification === "DIRECT_TENANT", `DIRECT_TENANT_MODELS.has('StockMovement')=${isDirect}, classification=${classification}`);
        // Verify 100% AST classification of schema.prisma
        const schemaPath = path_1.default.resolve(__dirname, "../../prisma/schema.prisma");
        const schemaContent = fs_1.default.readFileSync(schemaPath, "utf8");
        const modelMatches = schemaContent.match(/^model\s+([A-Za-z0-9_]+)\s+\{/gm) || [];
        const modelNames = modelMatches.map((m) => m.replace(/^model\s+/, "").replace(/\s+\{$/, "").trim());
        const unclassified = modelNames.filter((m) => (0, tenant_models_config_1.getModelClassification)(m) === "UNKNOWN");
        record("TEST-1B", "Tenant Classification", "All models in Prisma schema are classified with 0 UNKNOWN models", unclassified.length === 0, `Total schema models: ${modelNames.length}. Unclassified: [${unclassified.join(", ")}]`);
        // -------------------------------------------------------------------------
        // 2. Decimal Quantity Column Types in MySQL
        // -------------------------------------------------------------------------
        const quantityCols = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('product_warehouses', 'stock_transfer_details', 'stock_adjustment_details')
        AND COLUMN_NAME = 'quantity'
    `);
        const colMap = new Map();
        for (const c of quantityCols) {
            colMap.set(c.TABLE_NAME, c);
        }
        const pwCol = colMap.get("product_warehouses");
        const pwValid = pwCol &&
            pwCol.DATA_TYPE === "decimal" &&
            Number(pwCol.NUMERIC_PRECISION) === 15 &&
            Number(pwCol.NUMERIC_SCALE) === 3 &&
            pwCol.IS_NULLABLE === "NO" &&
            pwCol.COLUMN_DEFAULT === "0.000";
        record("TEST-2A", "Decimal Precision", "product_warehouses.quantity is DECIMAL(15, 3) NOT NULL DEFAULT 0.000", Boolean(pwValid), `Found: DATA_TYPE=${pwCol?.DATA_TYPE}, PRECISION=${pwCol?.NUMERIC_PRECISION}, SCALE=${pwCol?.NUMERIC_SCALE}, DEFAULT=${pwCol?.COLUMN_DEFAULT}`);
        const stCol = colMap.get("stock_transfer_details");
        const stValid = stCol &&
            stCol.DATA_TYPE === "decimal" &&
            Number(stCol.NUMERIC_PRECISION) === 15 &&
            Number(stCol.NUMERIC_SCALE) === 3 &&
            stCol.IS_NULLABLE === "NO" &&
            stCol.COLUMN_DEFAULT === "1.000";
        record("TEST-2B", "Decimal Precision", "stock_transfer_details.quantity is DECIMAL(15, 3) NOT NULL DEFAULT 1.000", Boolean(stValid), `Found: DATA_TYPE=${stCol?.DATA_TYPE}, PRECISION=${stCol?.NUMERIC_PRECISION}, SCALE=${stCol?.NUMERIC_SCALE}, DEFAULT=${stCol?.COLUMN_DEFAULT}`);
        const saCol = colMap.get("stock_adjustment_details");
        const saValid = saCol &&
            saCol.DATA_TYPE === "decimal" &&
            Number(saCol.NUMERIC_PRECISION) === 15 &&
            Number(saCol.NUMERIC_SCALE) === 3 &&
            saCol.IS_NULLABLE === "NO" &&
            saCol.COLUMN_DEFAULT === "1.000";
        record("TEST-2C", "Decimal Precision", "stock_adjustment_details.quantity is DECIMAL(15, 3) NOT NULL DEFAULT 1.000", Boolean(saValid), `Found: DATA_TYPE=${saCol?.DATA_TYPE}, PRECISION=${saCol?.NUMERIC_PRECISION}, SCALE=${saCol?.NUMERIC_SCALE}, DEFAULT=${saCol?.COLUMN_DEFAULT}`);
        // -------------------------------------------------------------------------
        // 3. StockMovement Table Structure, Relations, and Indexes
        // -------------------------------------------------------------------------
        const smTable = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'
    `);
        record("TEST-3A", "StockMovement Model", "Table stock_movements exists in local database", smTable.length > 0, `Table search returned ${smTable.length} tables`);
        const smCols = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'
    `);
        const smColNames = new Set(smCols.map((c) => c.COLUMN_NAME));
        const requiredCols = [
            "id",
            "tenant_id",
            "product_id",
            "warehouse_id",
            "movement_type",
            "quantity",
            "before_quantity",
            "after_quantity",
            "reference_type",
            "reference_id",
            "notes",
            "created_by_id",
            "created_at",
        ];
        const missingCols = requiredCols.filter((rc) => !smColNames.has(rc));
        record("TEST-3B", "StockMovement Model", "All 13 required columns exist in stock_movements", missingCols.length === 0, `Missing columns: [${missingCols.join(", ")}]`);
        // Verify foreign keys and delete behaviors
        const fkeys = await prisma.$queryRawUnsafe(`
      SELECT kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, rc.DELETE_RULE
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = 'stock_movements'
    `);
        const fkMap = new Map();
        for (const fk of fkeys) {
            fkMap.set(fk.COLUMN_NAME, { table: fk.REFERENCED_TABLE_NAME, rule: fk.DELETE_RULE });
        }
        const tenantFk = fkMap.get("tenant_id");
        const productFk = fkMap.get("product_id");
        const warehouseFk = fkMap.get("warehouse_id");
        const fkValid = tenantFk?.table === "tenants" &&
            tenantFk?.rule === "CASCADE" &&
            productFk?.table === "products" &&
            (productFk?.rule === "RESTRICT" || productFk?.rule === "NO ACTION") &&
            warehouseFk?.table === "warehouses" &&
            (warehouseFk?.rule === "RESTRICT" || warehouseFk?.rule === "NO ACTION");
        record("TEST-3C", "StockMovement Model", "Foreign keys enforce CASCADE on tenant and RESTRICT on product & warehouse", Boolean(fkValid), `tenant_id: ${tenantFk?.table} (${tenantFk?.rule}), product_id: ${productFk?.table} (${productFk?.rule}), warehouse_id: ${warehouseFk?.table} (${warehouseFk?.rule})`);
        // Verify indexes
        const indexes = await prisma.$queryRawUnsafe(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'
    `);
        const indexNames = new Set(indexes.map((i) => i.INDEX_NAME));
        const hasIdx1 = indexNames.has("stock_movements_tenant_id_product_id_warehouse_id_idx");
        const hasIdx2 = indexNames.has("stock_movements_tenant_id_reference_type_reference_id_idx");
        const hasIdx3 = indexNames.has("stock_movements_tenant_id_created_at_idx");
        record("TEST-3D", "StockMovement Model", "Expected composite indexes exist on stock_movements", hasIdx1 && hasIdx2 && hasIdx3, `Indexes: pw_idx=${hasIdx1}, ref_idx=${hasIdx2}, date_idx=${hasIdx3}`);
        // -------------------------------------------------------------------------
        // 4. Step 3.2 Regression Integrity
        // -------------------------------------------------------------------------
        const fiscalYearsExist = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('fiscal_years', 'accounting_periods')
    `);
        const coaParentCol = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chart_of_accounts' AND COLUMN_NAME = 'parent_account_id'
    `);
        const step32Intact = fiscalYearsExist[0].cnt >= 2 && coaParentCol.length > 0;
        record("TEST-4A", "Step 3.2 Regression", "Step 3.2 fiscal_years, accounting_periods, and chart_of_accounts.parent_account_id remain intact", step32Intact, `Tables count=${fiscalYearsExist[0].cnt}, parent_account_id found=${coaParentCol.length > 0}`);
        // -------------------------------------------------------------------------
        // 5. Prisma Migration Record Verification
        // -------------------------------------------------------------------------
        const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      WHERE migration_name LIKE '%wave3_step3_3_1%'
    `);
        const migValid = migrations.length > 0 &&
            migrations[0].finished_at !== null &&
            migrations[0].rolled_back_at === null;
        record("TEST-5A", "Migration Integrity", "Migration wave3_step3_3_1_inventory_decimal_and_stock_movement is recorded and applied", Boolean(migValid), `Records found: ${migrations.length}. Name=${migrations[0]?.migration_name}, finished=${migrations[0]?.finished_at}`);
        // -------------------------------------------------------------------------
        // 6. Safe Fractional Decimal Read/Write Verification (Rolled back)
        // -------------------------------------------------------------------------
        let fractionalSupported = false;
        let fractionalEvidence = "";
        try {
            await prisma.$transaction(async (tx) => {
                // Find existing tenant
                const tenant = await tx.tenant.findFirst();
                if (!tenant)
                    throw new Error("No tenant found");
                // Create temporary product and warehouse inside tx
                const tempProd = await tx.product.create({
                    data: {
                        tenantId: tenant.id,
                        name: "Temp Audit Decimal Product",
                        sku: `TEMP-DEC-${Date.now()}`,
                        salePrice: new client_1.Prisma.Decimal("100.00"),
                        purchasePrice: new client_1.Prisma.Decimal("50.00"),
                    },
                });
                const tempWh = await tx.warehouse.create({
                    data: {
                        tenantId: tenant.id,
                        name: "Temp Audit Warehouse",
                    },
                });
                // Insert ProductWarehouse with 3 decimal places
                const pw = await tx.productWarehouse.create({
                    data: {
                        productId: tempProd.id,
                        warehouseId: tempWh.id,
                        quantity: new client_1.Prisma.Decimal("123.456"),
                    },
                });
                // Insert StockMovement with 3 decimal places
                const sm = await tx.stockMovement.create({
                    data: {
                        tenantId: tenant.id,
                        productId: tempProd.id,
                        warehouseId: tempWh.id,
                        movementType: "OPENING_STOCK",
                        quantity: new client_1.Prisma.Decimal("123.456"),
                        beforeQuantity: new client_1.Prisma.Decimal("0.000"),
                        afterQuantity: new client_1.Prisma.Decimal("123.456"),
                        notes: "Decimal test",
                    },
                });
                if (pw.quantity.toString() === "123.456" && sm.quantity.toString() === "123.456") {
                    fractionalSupported = true;
                    fractionalEvidence = `PW quantity: ${pw.quantity.toString()}, SM quantity: ${sm.quantity.toString()}`;
                }
                else {
                    fractionalEvidence = `Mismatch: PW=${pw.quantity.toString()}, SM=${sm.quantity.toString()}`;
                }
                // Always throw to rollback and leave DB completely clean
                throw new Error("__AUDIT_CLEANUP_ROLLBACK__");
            });
        }
        catch (e) {
            if (e.message !== "__AUDIT_CLEANUP_ROLLBACK__") {
                fractionalEvidence = `Unexpected error: ${e.message}`;
            }
        }
        record("TEST-6A", "Decimal Precision", "Prisma and MySQL successfully preserve exact 3 decimal places without rounding", fractionalSupported, fractionalEvidence);
    }
    catch (err) {
        console.error("Fatal error during test suite:", err);
    }
    finally {
        await prisma.$disconnect();
    }
    console.log("\n================================================================================");
    console.log("TEST RESULTS SUMMARY");
    console.log("================================================================================");
    const total = assertions.length;
    const passed = assertions.filter((a) => a.passed).length;
    const failed = total - passed;
    console.log(`TOTAL ASSERTIONS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("================================================================================");
    if (failed > 0) {
        process.exit(1);
    }
}
runStep331Verification();
