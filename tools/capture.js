// Captures the documentation screenshots and a frame-by-frame recording of the hero and the No. 1 reveal.
// Usage: serve the folder (python3 -m http.server 8767), then: node tools/capture.js <output dir>
// The film is stepped frame by frame, so it shows the designed motion rather than this machine's frame rate.
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const out = path.resolve(process.argv[2] || "docs/media"), frames = path.join(out, "_frames");
fs.mkdirSync(frames, { recursive: true });
const U = (process.env.BASE || "http://localhost:8767") + "/index.html?stage=";
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost" } } : {});
  const open = async (w, h, stage, opt = {}) => { const c = await b.newContext({ viewport: { width: w, height: h }, ignoreHTTPSErrors: true, ...opt }); const p = await c.newPage(); await p.goto(U + stage, { waitUntil: "load" }); await p.waitForTimeout(1500); return p; };
  const shot = (p, name) => p.screenshot({ path: path.join(out, name + ".jpg"), type: "jpeg", quality: 88 });
  const travel = (p) => p.evaluate(() => document.getElementById("hero").offsetHeight - document.getElementById("heroPin").offsetHeight);
  const to = async (p, y) => { await p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), y); await p.waitForTimeout(450); };
  const turn = (p, f) => p.evaluate((f) => { const t = document.getElementById("cotyTurn"); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 64 + (t.offsetHeight - innerHeight + 64) * f, behavior: "instant" }); }, f);

  for (const [tag, w, h, opt] of [["desktop", 1440, 900, {}], ["phone", 390, 844, { deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const p = await open(w, h, 3, opt), H = await travel(p);
    await shot(p, `${tag}-1-hero`); await to(p, H * 0.55); await shot(p, `${tag}-2-hero-procession`); await to(p, H * 0.97); await shot(p, `${tag}-3-hero-places`);
    await p.evaluate(() => document.getElementById("coty").scrollIntoView({ behavior: "instant" })); await p.waitForTimeout(500); await shot(p, `${tag}-4-no1-sealed`);
    await p.evaluate(() => { document.querySelector(".row").scrollIntoView({ behavior: "instant" }); scrollBy(0, -90); }); await p.waitForTimeout(500); await shot(p, `${tag}-5-list`);
    await p.click('[data-view="humidor"]'); await p.evaluate(() => document.getElementById("tools").scrollIntoView({ behavior: "instant" })); await p.waitForTimeout(500); await shot(p, `${tag}-6-grid`); await p.click('[data-view="list"]');
    await p.click('[data-stage="4"]'); await p.evaluate(() => window.__seekReveal(0.8)); await p.waitForTimeout(900); await shot(p, `${tag}-7-reveal-dark`);
    await p.evaluate(() => window.__seekReveal(2.6)); await p.waitForTimeout(700); await shot(p, `${tag}-8-reveal-turning`);
    await p.evaluate(() => window.__seekReveal(5.2)); await p.waitForTimeout(1300); await shot(p, `${tag}-9-reveal-final`); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
    await turn(p, 0.5); await p.waitForTimeout(600); await shot(p, `${tag}-10-no1-turning`);
    await p.evaluate(() => document.querySelector('.row [data-open="1"]').click()); await p.waitForTimeout(1100); await p.click("#turnBtn"); await p.waitForTimeout(900); await shot(p, `${tag}-11-detail`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(800); await p.click('[data-stage="5"]'); await p.waitForTimeout(400); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
    await p.evaluate(() => { document.getElementById("chartRank").scrollIntoView({ behavior: "instant" }); scrollBy(0, -220); }); await p.waitForTimeout(600); await shot(p, `${tag}-12-charts`);
    await p.evaluate(() => { document.getElementById("chartSizes").scrollIntoView({ behavior: "instant" }); scrollBy(0, -180); }); await p.waitForTimeout(600); await shot(p, `${tag}-13-to-scale`);
    await p.context().close();
  }
  // the film: hero scroll, the reveal, then the winner turning on scroll
  const p = await open(1280, 720, 3), H = await travel(p); let n = 0;
  const frame = () => p.screenshot({ path: path.join(frames, String(n++).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 90 });
  for (let i = 0; i < 15; i++) await frame();
  for (let i = 0; i <= 120; i++) { await p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), H * (i / 120)); await p.waitForTimeout(30); await frame(); }
  for (let i = 0; i < 20; i++) await frame();
  await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.click('[data-stage="4"]'); await p.evaluate(() => window.__seekReveal(0));
  for (let i = 0; i <= 156; i++) { await p.evaluate((t) => window.__seekReveal(t), i / 30); await p.waitForTimeout(25); await frame(); }
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(25); await frame(); }
  await p.keyboard.press("Escape"); await p.waitForTimeout(700);
  for (let i = 0; i <= 90; i++) { await turn(p, i / 90); await p.waitForTimeout(40); await frame(); }
  for (let i = 0; i < 20; i++) await frame();
  console.log("frames", n); await b.close();
})();
