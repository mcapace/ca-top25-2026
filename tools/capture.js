// Captures the documentation screenshots and a frame-by-frame recording of the hero and No. 1 reveal.
// Usage: serve the folder (python3 -m http.server 8767) then: node tools/capture.js <output dir>
// Frames are stepped, not screen-recorded, so the film shows the designed motion rather than this machine's frame rate.
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const out = path.resolve(process.argv[2] || "docs/media"), frames = path.join(out, "_frames");
fs.mkdirSync(frames, { recursive: true });
const U = "http://localhost:8767/index.html?full&stage=";
const args = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"];
(async () => {
  const b = await chromium.launch({ args });
  const open = async (w, h, stage, opt = {}) => { const c = await b.newContext({ viewport: { width: w, height: h }, ...opt }); const p = await c.newPage(); await p.goto(U + stage, { waitUntil: "load" }); await p.waitForFunction(() => window.__stage, null, { timeout: 30000 }); await p.waitForTimeout(1500); return p; };
  const shot = (p, name) => p.screenshot({ path: path.join(out, name + ".jpg"), type: "jpeg", quality: 86 });
  const travel = (p) => p.evaluate(() => document.getElementById("hero").offsetHeight - document.getElementById("heroPin").offsetHeight);
  const to = async (p, y) => { await p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), y); await p.waitForTimeout(450); };

  for (const [tag, w, h, opt] of [["desktop", 1440, 900, {}], ["phone", 390, 844, { deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const p = await open(w, h, 3, opt), H = await travel(p);
    await shot(p, `${tag}-1-hero-sealed`); await to(p, H * 0.5); await shot(p, `${tag}-2-hero-opening`); await to(p, H * 0.97); await shot(p, `${tag}-3-hero-collection`);
    await to(p, 0); await p.click('[data-stage="4"]'); await p.evaluate(() => window.__seekReveal(2.3)); await p.waitForTimeout(700); await shot(p, `${tag}-4-reveal-opening`);
    await p.evaluate(() => window.__seekReveal(5.4)); await p.waitForTimeout(1300); await shot(p, `${tag}-5-reveal-final`); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    await p.click('[data-stage="3"]'); await p.click('[data-view="humidor"]'); await p.evaluate(() => document.getElementById("tools").scrollIntoView({ behavior: "instant" })); await p.waitForTimeout(500); await shot(p, `${tag}-6-humidor-view`);
    await p.click('.slot[data-open="2"]'); await p.waitForTimeout(1100); await p.click("#turnBtn"); await p.waitForTimeout(1200); await p.evaluate(() => { const r = document.getElementById("turnRange"); r.value = 28; r.dispatchEvent(new Event("input", { bubbles: true })); }); await p.waitForTimeout(600); await shot(p, `${tag}-7-detail-3d`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(800); await p.click('[data-view="list"]'); await p.click('[data-stage="5"]'); await p.waitForTimeout(500); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
    await p.click('[data-metric="price"]'); await p.evaluate(() => document.getElementById("chartRank").scrollIntoView({ behavior: "instant", block: "start" })); await p.evaluate(() => scrollBy(0, -170)); await p.waitForTimeout(700); await shot(p, `${tag}-8-chart-explorer`);
    await p.context().close();
  }
  { const p = await open(1440, 900, "3&no3d=1").catch(() => null); }   // no-3d never sets __stage; captured below instead
  { const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); await p.goto(U + "3&no3d=1", { waitUntil: "load" }); await p.waitForTimeout(1800); await shot(p, "fallback-no-webgl-hero"); await c.close(); }

  // the film: hero scroll, then the reveal
  const p = await open(1280, 720, 3), H = await travel(p); let n = 0;
  const frame = () => p.screenshot({ path: path.join(frames, String(n++).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 90 });
  for (let i = 0; i < 20; i++) await frame();
  for (let i = 0; i <= 110; i++) { const k = i / 110, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; await p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), H * e); await p.waitForTimeout(40); await frame(); }
  for (let i = 0; i < 25; i++) await frame();
  await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.click('[data-stage="4"]'); await p.evaluate(() => window.__seekReveal(0));
  for (let i = 0; i <= 162; i++) { await p.evaluate((t) => window.__seekReveal(t), i / 30); await p.waitForTimeout(25); await frame(); }
  for (let i = 0; i < 45; i++) { await p.waitForTimeout(25); await frame(); }
  console.log("frames", n); await b.close();
})();
