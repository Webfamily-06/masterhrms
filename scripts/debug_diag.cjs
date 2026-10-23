const { chromium } = require('playwright');
const http = require('http');

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'gowthamtooquik@gmail.com',
      password: 'admin123'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function test() {
  const auth = await getAuthToken();
  const token = auth.token || (auth.data && auth.data.token);
  const user = auth.user || (auth.data && auth.data.user);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message, err.stack));

  await page.goto('http://localhost:5173/auth');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  console.log('Navigating to http://localhost:5173/apps/file-manager/list-view...');
  await page.goto('http://localhost:5173/apps/file-manager/list-view', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(4000);
  
  const text = await page.innerText('body');
  console.log('PAGE TEXT SNIPPET:\n', text.slice(0, 1000));

  const diagButton = await page.$('text=Show technical diagnostic');
  if (diagButton) {
    await diagButton.click();
    await page.waitForTimeout(500);
    const diagDetails = await page.innerText('body');
    console.log('DIAGNOSTIC DETAILS:\n', diagDetails);
  }

  await browser.close();
}
test().catch(console.error);
