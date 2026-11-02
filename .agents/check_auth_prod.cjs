const https = require('https');

https.get('https://www.masterhrms.com/auth', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Length:', data.length);
    console.log('Includes turnstile:', data.includes('turnstile'));
    console.log('Includes challenges:', data.includes('challenges.cloudflare.com'));
    
    // Look for env vars injected or scripts
    const matches = data.match(/NEXT_PUBLIC_TURNSTILE_SITE_KEY["']?\s*[:=]\s*["']([^"']+)["']/i) ||
                    data.match(/0x4AAAAAAA[0-9a-zA-Z_-]+/g) ||
                    data.match(/1x00000000000000000000AA/g);
    console.log('Sitekey matches:', matches);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});

