import { prisma } from '../prisma';
import { pullAttendanceLogsFromZkDevice } from '../services/zk-protocol';
import { processBiometricPunch } from '../routes/biometric.routes';
import { tenantStorage } from '../context/tenant-context';
import { TenantConnectionManager } from '../services/tenant-connection-manager.service';

export async function runBiometricAutoSync() {
  console.log('[CRON] Starting biometric auto-sync...');
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: { 
        status: 'online',
        autoAttendanceSync: true
      }
    });

    for (const device of devices) {
      if (!device.ipAddress) continue;
      
      console.log(`[CRON] Syncing device ${device.deviceName} (${device.ipAddress})...`);
      
      const zkResult = await pullAttendanceLogsFromZkDevice(device.ipAddress, device.port || 4370, 15000);
      if (!zkResult.success) {
        console.log(`[CRON] Device ${device.deviceName} sync failed: ${zkResult.message}`);
        continue;
      }

      const tenantId = device.tenantId;
      const connectionManager = TenantConnectionManager.getInstance();
      const { client, strategy, status } = await connectionManager.getClientForTenant(tenantId);

      await tenantStorage.run(
        {
          tenantId,
          userId: "system_cron_worker",
          roles: ["system_cron_worker"],
          status,
          tenancyStrategy: strategy,
          db: client,
        },
        async () => {
          if (zkResult.records.length > 0) {
            let syncedPunches = 0;
            for (const record of zkResult.records) {
              const bioId = String(record.employeeCode || '').trim();
              if (!bioId) continue;
              
              let punchType = 'auto';
              
              await processBiometricPunch({
                tenantId,
                deviceId: device.id,
                employeeCode: bioId,
                punchTime: new Date(record.punchTime),
                punchType,
                verificationMode: (record.verifyModeName as any) || 'fingerprint'
              });
              syncedPunches++;
            }
            console.log(`[CRON] Device ${device.deviceName} synced ${syncedPunches} punches for tenant ${tenantId}.`);
            
            await client.biometricDevice.update({
              where: { id: device.id },
              data: { lastSyncAt: new Date() }
            });
          } else {
            console.log(`[CRON] Device ${device.deviceName} had no new punch records.`);
          }
        }
      );
    }
  } catch (err) {
    console.error('[CRON] Auto-sync failed:', err);
  }
}
