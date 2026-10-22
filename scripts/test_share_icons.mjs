import { chromium } from 'playwright';

async function testShareIcons() {
  console.log('Testing Blog Share Options with custom SVG icons...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // Navigate to a published public article
    const blogUrl = 'http://localhost:3000/blog/9e4024da-a26d-461d-8032-3596d8670385';
    console.log(`Navigating to: ${blogUrl}`);
    await page.goto(blogUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=Share this article', { state: 'visible', timeout: 15000 });
    console.log('✓ "Share this article" section found.');

    // 1. LinkedIn
    const linkedinImg = page.locator('a[title="Share on LinkedIn"] img').first();
    const linkedinSrc = await linkedinImg.getAttribute('src');
    const linkedinVisible = await linkedinImg.isVisible();
    console.log(`LinkedIn icon src: ${linkedinSrc}, visible: ${linkedinVisible}`);

    // 2. Facebook
    const fbImg = page.locator('a[title="Share on Facebook"] img').first();
    const fbSrc = await fbImg.getAttribute('src');
    const fbVisible = await fbImg.isVisible();
    console.log(`Facebook icon src: ${fbSrc}, visible: ${fbVisible}`);

    // 3. WhatsApp
    const waImg = page.locator('a[title="Share on WhatsApp"] img').first();
    const waSrc = await waImg.getAttribute('src');
    const waVisible = await waImg.isVisible();
    console.log(`WhatsApp icon src: ${waSrc}, visible: ${waVisible}`);

    const allPassed = 
      linkedinVisible && linkedinSrc.includes('/Login/linkedin.svg') &&
      fbVisible && fbSrc.includes('/Login/facebook-login.svg') &&
      waVisible && waSrc.includes('/Integration/whatsapp.svg');

    if (allPassed) {
      console.log('\n=============================================');
      console.log('✓ ALL BLOG SHARE ICONS SUCCESSFULLY VERIFIED!');
      console.log('=============================================');
    } else {
      throw new Error('One or more share icons failed verification!');
    }
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testShareIcons();
