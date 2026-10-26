const { chromium } = require("playwright");

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("LOG:", msg.text()));
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      console.log(`API ${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  try {
    await page.goto("http://master.localhost:3000/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', "gowthamtooquik@gmail.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Sign In")');

    await page.waitForTimeout(4000);
    console.log("After login URL:", page.url());
    console.log("After login Title:", await page.title());
    const body = await page.locator("body").innerText();
    console.log("After login Body:\n", body.slice(0, 1000));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
