const { chromium } = require('playwright');
const path = require('path');
const MID = [4, 11, 18, 28, 42, 57, 71, 84];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'animatic.html'));
  await page.addStyleTag({ content: `
    body>.wrap>*:not(.screen){display:none!important;}
    .wrap{max-width:none;padding:0;margin:0;}
    .screen{position:fixed;inset:0;border-radius:0;aspect-ratio:auto;box-shadow:none;}
    .label,.vo,.note,.tc,.title{display:none!important;}
    .scene{transition:none!important;}
  `});
  for (let i = 0; i < 8; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('.scene').forEach((sc, j) => sc.classList.toggle('on', j === idx));
    }, i);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(__dirname, 'stills', `seq${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  await browser.close();
  console.log('stills ok');
})();
