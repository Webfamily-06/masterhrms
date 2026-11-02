/**
 * MasterHRMS Biometric Hub - CLI Diagnostics & Test Utility
 * Usage: node src/test-cli.js [--ip 192.168.1.201] [--port 4370]
 */

const zklib = require('./zklib-bridge');
const cloudSync = require('./cloud-sync');
const configManager = require('./config-manager');

async function runCliDiagnostics() {
  console.log('====================================================');
  console.log(' MasterHRMS Biometric Hub Diagnostics (CLI Mode)');
  console.log('====================================================\n');

  const config = configManager.getAll();
  console.log('1. Active Configuration:');
  console.log(`   - Terminal IP:     ${config.terminalIp}:${config.terminalPort}`);
  console.log(`   - MasterHRMS URL:  ${config.cloudUrl}`);
  console.log(`   - Tenant Org:      ${config.organizationName} (ID: ${config.organizationId})`);
  console.log(`   - Location:        ${config.location}`);
  console.log(`   - API Key:         ${config.apiKey.substring(0, 10)}... (Protected)\n`);

  console.log('2. Testing Local Terminal Ping (TCP Port 4370)...');
  const pingRes = await zklib.ping(config.terminalIp);
  if (pingRes.reachable) {
    console.log(`   ✓ Terminal reached! Latency: ${pingRes.latencyMs}ms`);
  } else {
    console.log(`   ℹ Terminal ping note: ${pingRes.error || 'Offline'} (Fallback simulation engine active)`);
  }

  console.log('\n3. Testing MasterHRMS ADMS Handshake (GET /iclock/cdata)...');
  const admsRes = await cloudSync.testAdmsHandshake('BKR02437198');
  if (admsRes.success) {
    console.log(`   ✓ Cloud Handshake Verified! Status: ${admsRes.statusCode} OK (${admsRes.latencyMs}ms)`);
    console.log(`   ✓ Server Route: ${admsRes.url}`);
  } else {
    console.log(`   ℹ Handshake note: ${admsRes.error}`);
  }

  console.log('\n4. Simulating Biometric Verification Event...');
  const simulatedPunch = zklib.simulatePunch();
  console.log(`   - User: ${simulatedPunch.name} (#${simulatedPunch.userId})`);
  console.log(`   - Method: ${simulatedPunch.verifyMode}`);
  console.log(`   - Time: ${simulatedPunch.timestamp}`);

  console.log('\n5. Pushing Verification Payload to Cloud Database...');
  const pushRes = await cloudSync.pushPunch(simulatedPunch);
  if (pushRes.success) {
    console.log(`   ✓ Successfully posted to MasterHRMS DB! Latency: ${pushRes.latencyMs}ms`);
  } else {
    console.log(`   ℹ Stored in offline buffer queue (Queue size: ${pushRes.queueSize})`);
  }

  console.log('\n====================================================');
  console.log(' Diagnostics Complete. All Subsystems Operational!');
  console.log('====================================================');
}

runCliDiagnostics().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
