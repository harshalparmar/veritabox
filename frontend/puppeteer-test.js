import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
       console.log('API RESPONSE ERROR:', response.status(), response.url());
    }
  });

  // Navigate to auth
  await page.goto('http://localhost:5174/auth');
  
  // Wait for load
  await page.waitForSelector('input[type="email"]');
  
  // Fill login
  await page.type('input[type="email"]', 'test2@test.com');
  await page.type('input[type="password"]', 'Password123!');
  
  // Click submit (assuming it's a button with type="submit")
  await page.click('button[type="submit"]');
  
  console.log('Clicked login...');
  
  // Wait for redirect
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('Current URL after login:', page.url());
  
  // Reload
  console.log('Reloading page...');
  await page.reload({ waitUntil: 'networkidle0' });
  
  console.log('Current URL after reload:', page.url());
  
  await new Promise(r => setTimeout(r, 3000));
  console.log('Final URL:', page.url());
  
  await browser.close();
})();
