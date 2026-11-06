const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_admin'],
      permissions: user.permissions || ['*']
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

async function main() {
  const hrToken = makeToken({
    id: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId: 'tenant-default-001',
    roles: ['hr_admin'],
    permissions: ['*']
  });

  const payload = JSON.stringify({
    nomineeId: '07268c41-2493-4229-a9f2-3388d3428b9b', // Marcus Vance
    awardTypeId: 'ef2452d7-c855-4e1b-8365-124ecf52fbd0', // Leadership Excellence
    reason: 'Trace nomination workflow submission test',
    nominationSource: 'HR'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/awards/nominations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': `Bearer ${hrToken}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response body:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(payload);
  req.end();
}

main();
