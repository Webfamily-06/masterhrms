const fs = require('fs');
const path = require('path');

const homeHtml = 'CMS/.next/server/app/index.html';
if (fs.existsSync(homeHtml)) {
  const html = fs.readFileSync(homeHtml, 'utf8');
  console.log('Home HTML length:', html.length);
  const title = html.match(/<title>([^<]+)<\/title>/);
  console.log('Built Home Title:', title ? title[1] : 'NOT FOUND');
  const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/);
  console.log('Built Home Description:', desc ? desc[1] : 'NOT FOUND');
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/);
  console.log('Built Home og:title:', ogTitle ? ogTitle[1] : 'NOT FOUND');
  const ogImg = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/);
  console.log('Built Home og:image:', ogImg ? ogImg[1] : 'NOT FOUND');
  const ogSiteName = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/);
  console.log('Built Home og:site_name:', ogSiteName ? ogSiteName[1] : 'NOT FOUND');
  const twitterImg = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/);
  console.log('Built Home twitter:image:', twitterImg ? twitterImg[1] : 'NOT FOUND');
  const iconMatches = html.match(/<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi);
  console.log('Built Home icon tags:', iconMatches);
  const appleMatches = html.match(/<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*>/gi);
  console.log('Built Home apple-touch-icon tags:', appleMatches);
  const jsonLd = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  console.log('Built Home JSON-LD structured data:', jsonLd ? jsonLd[1].slice(0, 300) : 'NOT FOUND');
  const nexsasMatches = html.match(/nexsas/gi);
  console.log('Nexsas occurrences in built HTML:', nexsasMatches ? nexsasMatches.length : 0);
} else {
  console.log('index.html not found, checking .next files:');
  const entries = fs.readdirSync('CMS/.next/server/app');
  console.log(entries.slice(0, 30));
}

const robotsBody = 'CMS/.next/server/app/robots.txt.body';
if (fs.existsSync(robotsBody)) {
  console.log('\n--- Built robots.txt ---');
  console.log(fs.readFileSync(robotsBody, 'utf8'));
}

const sitemapBody = 'CMS/.next/server/app/sitemap.xml.body';
if (fs.existsSync(sitemapBody)) {
  console.log('\n--- Built sitemap.xml ---');
  console.log(fs.readFileSync(sitemapBody, 'utf8').slice(0, 500));
}

