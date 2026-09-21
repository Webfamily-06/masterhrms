import { prisma } from '../prisma';
import { pullAttendanceLogsFromZkDevice } from '../services/zk-protocol';
import { processBiometricPunch } from '../routes/biometric.routes';

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
        console.log(`[CRON] Device ${device.deviceName} synced ${syncedPunches} punches.`);
        
        await prisma.biometricDevice.update({
          where: { id: device.id },
          data: { lastSyncAt: new Date() }
        });
      } else {
        console.log(`[CRON] Device ${device.deviceName} had no new punch records.`);
      }
    }
  } catch (err) {
    console.error('[CRON] Auto-sync failed:', err);
  }
}
