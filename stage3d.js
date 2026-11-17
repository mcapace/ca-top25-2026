/* The 3D viewer in the detail panel ("Turn it in 3D").

   Loaded only when someone asks for it. Each cigar is built from its one side
   photograph: the silhouette in data.js (`prof`, see tools/profiles.py) becomes
   a body of revolution and the photo is projected back onto it. Nothing is
   drawn or invented, but the far side is a mirror image, so rotation is
   limited to the photographed side. */
import * as T from "./vendor/three.module.min.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createStage({ cigars, reduced }) {
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: !weak });
  renderer.setPixelRatio(Math.min(weak ? 1.5 : 2, devicePixelRatio || 1));
  const el = renderer.domElement; el.className = "stage-canvas"; el.setAttribute("aria-hidden", "true");
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 80);
  scene.add(new T.HemisphereLight(0xffffff, 0x8a8a86, 2.2));
  const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(2, 4, 6); scene.add(key);
  const pivot = new T.Group(), orient = new T.Group(); orient.rotation.z = -Math.PI / 2; pivot.add(orient); scene.add(pivot);

  const cache = new Map(), loader = new T.TextureLoader();
  function model(rank) {
    if (cache.has(rank)) return cache.get(rank);
    const c = cigars.find((x) => x.rank === rank), P = c.prof, S = 48, n = P.length;
    const span = P[n - 1][0] - P[0][0], len = c.len * 0.66, toR = len / (4 * span), mid = (P[0][0] + P[n - 1][0]) / 2;
    // Smooth thickness along the body so a band's edge does not read as a dent; leave the tapered ends alone.
    const sm = (k, i) => { if (i < 3 || i > n - 7) return P[i][k]; let a = 0; for (let d = -3; d <= 3; d++) a += P[i + d][k]; return a / 7; };
    const rings = P.map(([x], i) => { const t = sm(1, i), b = sm(2, i); return { y: ((x - mid) / span) * len, r: ((b - t) / 2) * toR, u: x, c: (t + b) / 2, rf: (b - t) / 2 }; });
    const last = rings[n - 1];
    for (let k = 1; k <= 5; k++) { const a = (k / 5) * 1.5708; rings.push({ y: last.y + Math.sin(a) * last.r * 0.7, r: last.r * Math.cos(a), u: P[n - 3][0], c: last.c, rf: last.rf * Math.cos(a) * 0.6 }); }
    const pos = [], uv = [], idx = [];
    rings.forEach((g) => { for (let j = 0; j <= S; j++) { const a = (j / S) * 6.2832, cx = Math.cos(a); pos.push(g.r * cx, g.y, g.r * Math.sin(a)); uv.push(g.u, 1 - (g.c + g.rf * 0.975 * cx)); } });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + S + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.8 });
    const m = { group: new T.Group(), len };
    m.group.add(new T.Mesh(geo, mat));
    loader.load(`assets/c${rank}.webp`, (tex) => { tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; kick(); });
    cache.set(rank, m); return m;
  }

  let host = null, rank = 0, yaw = -0.35, vel = 0, raf = 0, size = [0, 0];
  function kick() { if (!raf && host && rank && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else kick(); });
  addEventListener("resize", kick);
  function frame(ms) {
    raf = 0;
    if (!host || !rank || !host.isConnected) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (w && h) {
      if (w !== size[0] || h !== size[1]) { size = [w, h]; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const m = model(rank);
      if (orient.children[0] !== m.group) { orient.clear(); orient.add(m.group); }
      cam.position.set(0, 0, (m.len * 1.12) / (2 * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect));
      yaw = clamp(yaw + vel, -1.05, 1.05); vel *= 0.9;
      pivot.rotation.set(0.12, yaw + (reduced ? 0 : Math.sin(ms / 1400) * 0.05), 0);
      renderer.render(scene, cam);
    }
    if (!reduced) kick();
  }
  return {
    setHost(_name, node) { if (host) host.classList.remove("live"); host = node || null; size = [0, 0]; if (host) { host.appendChild(el); host.classList.add("live"); kick(); } else el.remove(); },
    setViewer(r) { rank = r || 0; yaw = -0.35; vel = 0; kick(); },
    setViewYaw(rad) { yaw = clamp(rad, -1.05, 1.05); vel = 0; kick(); },
    viewYaw: () => yaw,
    nudge(_name, dx) { vel += dx * 0.0022; kick(); },
  };
}
