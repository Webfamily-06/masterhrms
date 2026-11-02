const fs = require('fs');

async function check() {
  const urls = [
    'https://www.masterhrms.com',
    'https://masterhrms.com',
    'https://www.masterhrms.com/favicon.webp',
    'https://www.masterhrms.com/robots.txt',
    'https://www.masterhrms.com/sitemap.xml'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, redirect: 'manual' });
      console.log('=== ' + url + ' ===');
      console.log('Status:', res.status, res.statusText);
      console.log('Content-Type:', res.headers.get('content-type'));
      console.log('Location:', res.headers.get('location'));
      console.log('ETag / Cache-Control:', res.headers.get('etag'), '|', res.headers.get('cache-control'));
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text') || ct.includes('html') || ct.includes('xml')) {
        const text = await res.text();
        console.log('Body length:', text.length);
        const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) console.log('Title:', titleMatch[1]);
        const descMatch = text.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (descMatch) console.log('Description:', descMatch[1]);
        const ogTitle = text.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitle) console.log('og:title:', ogTitle[1]);
        const ogDesc = text.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
        if (ogDesc) console.log('og:description:', ogDesc[1]);
        const ogImage = text.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImage) console.log('og:image:', ogImage[1]);
        const canonical = text.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
        if (canonical) console.log('canonical:', canonical[1]);
        const iconMatches = text.match(/<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi);
        if (iconMatches) console.log('Icon tags:', iconMatches);
        const appleIconMatches = text.match(/<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*>/gi);
        if (appleIconMatches) console.log('Apple icon tags:', appleIconMatches);
        const nexsasMatches = text.match(/nexsas/gi);
        if (nexsasMatches) console.log('Nexsas occurrences in HTML:', nexsasMatches.length);
      } else {
        const buf = await res.arrayBuffer();
        console.log('Binary payload length (bytes):', buf.byteLength);
      }
    } catch (e) {
      console.error('Error fetching ' + url + ':', e.message);
    }
  }
}
check();

