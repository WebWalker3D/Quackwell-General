// Usage: node scripts/shot.mjs <url> <out.png> [waitMs] [WxH]
// Waits for window.__ready (set by the app once the first frames rendered), then screenshots.
import { chromium } from 'playwright';

const [url, out, waitMs = '1500', size = '1600x900'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [waitMs] [WxH]');
  process.exit(2);
}
const [width, height] = size.split('x').map(Number);
const gpu = process.env.SHOT_GPU !== '0';
const browser = await chromium.launch({
  args: gpu
    ? ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-unsafe-swiftshader']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width, height } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
try {
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
} catch {
  logs.push('[shot] timed out waiting for window.__ready');
}
await page.waitForTimeout(Number(waitMs));
const info = await page.evaluate(() => window.__info?.() ?? null).catch(() => null);
await page.screenshot({ path: out });
await browser.close();
if (info) console.log('info:', JSON.stringify(info));
for (const l of logs.slice(-30)) console.log(l);
console.log('saved', out);
