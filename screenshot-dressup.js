const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Screenshot 1: Default state
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 800 });
  page.on('console', msg => { if (msg.type() === 'error') console.log(`[error] ${msg.text()}`); });
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto('http://localhost:8080/dress-up/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/dressup-default.png' });
  console.log('Screenshot 1: default state saved');

  // Click randomize to see a fully dressed character
  await page.click('#randomizeBtn');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '/tmp/dressup-randomized.png' });
  console.log('Screenshot 2: randomized outfit saved');

  // Click a different character
  const charBtns = await page.$$('.char-btn');
  if (charBtns.length > 2) {
    await charBtns[2].click(); // Wolf
    await new Promise(r => setTimeout(r, 500));
    await page.click('#randomizeBtn');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/tmp/dressup-wolf.png' });
    console.log('Screenshot 3: wolf character saved');
  }

  // Try cat
  if (charBtns.length > 3) {
    await charBtns[3].click(); // Cat
    await new Promise(r => setTimeout(r, 500));
    await page.click('#randomizeBtn');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/tmp/dressup-cat.png' });
    console.log('Screenshot 4: cat character saved');
  }

  // Fairy
  if (charBtns.length > 5) {
    await charBtns[5].click(); // Fairy
    await new Promise(r => setTimeout(r, 500));
    await page.click('#randomizeBtn');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/tmp/dressup-fairy.png' });
    console.log('Screenshot 5: fairy character saved');
  }

  await browser.close();
  console.log('Done!');
})();
