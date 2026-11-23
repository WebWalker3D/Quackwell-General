// Measures steady-state FPS for a URL at a given size (auto-res off) over a few seconds.
import { chromium } from 'playwright';
const [url, size = '1920x1080', secs = '6'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url);
await page.waitForFunction(() => window.__ready === true);
await page.waitForTimeout(1500);
const r = await page.evaluate(async (secs) => {
  const eng = window.__engine;
  eng.autoRes = false; eng.renderScale = 1; eng.resize();
  await new Promise((r) => setTimeout(r, 800));
  let n = 0; const t0 = performance.now();
  await new Promise((res) => { const f = () => { n++; if (performance.now() - t0 < secs * 1000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const ms = (performance.now() - t0) / n;
  const info = eng.renderer.info.render;
  return { fps: (1000 / ms).toFixed(1), ms: ms.toFixed(2), q: eng.quality, calls: info.calls, tris: info.triangles };
}, Number(secs));
console.log(size, JSON.stringify(r));
await browser.close();
