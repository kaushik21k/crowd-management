const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  
  // Click on "Sign In"
  console.log("Clicking Sign In...");
  await page.click('text=Sign In');
  await page.waitForTimeout(500);

  // Click on "Citizen Pass"
  console.log("Clicking Citizen Pass...");
  await page.click('text=Citizen Pass');
  await page.waitForTimeout(500);
  
  await browser.close();
})();
