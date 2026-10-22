import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

async function testPagesApi() {
  const superToken = jwt.sign(
    {
      userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-1792135343884@platform.com',
      roles: ['super_admin'],
    },
    process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production',
    { expiresIn: '2h' }
  );

  const anonRes = await fetch('http://localhost:4000/api/cms/pages');
  const anonPages = await anonRes.json();
  console.log('Anonymous GET /api/cms/pages returned:', anonPages.length, 'pages');

  const authRes = await fetch('http://localhost:4000/api/cms/pages', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const authPages = await authRes.json();
  console.log('Super Admin GET /api/cms/pages returned:', authPages.length, 'pages');

  console.log('Sample auth pages:');
  authPages.slice(0, 8).forEach(p => console.log(`  - [${p.id}] ${p.slug} => "${p.title}" (published: ${p.published})`));

  // Test by-id with home page (draft)
  const homeId = 'ffa01cd1-fcd4-40d7-bd9e-a8e57b51d460';
  const byIdAuth = await fetch(`http://localhost:4000/api/cms/pages/by-id/${homeId}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  console.log(`GET /api/cms/pages/by-id/${homeId} with auth: status = ${byIdAuth.status}`);
  const byIdAuthData = await byIdAuth.json();
  console.log(`  Title: "${byIdAuthData.title}", slug: "${byIdAuthData.slug}"`);

  const byIdAnon = await fetch(`http://localhost:4000/api/cms/pages/by-id/${homeId}`);
  console.log(`GET /api/cms/pages/by-id/${homeId} anonymous: status = ${byIdAnon.status} (expected 404 for draft)`);
}

testPagesApi().catch(console.error);
