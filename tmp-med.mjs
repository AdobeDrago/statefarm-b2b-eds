/* Temporary: check Additional Resources aligns with the card row. Delete after use. */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox'],
});

const probe = async (slug, width, shotPath) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.goto(`http://localhost:3000/b2b-content/${slug}`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1800));
  const res = await page.evaluate(() => {
    const X = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return `${Math.round(r.left)}-${Math.round(r.right)}`;
    };
    const heading = [...document.querySelectorAll('h4,h3,h2')].find((e) => /Additional Resources/i.test(e.textContent));
    return {
      cards: X(document.querySelector('.cards')),
      firstCard: X(document.querySelector('.cards > div')),
      addResHeading: X(heading),
      addResLink: X(document.querySelector('.default-content-wrapper p a')),
    };
  });
  if (shotPath) await page.screenshot({ path: shotPath, fullPage: true });
  await page.close();
  return res;
};

for (const w of [430, 768, 900, 1024, 1200, 1440]) {
  console.log(`medical w=${String(w).padEnd(5)}`, JSON.stringify(await probe('medical-ebilling', w, w === 1440 ? '/tmp/med-addres.png' : null)));
}
console.log('other-ins w=1440', JSON.stringify(await probe('other-ins-carrier', 1440)));
await browser.close();
