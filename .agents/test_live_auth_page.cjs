const { chromium } = require('playwright');

async function testLiveAuth() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  const requests = [];
  page.on('request', req => {
    requests.push(`${req.method()} ${req.url()}`);
  });

  console.log('Navigating to https://www.masterhrms.com/auth ...');
  try {
    await page.goto('https://www.masterhrms.com/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    console.log('--- CONSOLE LOGS ---');
    consoleLogs.forEach(l => console.log(l));

    console.log('--- FAILED REQUESTS ---');
    failedRequests.forEach(r => console.log(r));

    // Check Turnstile elements
    const turnstileSlot = await page.$('.cf-turnstile-slot');
    console.log('Turnstile slot found:', !!turnstileSlot);

    const iframes = await page.$$('iframe');
    console.log('Number of iframes:', iframes.length);
    for (const frame of iframes) {
      const src = await frame.getAttribute('src');
      console.log('Iframe src:', src);
    }

    // Check button state
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      const text = await submitBtn.innerText();
      const isDisabled = await submitBtn.isDisabled();
      console.log('Submit button text:', text);
      console.log('Submit button disabled:', isDisabled);
    } else {
      console.log('Submit button not found!');
    }

    // Now let us simulate user typing in email and password
    console.log('\n--- SIMULATING USER TYPING ---');
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.fill('admin@masterhrms.com');
      await page.waitForTimeout(500);
      await passwordInput.fill('Admin123456!');
      await page.waitForTimeout(1000);

      const isDisabledAfterTyping = await submitBtn.isDisabled();
      console.log('Submit button disabled after typing:', isDisabledAfterTyping);

      console.log('Clicking Submit button...');
      await submitBtn.click({ force: true });
      await page.waitForTimeout(3000);

      console.log('\n--- CONSOLE LOGS AFTER CLICK ---');
      consoleLogs.slice(-10).forEach(l => console.log(l));

      console.log('\n--- ALL /api REQUESTS MADE ---');
      requests.filter(r => r.includes('/api/')).forEach(r => console.log(r));
    }

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testLiveAuth();

