// Screenshots and a frame-stepped film of the editorial page.
// Usage: serve the folder (python3 -m http.server 8772), then: BASE=http://localhost:8772 node tools/capture-editorial.js docs/editorial
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const out = path.resolve(process.argv[2] || "docs/editorial"), frames = path.join(out, "_frames"); fs.mkdirSync(frames, { recursive: true });
const BASE = process.env.BASE || "http://localhost:8772";
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost" } } : {}) });
  const shot = (p, n) => p.screenshot({ path: path.join(out, n + ".jpg"), type: "jpeg", quality: 90 });
  const noGL = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; };
  // the hero at four widths, in three modes
  for (const w of [390, 768, 1180, 1440]) for (const mode of ["webgl", "no-webgl", "reduced-motion"]) {
    const h = w < 500 ? 844 : w < 900 ? 1024 : w < 1300 ? 820 : 900;
    const c = await b.newContext({ viewport: { width: w, height: h }, ignoreHTTPSErrors: true, reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference", ...(w < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) }), p = await c.newPage();
    if (mode === "no-webgl") await p.addInitScript(noGL);
    await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(1800); await shot(p, `hero-${w}-${mode}`); await c.close();
  }
  for (const [tag, w, h, opt] of [["desktop", 1440, 900, {}], ["laptop", 1180, 820, {}], ["phone", 390, 844, { deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, ignoreHTTPSErrors: true, ...opt }), p = await c.newPage();
    await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(2200);
    const end = await p.evaluate(() => { const r = document.getElementById("slotB").getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; });
    await p.evaluate((y) => scrollTo({ top: Math.max(1, y), behavior: "instant" }), end); await p.waitForTimeout(600); await shot(p, `${tag}-1-cigar-of-the-year`);
    await p.evaluate(() => { const e = document.querySelector(".entry"); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 190, behavior: "instant" }); }); await p.waitForTimeout(900); await shot(p, `${tag}-2-list`);
    await p.evaluate(() => document.querySelector("#entry-2 h3 a").click()); await p.waitForTimeout(1600); await shot(p, `${tag}-3-detail-opening`);
    await p.click("[data-inspect]"); await p.waitForTimeout(1200); await shot(p, `${tag}-4-detail-inspecting`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(700); await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.click(".hero [data-reveal]");
    await p.evaluate(() => window.__seekReveal(4.8)); await p.waitForTimeout(1300); await shot(p, `${tag}-5-reveal-final`);
    await c.close();
  }
  const c = await b.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true }), p = await c.newPage(); let n = 0;
  await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(2500);
  const frame = () => p.screenshot({ path: path.join(frames, String(n++).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 90 });
  const end = await p.evaluate(() => { const r = document.getElementById("slotB").getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; });
  for (let i = 0; i < 20; i++) await frame();
  for (let i = 0; i <= 80; i++) { const k = i / 80, e = k * k * (3 - 2 * k); await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), end * e); await p.waitForTimeout(30); await frame(); }
  for (let i = 0; i < 25; i++) await frame();
  await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.click(".hero [data-reveal]"); await p.evaluate(() => window.__seekReveal(0));
  for (let i = 0; i <= 144; i++) { await p.evaluate((t) => window.__seekReveal(t), i / 30); await p.waitForTimeout(30); await frame(); }
  for (let i = 0; i < 45; i++) { await p.waitForTimeout(25); await frame(); }
  console.log("frames", n); await b.close();
})();
