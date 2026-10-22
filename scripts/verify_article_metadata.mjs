// Verification script for public blog metadata and sharing endpoints
async function run() {
  const url = 'http://localhost:3000/blog/next-gen-payroll-engine-2026';
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  const html = await res.text();
  console.log('HTTP Status:', res.status);

  // Title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'NOT FOUND');

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  console.log('Meta Description:', descMatch ? descMatch[1] : 'NOT FOUND');

  // Canonical link
  const canonMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  console.log('Canonical:', canonMatch ? canonMatch[1] : 'NOT FOUND');

  // Open Graph
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const ogUrl = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  const ogType = html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i);
  const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  console.log('OG Title:', ogTitle ? ogTitle[1] : 'NOT FOUND');
  console.log('OG Description:', ogDesc ? ogDesc[1] : 'NOT FOUND');
  console.log('OG URL:', ogUrl ? ogUrl[1] : 'NOT FOUND');
  console.log('OG Type:', ogType ? ogType[1] : 'NOT FOUND');
  console.log('OG Image:', ogImg ? ogImg[1] : 'NOT FOUND');

  // Twitter
  const twCard = html.match(/<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']+)["']/i);
  const twTitle = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  const twDesc = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
  const twImg = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  console.log('Twitter Card:', twCard ? twCard[1] : 'NOT FOUND');
  console.log('Twitter Title:', twTitle ? twTitle[1] : 'NOT FOUND');
  console.log('Twitter Description:', twDesc ? twDesc[1] : 'NOT FOUND');
  console.log('Twitter Image:', twImg ? twImg[1] : 'NOT FOUND');

  // Share Links
  const linkedinMatch = html.match(/href="([^"]*linkedin\.com\/sharing\/share-offsite\/[^"]*)"/);
  const facebookMatch = html.match(/href="([^"]*facebook\.com\/sharer\/sharer\.php[^"]*)"/);
  const twitterMatch = html.match(/href="([^"]*twitter\.com\/intent\/tweet[^"]*)"/);
  const whatsappMatch = html.match(/href="([^"]*whatsapp\.com\/send[^"]*)"/);
  const emailMatch = html.match(/href="(mailto:\?[^"]*)"/);
  console.log('LinkedIn Share:', linkedinMatch ? linkedinMatch[1] : 'NOT FOUND');
  console.log('Facebook Share:', facebookMatch ? facebookMatch[1] : 'NOT FOUND');
  console.log('Twitter Share:', twitterMatch ? twitterMatch[1] : 'NOT FOUND');
  console.log('WhatsApp Share:', whatsappMatch ? whatsappMatch[1] : 'NOT FOUND');
  console.log('Email Share:', emailMatch ? emailMatch[1] : 'NOT FOUND');

  // Check for Copy Link button
  const copyBtn = html.includes('Copy Link');
  console.log('Copy Link Button Present:', copyBtn);
}

run().catch(console.error);
