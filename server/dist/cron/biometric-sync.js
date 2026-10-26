"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBiometricAutoSync = runBiometricAutoSync;
const prisma_1 = require("../prisma");
const zk_protocol_1 = require("../services/zk-protocol");
const biometric_routes_1 = require("../routes/biometric.routes");
const tenant_context_1 = require("../context/tenant-context");
const tenant_connection_manager_service_1 = require("../services/tenant-connection-manager.service");
async function runBiometricAutoSync() {
    console.log('[CRON] Starting biometric auto-sync...');
    try {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const devices = await db.biometricDevice.findMany({
            where: {
                status: 'online',
                autoAttendanceSync: true
            }
        });
        for (const device of devices) {
            if (!device.ipAddress)
                continue;
            console.log(`[CRON] Syncing device ${device.deviceName} (${device.ipAddress})...`);
            const zkResult = await (0, zk_protocol_1.pullAttendanceLogsFromZkDevice)(device.ipAddress, device.port || 4370, 15000);
            if (!zkResult.success) {
                console.log(`[CRON] Device ${device.deviceName} sync failed: ${zkResult.message}`);
                continue;
            }
            const tenantId = device.tenantId;
            const connectionManager = tenant_connection_manager_service_1.TenantConnectionManager.getInstance();
            const { client, strategy, status } = await connectionManager.getClientForTenant(tenantId);
            await tenant_context_1.tenantStorage.run({
                tenantId,
                userId: "system_cron_worker",
                roles: ["system_cron_worker"],
                status,
                tenancyStrategy: strategy,
                db: client,
            }, async () => {
                if (zkResult.records.length > 0) {
                    let syncedPunches = 0;
                    for (const record of zkResult.records) {
                        const bioId = String(record.employeeCode || '').trim();
                        if (!bioId)
                            continue;
                        let punchType = 'auto';
                        await (0, biometric_routes_1.processBiometricPunch)({
                            tenantId,
                            deviceId: device.id,
                            employeeCode: bioId,
                            punchTime: new Date(record.punchTime),
                            punchType,
                            verificationMode: record.verifyModeName || 'fingerprint'
                        });
                        syncedPunches++;
                    }
                    console.log(`[CRON] Device ${device.deviceName} synced ${syncedPunches} punches for tenant ${tenantId}.`);
                    await client.biometricDevice.update({
                        where: { id: device.id },
                        data: { lastSyncAt: new Date() }
                    });
                }
                else {
                    console.log(`[CRON] Device ${device.deviceName} had no new punch records.`);
                }
            });
        }
    }
    catch (err) {
        console.error('[CRON] Auto-sync failed:', err);
    }
}
