const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/certificate-studio/branding/primary-logo',
  method: 'GET',
  headers: {
    'x-tenant-id': 'tenant-default-001',
    'x-user-id': 'user-hr-001'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();

