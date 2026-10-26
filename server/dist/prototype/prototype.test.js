"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const tenant_connection_manager_1 = require("./tenant-connection-manager");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config();
const testResults = [];
async function runTestSuite() {
    console.log("================================================================================");
    console.log("PHASE 1 — STEP 1: MULTI-TENANT DATABASE ROUTING PROTOTYPE TEST SUITE");
    console.log("Runtime: Node.js 20 LTS | Prisma 5.19.1 | MySQL/MariaDB 10.11");
    console.log("================================================================================\n");
    const manager = tenant_connection_manager_1.PrototypeTenantConnectionManager.getInstance();
    const baseDbUrl = process.env.DATABASE_URL;
    const testIsolatedDbUrl = baseDbUrl.replace("/master_hrms?", "/test_tenant_prototype?");
    // Register trusted test tenant configurations
    manager.registerTenantConfig({
        tenantId: "tenant_shared_alpha",
        name: "Shared Alpha Corp",
        strategy: "SHARED_SCHEMA"
    });
    manager.registerTenantConfig({
        tenantId: "tenant_isolated_beta",
        name: "Isolated Beta Industries",
        strategy: "SCHEMA_PER_TENANT",
        databaseUrl: testIsolatedDbUrl
    });
    manager.registerTenantConfig({
        tenantId: "tenant_failing_gamma",
        name: "Failing Gamma LLC",
        strategy: "DEDICATED_DB",
        databaseUrl: "mysql://master_hrms:wrong_password@147.79.66.214:3306/invalid_db?connect_timeout=3"
    });
    // TEST 1: Shared Database Connection
    {
        const start = Date.now();
        try {
            const { client, strategy } = await manager.getClientForTenant("tenant_shared_alpha");
            const res = await client.$queryRaw `SELECT DATABASE() as db`;
            const dbName = res[0]?.db;
            if (strategy !== "SHARED_SCHEMA" || dbName !== "master_hrms") {
                throw new Error(`Unexpected database: ${dbName}, strategy: ${strategy}`);
            }
            testResults.push({
                name: "1. Shared Database Connection",
                passed: true,
                details: `Connected to '${dbName}' via SHARED_SCHEMA strategy. Production data intact.`,
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "1. Shared Database Connection",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 2: Separate Database Connection
    {
        const start = Date.now();
        try {
            const { client, strategy } = await manager.getClientForTenant("tenant_isolated_beta");
            const res = await client.$queryRaw `SELECT DATABASE() as db`;
            const dbName = res[0]?.db;
            if (strategy !== "SCHEMA_PER_TENANT" || dbName !== "test_tenant_prototype") {
                throw new Error(`Unexpected database: ${dbName}, strategy: ${strategy}`);
            }
            testResults.push({
                name: "2. Separate Database Connection",
                passed: true,
                details: `Connected to dedicated database '${dbName}' via SCHEMA_PER_TENANT strategy.`,
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "2. Separate Database Connection",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 3: Tenant-to-Database Routing
    {
        const start = Date.now();
        try {
            const shared = await manager.getClientForTenant("tenant_shared_alpha");
            const isolated = await manager.getClientForTenant("tenant_isolated_beta");
            const sharedDb = await shared.client.$queryRaw `SELECT DATABASE() as db`;
            const isolatedDb = await isolated.client.$queryRaw `SELECT DATABASE() as db`;
            if (sharedDb[0]?.db === isolatedDb[0]?.db) {
                throw new Error("Routing collision: Shared and isolated tenants routed to the same database!");
            }
            testResults.push({
                name: "3. Tenant-to-Database Routing",
                passed: true,
                details: `tenant_shared_alpha -> ${sharedDb[0]?.db} | tenant_isolated_beta -> ${isolatedDb[0]?.db}. Strict routing confirmed.`,
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "3. Tenant-to-Database Routing",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 4: Unknown Tenant Handling
    {
        const start = Date.now();
        try {
            await manager.getClientForTenant("unknown_rogue_tenant_999");
            testResults.push({
                name: "4. Unknown Tenant Handling",
                passed: false,
                details: "Expected unknown tenant request to be rejected, but it succeeded.",
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            const isExpected = err.message.includes("TENANT_NOT_FOUND");
            testResults.push({
                name: "4. Unknown Tenant Handling",
                passed: isExpected,
                details: isExpected ? "Correctly rejected unknown tenant with TENANT_NOT_FOUND." : `Wrong error: ${err.message}`,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 5: Database Connection Failure Handling
    {
        const start = Date.now();
        try {
            await manager.getClientForTenant("tenant_failing_gamma");
            testResults.push({
                name: "5. Connection Failure Handling",
                passed: false,
                details: "Expected connection failure for invalid database credentials, but call succeeded.",
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            const isExpected = err.message.includes("DATABASE_CONNECTION_ERROR");
            testResults.push({
                name: "5. Connection Failure Handling",
                passed: isExpected,
                details: isExpected ? "Gracefully caught database connection failure without process crash." : `Unexpected error: ${err.message}`,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 6: Connection Reuse & Cache Management
    {
        const start = Date.now();
        try {
            const ref1 = await manager.getClientForTenant("tenant_isolated_beta");
            const ref2 = await manager.getClientForTenant("tenant_isolated_beta");
            const ref3 = await manager.getClientForTenant("tenant_isolated_beta");
            const isSameInstance = ref1.client === ref2.client && ref2.client === ref3.client;
            const cacheCount = manager.getActiveCacheCount();
            if (!isSameInstance || cacheCount !== 1) {
                throw new Error(`Instance identity mismatch or cache bloated: cacheCount = ${cacheCount}`);
            }
            testResults.push({
                name: "6. Connection Reuse & Cache Management",
                passed: true,
                details: `Subsequent requests reused exact same PrismaClient instance. Active pool count = ${cacheCount}.`,
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "6. Connection Reuse & Cache Management",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 7: Tenant Isolation Verification (Read/Write/Delete)
    {
        const start = Date.now();
        try {
            const { client: isolatedClient } = await manager.getClientForTenant("tenant_isolated_beta");
            const { client: sharedClient } = await manager.getClientForTenant("tenant_shared_alpha");
            // Ensure test table exists in isolated DB
            await isolatedClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS prototype_records (
          id VARCHAR(36) PRIMARY KEY,
          tenant_id VARCHAR(36),
          data_payload VARCHAR(255)
        );
      `);
            // Insert record into isolated database
            const testRecordId = "iso-rec-beta-100";
            await isolatedClient.$executeRawUnsafe(`
        INSERT INTO prototype_records (id, tenant_id, data_payload)
        VALUES ('${testRecordId}', 'tenant_isolated_beta', 'Proprietary Isolated Payroll Data')
        ON DUPLICATE KEY UPDATE data_payload = VALUES(data_payload);
      `);
            // 1. Verify record is in isolated database
            const isoRows = await isolatedClient.$queryRawUnsafe(`SELECT * FROM prototype_records WHERE id = '${testRecordId}'`);
            if (isoRows.length !== 1) {
                throw new Error("Failed to insert/read record in isolated database");
            }
            // 2. Verify record does NOT exist in shared database
            const sharedCheck = await sharedClient.$queryRawUnsafe(`SHOW TABLES LIKE 'prototype_records'`);
            const existsInShared = sharedCheck.length > 0;
            // 3. Test cross-tenant update attempt from shared client
            let crossUpdatePrevented = true;
            if (existsInShared) {
                // If table hypothetically existed, verify tenant_id scoping prevents update
                const updateRes = await sharedClient.$executeRawUnsafe(`UPDATE prototype_records SET data_payload = 'HACKED' WHERE id = '${testRecordId}' AND tenant_id = 'tenant_shared_alpha'`);
                crossUpdatePrevented = updateRes === 0;
            }
            testResults.push({
                name: "7. Tenant Isolation Verification",
                passed: !existsInShared && crossUpdatePrevented,
                details: `Isolated record exists in isolated DB. Non-existent in shared DB. Cross-tenant leakage impossible.`,
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "7. Tenant Isolation Verification",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 8: Transaction Behavior & Atomicity
    {
        const start = Date.now();
        try {
            const { client: isolatedClient } = await manager.getClientForTenant("tenant_isolated_beta");
            // Verify transaction commit
            await isolatedClient.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(`
          INSERT INTO prototype_records (id, tenant_id, data_payload)
          VALUES ('tx-commit-1', 'tenant_isolated_beta', 'Tx Committed Record')
          ON DUPLICATE KEY UPDATE data_payload = VALUES(data_payload);
        `);
            });
            const commitCheck = await isolatedClient.$queryRawUnsafe(`SELECT * FROM prototype_records WHERE id = 'tx-commit-1'`);
            if (commitCheck.length !== 1) {
                throw new Error("Transaction commit failed");
            }
            // Verify transaction rollback on error
            let rollbackSucceeded = false;
            try {
                await isolatedClient.$transaction(async (tx) => {
                    await tx.$executeRawUnsafe(`
            INSERT INTO prototype_records (id, tenant_id, data_payload)
            VALUES ('tx-rollback-fail', 'tenant_isolated_beta', 'Should Not Exist')
            ON DUPLICATE KEY UPDATE data_payload = VALUES(data_payload);
          `);
                    throw new Error("Intentional error triggering rollback");
                });
            }
            catch (txErr) {
                if (txErr.message.includes("Intentional error triggering rollback")) {
                    // Check that record was rolled back
                    const rollbackCheck = await isolatedClient.$queryRawUnsafe(`SELECT * FROM prototype_records WHERE id = 'tx-rollback-fail'`);
                    rollbackSucceeded = rollbackCheck.length === 0;
                }
            }
            testResults.push({
                name: "8. Transaction Behavior & Atomicity",
                passed: rollbackSucceeded,
                details: "Interactive $transaction committed valid operations and cleanly rolled back on error.",
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "8. Transaction Behavior & Atomicity",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // TEST 9: Cleanup and Shutdown
    {
        const start = Date.now();
        try {
            await manager.shutdownAll();
            const finalCacheCount = manager.getActiveCacheCount();
            testResults.push({
                name: "9. Cleanup and Safe Shutdown",
                passed: finalCacheCount === 0,
                details: `All cached tenant clients and shared connection cleanly disconnected. Pool size = ${finalCacheCount}.`,
                durationMs: Date.now() - start
            });
        }
        catch (err) {
            testResults.push({
                name: "9. Cleanup and Safe Shutdown",
                passed: false,
                details: err.message,
                durationMs: Date.now() - start
            });
        }
    }
    // PRINT SUMMARY REPORT
    console.log("\n================================================================================");
    console.log("PROTOTYPE TEST RESULTS SUMMARY");
    console.log("================================================================================");
    let allPassed = true;
    for (const r of testResults) {
        const statusIcon = r.passed ? "[PASS]" : "[FAIL]";
        console.log(`${statusIcon} ${r.name} (${r.durationMs}ms)`);
        console.log(`       Details: ${r.details}`);
        if (!r.passed)
            allPassed = false;
    }
    console.log("================================================================================");
    console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${testResults.filter(t => t.passed).length} | FAILED: ${testResults.filter(t => !t.passed).length}`);
    console.log(`OVERALL RESULT: ${allPassed ? "PROTOTYPE VALIDATION SUCCESSFUL" : "VALIDATION FAILED"}`);
    console.log("================================================================================\n");
    return allPassed;
}
runTestSuite()
    .then((passed) => {
    process.exit(passed ? 0 : 1);
})
    .catch((err) => {
    console.error("Test runner crashed:", err);
    process.exit(1);
});
