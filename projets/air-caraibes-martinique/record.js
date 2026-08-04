const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: __dirname + '/video', size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(__dirname, 'animatic.html'));
  // fullscreen the player: hide everything except the 16:9 screen
  await page.addStyleTag({ content: `
    body>.wrap>*:not(.screen){display:none!important;}
    .wrap{max-width:none;padding:0;margin:0;}
    .screen{position:fixed;inset:0;border-radius:0;aspect-ratio:auto;box-shadow:none;}
  `});
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('btn').click(); }); // play
  await page.waitForTimeout(92000); // 90 s + tail
  await ctx.close();
  await browser.close();
  console.log('recorded');
})();
