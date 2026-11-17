/* The shared 3D stage.

   One WebGL renderer, one scene, one canvas. The canvas is moved between
   hosts (hero, sealed No. 1, the reveal, the detail viewer) and only renders
   while its host is on screen and the tab is visible. app.js loads this file
   after the page has painted; if it fails, every host keeps its static image.

   Models
   - Sealed cigars are procedural (leaf, band with a number) because nothing
     about an unreleased cigar may be shown.
   - Released cigars are built from their one side photograph: the silhouette
     in data.js (`prof`, see tools/profiles.py) is turned into a body of
     revolution and the photo is projected back onto it. The far side is a
     mirror image, so rotation is limited to the photographed side. */
import * as T from "./vendor/three.module.min.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
const rnd = (a, b) => a + Math.random() * (b - a);
const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };

export function createStage({ cigars, reduced }) {
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || matchMedia("(max-width: 700px)").matches;
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: !weak, powerPreference: "high-performance" });
  const DPR = Math.min(weak ? 1.5 : 2, devicePixelRatio || 1);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const el = renderer.domElement; el.className = "stage-canvas"; el.setAttribute("aria-hidden", "true");
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 80);

  /* ---- a small studio to reflect: soft boxes on black ---- */
  {
    const [ec, e] = cvs(512, 256); e.fillStyle = "#060403"; e.fillRect(0, 0, 512, 256);
    const box = (x, y, r, col) => { const g = e.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); e.fillStyle = g; e.fillRect(0, 0, 512, 256); };
    box(110, 50, 110, "rgba(255,226,180,1)"); box(390, 80, 90, "rgba(255,150,70,.9)"); box(256, 232, 150, "rgba(255,190,120,.4)"); box(470, 30, 46, "#fff"); box(30, 150, 40, "rgba(255,240,220,.85)");
    const env = new T.CanvasTexture(ec); env.mapping = T.EquirectangularReflectionMapping; env.colorSpace = T.SRGBColorSpace;
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(env).texture; pm.dispose(); env.dispose();
  }
  const hemi = new T.HemisphereLight(0xffe8c8, 0x1a0e06, 1.3); scene.add(hemi);
  const key = new T.DirectionalLight(0xffdcae, 3.2); key.position.set(3, 4, 6); scene.add(key);
  const ember = new T.PointLight(0xe8642a, 9, 16, 2); ember.position.set(-3.5, -2.2, 2.5); scene.add(ember);

  /* ---- procedural sealed cigar ---- */
  const L = 4.3, R = 0.3;
  const [wc, w] = cvs(1024, 512);
  {
    const g = w.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#6a3b1c"); g.addColorStop(0.5, "#7d4a25"); g.addColorStop(1, "#5f3417"); w.fillStyle = g; w.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 2400; i++) { w.fillStyle = Math.random() < 0.5 ? `rgba(34,15,6,${rnd(0.03, 0.09)})` : `rgba(196,134,82,${rnd(0.02, 0.07)})`; w.beginPath(); w.ellipse(rnd(0, 1024), rnd(0, 512), rnd(2, 30), rnd(1, 9), rnd(0, 3.14), 0, 6.28); w.fill(); }
    for (let k = -2; k < 8; k++) { const y = k * 96; w.strokeStyle = "rgba(30,12,4,.55)"; w.lineWidth = 2.2; w.beginPath(); w.moveTo(0, y); w.lineTo(1024, y + 96); w.stroke(); w.strokeStyle = "rgba(214,160,104,.22)"; w.lineWidth = 1.2; w.beginPath(); w.moveTo(0, y + 3); w.lineTo(1024, y + 99); w.stroke(); }
    for (let i = 0; i < 60; i++) { let x = rnd(0, 1024), y = rnd(0, 512); w.strokeStyle = `rgba(40,18,8,${rnd(0.12, 0.3)})`; w.lineWidth = rnd(0.5, 1.3); w.beginPath(); w.moveTo(x, y); for (let s = 0; s < 6; s++) { x += rnd(10, 34); y += rnd(-9, 12); w.lineTo(x, y); } w.stroke(); }
  }
  const leaf = new T.CanvasTexture(wc); leaf.wrapS = leaf.wrapT = T.RepeatWrapping; leaf.colorSpace = T.SRGBColorSpace; leaf.anisotropy = 4;
  const leafMat = new T.MeshStandardMaterial({ map: leaf, bumpMap: leaf, bumpScale: 0.6, roughness: 0.8, envMapIntensity: 0.5 });
  const bandTexture = (label) => {
    const [bc, b] = cvs(1024, 256);
    const bg = b.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, "#8a6a2c"); bg.addColorStop(0.5, "#e9cf8f"); bg.addColorStop(1, "#8a6a2c"); b.fillStyle = bg; b.fillRect(0, 0, 1024, 256);
    b.fillStyle = "#7c1820"; b.fillRect(0, 0, 1024, 30); b.fillRect(0, 226, 1024, 30);
    b.fillStyle = "#f1dfae"; for (let x = 8; x < 1024; x += 16) { b.beginPath(); b.arc(x, 15, 3, 0, 6.28); b.fill(); b.beginPath(); b.arc(x, 241, 3, 0, 6.28); b.fill(); }
    for (const cx of [256, 768]) {
      b.save(); b.translate(cx, 128); b.rotate(Math.PI / 2);
      b.fillStyle = "#7c1820"; b.beginPath(); b.arc(0, 0, 84, 0, 6.28); b.fill(); b.strokeStyle = "#f1dfae"; b.lineWidth = 5; b.beginPath(); b.arc(0, 0, 74, 0, 6.28); b.stroke();
      b.fillStyle = "#f6e6b8"; b.textAlign = "center"; b.textBaseline = "middle"; b.font = `700 ${label.length > 1 ? 86 : 108}px 'Bodoni Moda', Didot, Georgia, serif`; b.fillText(label, 0, 6);
      b.restore();
      b.save(); b.translate(cx + 256, 128); b.rotate(Math.PI / 2); b.fillStyle = "#4a1014"; b.textAlign = "center"; b.textBaseline = "middle"; b.font = "600 25px 'JetBrains Mono', monospace"; b.fillText("TOP 25", 0, -22); b.fillText("· 2026 ·", 0, 22); b.restore();
    }
    const t = new T.CanvasTexture(bc); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.wrapS = T.RepeatWrapping; return t;
  };
  const bands = { "25": bandTexture("25"), "1": bandTexture("1") };
  const generic = new T.Group();
  generic.add(new T.Mesh(new T.CylinderGeometry(R, R, L, 64, 1, true), leafMat));
  { const head = new T.Mesh(new T.SphereGeometry(R, 40, 20, 0, 6.2832, 0, 1.5708), leafMat); head.scale.y = 0.85; head.position.y = L / 2; generic.add(head); }
  const [fc, f] = cvs(256, 256); f.fillStyle = "#3a2010"; f.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { f.strokeStyle = `rgba(${Math.random() < 0.5 ? "20,9,3" : "150,98,54"},${rnd(0.2, 0.6)})`; f.lineWidth = rnd(1, 4); f.beginPath(); f.arc(128 + rnd(-70, 70), 128 + rnd(-70, 70), rnd(6, 60), rnd(0, 6.28), rnd(0, 6.28)); f.stroke(); }
  const footTex = new T.CanvasTexture(fc); footTex.colorSpace = T.SRGBColorSpace;
  const footMat = new T.MeshStandardMaterial({ map: footTex, roughness: 0.95 });
  { const foot = new T.Mesh(new T.CircleGeometry(R, 40), footMat); foot.rotation.x = Math.PI / 2; foot.position.y = -L / 2; generic.add(foot); }
  const bandMat = new T.MeshStandardMaterial({ map: bands["25"], metalness: 0.75, roughness: 0.3, envMapIntensity: 1.4 });
  { const band = new T.Mesh(new T.CylinderGeometry(R * 1.04, R * 1.04, 0.9, 64, 1, true), bandMat); band.position.y = L * 0.18; generic.add(band); }

  /* ---- photo-derived cigars ---- */
  const photoCache = new Map(), loader = new T.TextureLoader();
  function photoModel(rank) {
    if (photoCache.has(rank)) return photoCache.get(rank);
    const c = cigars.find((x) => x.rank === rank), P = c.prof, S = 44, n = P.length;
    const span = P[n - 1][0] - P[0][0], len = c.len * 0.66, toR = len / (4 * span), mid = (P[0][0] + P[n - 1][0]) / 2;
    // Smooth thickness and centre line along the body so a band's edge does not read as a dent; leave the tapered ends alone.
    const sm = (k, i) => { if (i < 3 || i > n - 7) return P[i][k]; let a = 0; for (let d = -3; d <= 3; d++) a += P[i + d][k]; return a / 7; };
    const rings = P.map(([x], i) => { const t = sm(1, i), b = sm(2, i); return { y: ((x - mid) / span) * len, r: ((b - t) / 2) * toR, u: x, c: (t + b) / 2, rf: (b - t) / 2 }; });
    const last = rings[n - 1];           // round off the head
    for (let k = 1; k <= 5; k++) { const a = (k / 5) * 1.5708; rings.push({ y: last.y + Math.sin(a) * last.r * 0.7, r: last.r * Math.cos(a), u: P[n - 3][0], c: last.c, rf: last.rf * Math.cos(a) * 0.6 }); }
    const pos = [], uv = [], idx = [];
    rings.forEach((g) => { for (let j = 0; j <= S; j++) { const a = (j / S) * 6.2832, cx = Math.cos(a); pos.push(g.r * cx, g.y, g.r * Math.sin(a)); uv.push(g.u, 1 - (g.c + g.rf * 0.975 * cx)); } });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + S + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.72, envMapIntensity: 0.3 });
    const model = { group: new T.Group(), len, radius: Math.max(...rings.map((g) => g.r)), ready: false, failed: false };
    model.group.add(new T.Mesh(geo, mat));
    const foot = new T.Mesh(new T.CircleGeometry(rings[0].r, 36), footMat); foot.rotation.x = Math.PI / 2; foot.position.y = rings[0].y; model.group.add(foot);
    loader.load(`assets/c${rank}.webp`, (tex) => { tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; model.ready = true; invalidate(); }, undefined, () => { model.failed = true; });
    photoCache.set(rank, model); return model;
  }

  /* ---- the tube ---- */
  const RT = R * 1.42, TL = L + 0.6;
  const glassMats = [[T.BackSide, 0.1], [T.FrontSide, 0.24]].map(([side, op]) => { const m = new T.MeshPhysicalMaterial({ color: 0xfff1dc, roughness: 0.03, transparent: true, opacity: op, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false, side }); m.userData.op = op; return m; });
  const glassG = new T.Group(), capG = new T.Group();
  for (const m of glassMats) {
    const barrel = new T.Mesh(new T.CylinderGeometry(RT, RT, TL, 64, 1, true), m); barrel.position.y = -0.08; glassG.add(barrel);
    const end = new T.Mesh(new T.SphereGeometry(RT, 40, 20, 0, 6.2832, 1.5708, 1.5708), m); end.position.y = -0.08 - TL / 2; glassG.add(end);
  }
  const gold = new T.MeshStandardMaterial({ color: 0xd2ad62, metalness: 1, roughness: 0.22, envMapIntensity: 1.5, transparent: true });
  { const cap = new T.Mesh(new T.CylinderGeometry(RT * 1.07, RT * 1.07, 0.5, 64), gold); cap.position.y = TL / 2 + 0.16; capG.add(cap);
    const top = new T.Mesh(new T.SphereGeometry(RT * 1.07, 40, 14, 0, 6.2832, 0, 1.5708), gold); top.scale.y = 0.35; top.position.y = TL / 2 + 0.41; capG.add(top);
    for (const y of [TL / 2 - 0.13, TL / 2 - 0.24]) { const ring = new T.Mesh(new T.TorusGeometry(RT * 1.02, 0.022, 10, 64), gold); ring.rotation.x = Math.PI / 2; ring.position.y = y; capG.add(ring); } }

  /* ---- restrained smoke for the reveal ---- */
  const [sc, s2] = cvs(128, 128); { const g = s2.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,240,220,.9)"); g.addColorStop(0.4, "rgba(230,210,190,.35)"); g.addColorStop(1, "rgba(200,180,160,0)"); s2.fillStyle = g; s2.fillRect(0, 0, 128, 128); }
  const smokeTex = new T.CanvasTexture(sc), smokeG = new T.Group();
  const puffs = Array.from({ length: weak ? 7 : 12 }, (_, i) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false })); sp.userData = { seed: i * 1.7, x: rnd(-2.4, 2.2), sp: rnd(0.12, 0.26) }; smokeG.add(sp); return sp; });

  const cigarSlot = new T.Group(), spin = new T.Group(), orient = new T.Group(), pivot = new T.Group();
  cigarSlot.add(generic); spin.add(cigarSlot, glassG, capG); orient.rotation.z = -Math.PI / 2; orient.add(spin); pivot.add(orient); scene.add(pivot, smokeG);

  /* ---- hosts and the render loop ---- */
  const hosts = {};                     // name -> { el, visible }
  const state = { hero: 0, reveal: -1, viewer: 0, sealedSpin: 0, sealedVel: 0, px: 0, py: 0, viewYaw: 0, viewVel: 0 };
  let active = null, shown = null, raf = 0, dirty = true, size = [0, 0], firstFrame = false;
  const io = new IntersectionObserver((es) => { for (const e of es) { const h = Object.values(hosts).find((x) => x.el === e.target); if (h) h.visible = e.isIntersecting; } kick(); }, { rootMargin: "80px" });
  function setHost(name, node) {
    if (hosts[name]) io.unobserve(hosts[name].el);
    if (!node) { delete hosts[name]; if (active === name) active = null; kick(); return; }
    hosts[name] = { el: node, visible: false }; io.observe(node); kick();
  }
  const pick = () => (state.reveal >= 0 && hosts.reveal ? "reveal" : state.viewer && hosts.viewer ? "viewer" : hosts.hero && hosts.hero.visible && state.hero < 0.995 ? "hero" : hosts.sealed && hosts.sealed.visible ? "sealed" : null);
  function invalidate() { dirty = true; kick(); }
  function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else kick(); });
  addEventListener("resize", invalidate);
  addEventListener("pointermove", (e) => { state.px = e.clientX / innerWidth - 0.5; state.py = e.clientY / innerHeight - 0.5; }, { passive: true });

  function show(kind) {                 // which cigar is in the slot
    if (shown === kind) return;
    cigarSlot.clear();
    if (typeof kind === "number") cigarSlot.add(photoModel(kind).group); else { bandMat.map = bands[kind]; bandMat.needsUpdate = true; cigarSlot.add(generic); }
    shown = kind;
  }
  function tube(open, frost, visible) {
    glassG.visible = capG.visible = visible && open < 0.999;
    glassG.position.y = -open * 7.5; capG.position.y = open * 3.2;
    const fade = 1 - ss(0.55, 1, open);
    glassMats.forEach((m) => { m.opacity = lerp(m.userData.op, m.side === T.FrontSide ? 0.94 : 0.5, frost) * fade; m.roughness = lerp(0.03, 0.55, frost); m.color.setRGB(lerp(1, 0.2, frost), lerp(0.94, 0.13, frost), lerp(0.86, 0.08, frost)); });
    gold.opacity = fade;
  }
  const fitZ = (worldWidth) => worldWidth / (2 * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect);

  function pose(name, t, dt) {
    const tall = cam.aspect < 0.85;
    let light = 1, smoke = 0;
    pivot.position.set(0, 0, 0); pivot.rotation.set(0, 0, 0); pivot.scale.setScalar(1); spin.rotation.y = 0;
    if (name === "hero") {
      const p = state.hero, a = ss(0, 0.42, p), o = ss(0.34, 0.72, p), out = ss(0.72, 1, p);
      show("25"); tube(o, 0, true);
      cam.position.set(0, 0, lerp(fitZ(tall ? 6.9 : 13.5), fitZ(tall ? 5.6 : 9), a));
      const vh = 2 * Math.tan((cam.fov * Math.PI) / 360) * cam.position.z, vw = vh * cam.aspect;
      pivot.position.set(lerp(tall ? 0.1 * vw : 0.25 * vw, 0, a), lerp(tall ? -0.31 * vh : -0.02 * vh, tall ? 0.02 * vh : 0.05 * vh, a) + out * vh * (tall ? 0.16 : 0.1), 0);
      pivot.rotation.z = lerp(tall ? 0.62 : 0.3, tall ? 0.34 : 0.06, a);
      pivot.rotation.y = state.px * 0.25 + lerp(-0.35, 0, a); pivot.rotation.x = state.py * 0.12;
      pivot.scale.setScalar(1 - out * 0.22);
      spin.rotation.y = (reduced ? 0.6 : t * 0.35) + p * 5;
      if (!reduced) pivot.position.y += Math.sin(t * 0.9) * 0.05 * (1 - a);
      light = 0.85 + o * 0.35;
    } else if (name === "sealed") {
      show("1"); tube(0, 0, true);
      cam.position.set(0, 0, fitZ(6.6));
      state.sealedSpin += (reduced ? 0 : dt * 0.4) + state.sealedVel; state.sealedVel *= 0.94;
      spin.rotation.y = state.sealedSpin; pivot.rotation.z = 0.24; pivot.rotation.y = state.px * 0.5; pivot.rotation.x = state.py * 0.2;
      if (!reduced) pivot.position.y = Math.sin(t * 0.9) * 0.06;
    } else if (name === "reveal") {
      const r = state.reveal, m = photoModel(1), usePhoto = m.ready;
      const flare = ss(1.0, 1.6, r), o = ss(1.5, 3.1, r), settle = ss(2.9, 4.3, r);
      show(usePhoto ? 1 : "1"); tube(o, 1 - ss(1.1, 2.4, r) * 0.75, true);
      cam.position.set(0, 0, lerp(fitZ(tall ? 6.4 : 9.6), fitZ(tall ? 5.0 : 7.4), ss(0, 4.3, r)));
      const vh = 2 * Math.tan((cam.fov * Math.PI) / 360) * cam.position.z;
      pivot.position.y = lerp(0.02, tall ? 0.15 : 0.17, settle) * vh;
      pivot.rotation.z = lerp(tall ? 0.7 : 0.16, tall ? 0.62 : 0, settle);
      pivot.rotation.y = lerp(-0.5, 0, ss(0.2, 3.4, r)) + (r >= 5 ? clamp(state.px, -0.5, 0.5) * 0.5 : 0);
      pivot.rotation.x = r >= 5 ? state.py * 0.18 : 0;
      spin.rotation.y = usePhoto ? 0 : r * 0.5;
      light = lerp(0.07, 0.95, flare) - 0.05 * settle; smoke = ss(1.5, 2.4, r) * (1 - ss(3.8, 5.2, r));
    } else if (name === "viewer") {
      const m = photoModel(state.viewer);
      show(state.viewer); tube(1, 0, false);
      cam.position.set(0, 0, fitZ(m.len * 1.12));
      state.viewYaw = clamp(state.viewYaw + state.viewVel, -1.05, 1.05); state.viewVel *= 0.9;
      pivot.rotation.y = state.viewYaw + (reduced ? 0 : Math.sin(t * 0.7) * 0.06); pivot.rotation.x = 0.12;
    }
    hemi.intensity = 1.3 * light; key.intensity = 3.2 * light; ember.intensity = (9 + (reduced ? 0 : Math.sin(t * 5.3) * 1.5)) * light;
    smokeG.visible = smoke > 0.01;
    if (smokeG.visible) puffs.forEach((sp) => { const u = sp.userData, k = (t * u.sp + u.seed) % 1; sp.position.set(u.x + Math.sin(k * 6 + u.seed) * 0.35, -0.5 + k * 3.2, 0.6); sp.scale.setScalar(0.9 + k * 2.2); sp.material.opacity = 0.16 * smoke * Math.sin(k * Math.PI); });
  }

  let last = 0;
  function frame(ms) {
    raf = 0;
    const name = pick();
    if (name !== active) { document.querySelectorAll(".live").forEach((n) => n.classList.remove("live")); active = name; dirty = true; size = [0, 0]; if (name) { hosts[name].el.appendChild(el); hosts[name].el.classList.add("live"); } }
    if (!name) return;                               // nothing on screen: stop until something changes
    const h = hosts[name].el, wpx = h.clientWidth, hpx = h.clientHeight;
    if (wpx && hpx) {
      if (wpx !== size[0] || hpx !== size[1]) { size = [wpx, hpx]; renderer.setSize(wpx, hpx, false); cam.aspect = wpx / hpx; cam.updateProjectionMatrix(); }
      const t = ms / 1000, dt = Math.min(0.05, last ? (ms - last) / 1000 : 0.016); last = ms;
      pose(name, t, dt); renderer.render(scene, cam);
      if (!firstFrame) { firstFrame = true; document.documentElement.classList.add("stage-on"); }
    }
    dirty = false;
    if (!reduced) kick();                            // reduced motion renders only when something changes
  }

  return {
    el, setHost, invalidate,
    setHero(p) { if (p !== state.hero) { state.hero = p; invalidate(); } },
    setReveal(t) { state.reveal = t; invalidate(); },
    setViewer(rank) { state.viewer = rank || 0; state.viewYaw = -0.35; state.viewVel = 0; if (rank) photoModel(rank); invalidate(); },
    nudge(name, dx) { if (name === "sealed") state.sealedVel += dx * 0.0016; else if (name === "viewer") state.viewVel += dx * 0.0022; invalidate(); },
    preload(rank) { photoModel(rank); },
    snapshot(name) { const h = hosts[name]; if (!h) return null; active = null; h.visible = true; frame(performance.now()); return el.toDataURL("image/png"); },
  };
}
