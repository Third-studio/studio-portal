const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'cards.html'));
  for (let i = 1; i <= 6; i++) {
    const el = await page.$('#c' + i);
    await el.screenshot({ path: path.join(__dirname, 'stills', 'card' + i + '.jpg'), type: 'jpeg', quality: 92 });
  }
  await browser.close();
  console.log('cards ok');
})();
