const http = require('http');
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function main() {
  // Find a tenant
  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'default';

  // Find an admin user
  const user = await prisma.user.findFirst();
  const userId = user ? user.id : 'user-1';

  const token = jwt.sign(
    { userId, tenantId, email: user?.email || 'admin@example.com', roles: ['admin', 'hr_admin'] },
    secret,
    { expiresIn: '1h' }
  );

  function fetchWithAuth(path) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:4000${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Host': 'localhost:4000'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.end();
    });
  }

  console.log('Testing with authenticated JWT (Tenant: ' + tenantId + '):');
  const res2026 = await fetchWithAuth('/api/v1/hr/payroll/tax/declarations?financialYear=2026-2027');
  console.log('2026-2027 API Response Status:', res2026.status);
  try {
    const parsed = JSON.parse(res2026.body);
    console.log('2026-2027 Declarations count:', parsed.declarations ? parsed.declarations.length : parsed);
  } catch {
    console.log('Raw body:', res2026.body.slice(0, 200));
  }

  const res2024 = await fetchWithAuth('/api/v1/hr/payroll/tax/declarations?financialYear=2024-2025');
  console.log('2024-2025 API Response Status:', res2024.status);
  try {
    const parsed = JSON.parse(res2024.body);
    console.log('2024-2025 Declarations count:', parsed.declarations ? parsed.declarations.length : parsed);
  } catch {
    console.log('Raw body:', res2024.body.slice(0, 200));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
