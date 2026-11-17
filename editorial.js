/* Top 25 of 2026 — the editorial version: hero, the full list, detail views and the reveal.
   Photography is real. WebGL is used for one thing: a soft light that moves
   across the photograph, shaped by the cigar's own outline. */
(() => {
  "use strict";
  const CIGARS = window.CA_TOP25, BY = new Map(CIGARS.map((c) => [c.rank, c]));
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const FR = { 0.125: "1/8", 0.25: "1/4", 0.375: "3/8", 0.5: "1/2", 0.625: "5/8", 0.75: "3/4", 0.875: "7/8" };
  const fmtLen = (n) => { const w = Math.floor(n), f = FR[+(n - w).toFixed(3)]; return f ? `${w} ${f}` : `${w}`; };
  const price = (c) => (c.price == null ? "Price not listed" : c.cur === "£" ? `£${c.price.toFixed(2)} in the U.K.` : `$${c.price.toFixed(2)}`);
  const strength = (c) => c.strength.replace("-", " to ").toLowerCase().replace(/^./, (m) => m.toUpperCase());
  // Two cigars have enlarged photographs; the rest use the standard set.
  const HI = new Set([1, 2]);
  const photo = (r) => (HI.has(r) ? `assets/hi/c${r}.webp` : `assets/c${r}.webp`), cutout = (r) => (HI.has(r) ? `assets/hi/k${r}.webp` : `assets/k${r}.webp`);
  const bandShot = (r) => (HI.has(r) ? `assets/hi/b${r}.webp` : `assets/b${r}.webp`);
  const saved = new Set((() => { try { return JSON.parse(localStorage.getItem("ca25.humidor") || "[]"); } catch { return []; } })());
  const persist = () => { try { localStorage.setItem("ca25.humidor", JSON.stringify([...saved])); } catch { /* private window */ } $("savedN").textContent = saved.size; };
  const BOOKMARK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4v-17Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  /* ---------- the light ----------
     Draws the photograph with a moving light. The cutout gives the cigar's edge, the silhouette
     profile gives a round surface to light, and the photographed shadow is kept as it was shot. */
  function lit(canvas, rank) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!gl) return null;
    const vs = "attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    const fs = `precision mediump float;uniform sampler2D photo,cut,prof;uniform vec2 light;uniform float amb;varying vec2 uv;
      void main(){
        vec3 ph=texture2D(photo,uv).rgb;float a=texture2D(cut,uv).a;
        vec2 pr=texture2D(prof,vec2(uv.x,.5)).rg;float y=1.-uv.y;
        float c=(pr.r+pr.g)*.5,rf=max((pr.g-pr.r)*.5,.002);
        float ny=clamp((y-c)/rf,-1.,1.);
        vec3 n=normalize(vec3(0.,-ny,sqrt(max(0.,1.-ny*ny))));
        vec3 L=normalize(vec3((light.x-uv.x)*4.,y-light.y,.42));
        float diff=max(dot(n,L),0.);
        float spec=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),34.);
        float lum=dot(ph,vec3(.299,.587,.114));float sat=max(ph.r,max(ph.g,ph.b))-min(ph.r,min(ph.g,ph.b));
        float gloss=mix(.45,1.5,smoothstep(.5,.85,lum)*(1.-smoothstep(.12,.38,sat)));   // paper and foil catch more light than leaf
        vec3 col=ph*amb*(.9+.2*diff)+vec3(1.,.97,.91)*spec*.2*gloss*(.25+.75*amb);
        float sh=clamp((1.-lum)*1.15,0.,1.)*(1.-a);                                   // the shadow as photographed
        gl_FragColor=vec4(col*a+vec3(.16,.105,.07)*sh*amb,a+sh*amb);
      }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const tex = (unit, name) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v); gl.uniform1i(gl.getUniformLocation(pr, name), unit); return t; };
    tex(0, "photo"); tex(1, "cut"); tex(2, "prof");
    // silhouette as a 64-sample strip: top and bottom edge for every position along the cigar
    const P = BY.get(rank).prof, strip = new Uint8Array(64 * 4);
    for (let i = 0; i < 64; i++) { const x = i / 63; let j = 0; while (j < P.length - 2 && P[j + 1][0] < x) j++; const k = clamp((x - P[j][0]) / (P[j + 1][0] - P[j][0])); strip[i * 4] = Math.round((P[j][1] + (P[j + 1][1] - P[j][1]) * k) * 255); strip[i * 4 + 1] = Math.round((P[j][2] + (P[j + 1][2] - P[j][2]) * k) * 255); strip[i * 4 + 3] = 255; }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.activeTexture(gl.TEXTURE2); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, strip); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const uLight = gl.getUniformLocation(pr, "light"), uAmb = gl.getUniformLocation(pr, "amb");
    const api = { ready: false, light: [0.3, 0.1], target: [0.3, 0.1], amb: 1, raf: 0, onready: null };
    let loaded = 0;
    const load = (unit, src) => { const im = new Image(); im.onload = () => { try { gl.activeTexture(gl.TEXTURE0 + unit); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); } catch { return; } if (++loaded === 2) { api.ready = true; draw(); api.onready && api.onready(); } }; im.src = src; };
    load(0, photo(rank)); load(1, cutout(rank));
    function draw() { if (!api.ready) return; gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform2f(uLight, api.light[0], api.light[1]); gl.uniform1f(uAmb, api.amb); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    function step() { api.raf = 0; const dx = api.target[0] - api.light[0], dy = api.target[1] - api.light[1]; api.light[0] += dx * 0.12; api.light[1] += dy * 0.12; draw(); if (Math.abs(dx) + Math.abs(dy) > 0.002) api.raf = requestAnimationFrame(step); }
    api.aim = (x, y) => { api.target = [x, y]; if (reduced) { api.light = [x, y]; draw(); } else if (!api.raf) api.raf = requestAnimationFrame(step); };
    api.size = (w) => { const d = Math.min(2, devicePixelRatio || 1), W = Math.min(1600, Math.round(w * d)); if (canvas.width !== W) { canvas.width = W; canvas.height = Math.round(W / 4); draw(); } };
    api.draw = draw;
    api.set = (x, y, amb) => { cancelAnimationFrame(api.raf); api.raf = 0; api.light = [x, y]; api.target = [x, y]; api.amb = amb; draw(); };
    return api;
  }
  // The light follows the pointer over a photograph; on touch it follows the photograph's place on the screen.
  const lights = new Set(), fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  let ptr = null;
  function aimAll() { lights.forEach(({ api, el, held }) => { if (!el.isConnected || (held && held())) return; const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return; if (fine && ptr) api.aim((ptr[0] - r.left) / r.width, clamp((ptr[1] - r.top) / r.height, -0.6, 1.6)); else api.aim(clamp(1.1 - ((r.top + r.height / 2) / innerHeight) * 1.2, 0.05, 0.95), 0.12); }); }
  addEventListener("pointermove", (e) => { ptr = [e.clientX, e.clientY]; aimAll(); }, { passive: true });

  /* ---------- hero: one cigar that travels to the Cigar of the Year ---------- */
  const product = $("product"), slotA = $("slotA"), slotB = $("slotB"), flightEl = $("flight");
  let heroLight = null;
  { const cv = document.createElement("canvas"); const api = lit(cv, 1); if (api) { heroLight = api; api.onready = () => { product.classList.add("gl"); aimAll(); }; product.prepend(cv); lights.add({ api, el: cv }); } }
  function flight() {
    const f = flightEl.getBoundingClientRect(), a = slotA.getBoundingClientRect(), b = slotB.getBoundingClientRect();
    const A = { x: a.left - f.left, y: a.top - f.top, w: a.width }, B = { x: b.left - f.left, y: b.top - f.top, w: b.width };
    // progress runs from the top of the page to the point where the landing place is centred on screen
    const end = Math.max(1, B.y + flightEl.offsetTop + b.height / 2 - innerHeight / 2);
    const p = reduced ? (scrollY > end * 0.5 ? 1 : 0) : ease(scrollY / end);
    const w = Math.max(A.w, B.w), x = A.x + (B.x - A.x) * p, y = A.y + (B.y - A.y) * p, s = (A.w + (B.w - A.w) * p) / w;
    product.style.width = `${w}px`; product.style.height = `${w / 4}px`;
    product.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(4)}) rotate(${(-3.2 * (1 - p)).toFixed(2)}deg)`;
    if (heroLight) heroLight.size(w);
  }
  let queued = false;
  const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; flight(); aimAll(); }); };
  addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onScroll);
  addEventListener("load", onScroll);

  /* ---------- feature text ---------- */
  const specRows = (c) => [["Made by", c.maker], ["Factory", c.country], ["Size", `${fmtLen(c.len)} in. × ${c.ring} ring gauge`], ["Strength", strength(c)], ["Wrapper", c.wrapper], ["Binder", c.binder], ["Filler", c.filler], ["Price", price(c)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
  { const c = BY.get(1); $("featureLead").textContent = c.note[0]; $("featureSpecs").innerHTML = specRows(c).split("</div>").slice(1, 5).join("</div>") + "</div>"; }

  /* ---------- the list ---------- */
  const SCALE_IN = 7.4;                     // inches represented by the full width of the photo column
  let order = CIGARS.map((c) => c.rank);    // the ranks as currently shown, for Previous and Next
  function entry(c, i) {
    const x0 = c.prof[0][0], span = c.prof[c.prof.length - 1][0] - x0, w = (c.len / SCALE_IN / span) * 100;
    return `<article class="entry" id="entry-${c.rank}">
      <p class="entry-rank">${c.rank}</p>
      <div class="entry-photo"><img src="${photo(c.rank)}" alt="" width="1600" height="400" ${i < 2 ? "" : 'loading="lazy"'} style="width:${w.toFixed(2)}%;margin-left:${(-x0 * w).toFixed(2)}%"></div>
      <div class="entry-text"><h3><a href="#no-${c.rank}" data-open="${c.rank}">${esc(c.name)}</a></h3><p class="entry-spec">${esc(c.country)} · ${fmtLen(c.len)} × ${c.ring} · ${strength(c)} · ${price(c)}</p></div>
      <p class="entry-score"><span>${c.score}</span> points</p>
      <button class="save" type="button" data-save="${c.rank}" aria-pressed="${saved.has(c.rank)}" aria-label="${saved.has(c.rank) ? "Remove from saved" : "Save"}: ${esc(c.name)}">${BOOKMARK}</button>
    </article>`;
  }
  { const n = new Map(); CIGARS.forEach((c) => n.set(c.country, (n.get(c.country) || 0) + 1));
    $("countries").insertAdjacentHTML("beforeend", `<label><input type="radio" name="country" value="" checked> All</label>` + [...n].sort((a, b) => b[1] - a[1]).map(([k]) => `<label><input type="radio" name="country" value="${esc(k)}"> ${esc(k)}</label>`).join("")); }
  function renderList() {
    const q = $("find").value.trim().toLowerCase(), country = (document.querySelector('input[name="country"]:checked') || {}).value || "", only = $("savedOnly").checked, sort = $("sort").value;
    const usd = (c) => (c.cur === "$" && c.price != null ? c.price : Infinity);      // pounds and unpriced cigars are never ranked against dollars
    const by = { rank: (a, b) => a.rank - b.rank, score: (a, b) => b.score - a.score || a.rank - b.rank, price: (a, b) => usd(a) - usd(b) || a.rank - b.rank, length: (a, b) => b.len - a.len || a.rank - b.rank }[sort];
    const rows = CIGARS.filter((c) => (!q || `${c.name} ${c.country} ${c.maker} ${c.wrapper} ${c.strength}`.toLowerCase().includes(q)) && (!country || c.country === country) && (!only || saved.has(c.rank))).sort(by);
    order = rows.map((c) => c.rank);
    $("entries").innerHTML = rows.map(entry).join(""); $("none").hidden = rows.length > 0;
    $("none").textContent = only && !saved.size ? "Nothing saved yet. Use the bookmark on any cigar." : "Nothing on the list matches that.";
  }
  $("find").addEventListener("input", renderList); $("filter").addEventListener("change", renderList); $("savedOnly").addEventListener("change", renderList);
  $("savedLink").addEventListener("click", () => { $("savedOnly").checked = true; renderList(); });
  $("archive").innerHTML = Array.from({ length: 22 }, (_, i) => 2025 - i).map((y) => `<a href="https://www.cigaraficionado.com/top25/${y}">${y}</a>`).join("");

  /* ---------- detail: an inspection table, then room to read ---------- */
  const detail = $("detail");
  let view = null;                           // the open detail's state
  const canMorph = () => !reduced && typeof document.startViewTransition === "function";
  function fill(rank) {
    const c = BY.get(rank), x0 = c.prof[0][0], x1 = c.prof[c.prof.length - 1][0];
    const list = order.includes(rank) ? order : CIGARS.map((x) => x.rank), at = list.indexOf(rank), prev = list[at - 1], next = list[at + 1];
    const ticks = []; for (let i = 0; i <= c.len * 2 + 0.001; i++) { const x = (x0 + ((x1 - x0) * (i / 2)) / c.len) * 100, whole = i % 2 === 0; ticks.push(`<line x1="${x}%" x2="${x}%" y1="0" y2="${whole ? 11 : 6}"/>${whole && i ? `<text x="${x}%" y="25" text-anchor="middle">${i / 2}</text>` : ""}`); }
    $("detailIn").innerHTML = `
      <div class="d-top"><button type="button" data-close>Back to the list</button><div class="pager"><button type="button" data-go="${prev ?? ""}" ${prev == null ? "disabled" : ""}>Previous</button><button type="button" data-go="${next ?? ""}" ${next == null ? "disabled" : ""}>Next</button></div></div>
      <div class="stage-wrap">
        <div class="stage" id="stage" tabindex="0" role="group" aria-label="Photograph of ${esc(c.name)}. Use plus and minus to zoom and the arrow keys to move.">
          <div class="stage-inner" id="stageInner">
            <img class="whole" src="${photo(rank)}" alt="${esc(c.name)}" width="1600" height="400">
            <svg class="ruler" aria-hidden="true"><line x1="${x0 * 100}%" x2="${x1 * 100}%" y1="0" y2="0"/>${ticks.join("")}<text x="${x1 * 100}%" y="25" dx="14">inches</text></svg>
          </div>
          <div class="stage-band" id="stageBand" hidden><img src="${bandShot(rank)}" alt="The band of ${esc(c.name)}, photographed close" width="650" height="650"></div>
        </div>
        <div class="stage-bar">
          <div class="views" role="group" aria-label="View"><button type="button" data-view="whole" aria-pressed="true">Whole cigar</button><button type="button" data-view="band" aria-pressed="false">The band</button></div>
          <div class="zoom" role="group" aria-label="Zoom"><button type="button" data-zoom="-1" aria-label="Zoom out">−</button><output id="zoomOut">100%</output><button type="button" data-zoom="1" aria-label="Zoom in">+</button></div>
        </div>
        <p class="stage-note">Drawn to scale: ${fmtLen(c.len)} inches long, ${c.ring} ring gauge. Drag to move, pinch or use the buttons to look closer.</p>
      </div>
      <div class="d-body">
        <div class="d-head">
          <h2 id="dTitle">${esc(c.name)}</h2>
          <p class="standfirst">No. ${c.rank} of 25${c.rank === 1 ? ", Cigar of the Year" : ""}. ${c.score} points.</p>
          <div class="d-acts">
            <button type="button" data-save="${rank}" aria-pressed="${saved.has(rank)}">${BOOKMARK}<span>${saved.has(rank) ? "Saved" : "Save"}</span></button>
            <button type="button" data-share="${rank}">Share</button>
            ${c.video ? `<a href="https://www.cigaraficionado.com/video/${c.video}" target="_blank" rel="noopener">Watch the film</a>` : ""}
          </div>
          <p class="d-status" id="dStatus" role="status"></p>
          <dl class="specs">${specRows(c)}</dl>
        </div>
        <div class="d-review">${c.note.map((p) => `<p>${esc(p)}</p>`).join("")}<p class="d-foot">This is the published 2025 review, standing in for 2026. The photograph is enlarged from an 800-pixel original; closer inspection needs higher-resolution photography.</p></div>
      </div>`;
    const stage = $("stage"), inner = $("stageInner");
    view = { rank, z: 1, x: 0, y: 0, mode: "whole", stage, inner, light: null };
    const cv = document.createElement("canvas"), api = lit(cv, rank);
    if (api) { view.light = api; api.onready = () => { stage.classList.add("gl"); aimAll(); }; inner.prepend(cv); lights.add({ api, el: cv }); }
    // open framed for the screen: whole cigar on a wide table, band and head on a narrow one
    view.z = stage.clientWidth < 700 ? 2.3 : 1; view.x = stage.clientWidth < 700 ? -(c.prof.find((p) => p[0] > 0.62)[0] * stage.clientWidth * view.z - stage.clientWidth * 0.5) : 0;
    place();
    $("detailIn").scrollTop = 0;
  }
  function place() {
    const { stage, inner } = view, W = stage.clientWidth, H = stage.clientHeight, h = (W / 4) * view.z;
    view.z = clamp(view.z, 1, 3); view.x = clamp(view.x, W - W * view.z, 0); view.y = clamp(view.y, -Math.max(0, (h - H) / 2 + 40), Math.max(0, (h - H) / 2 + 40));
    inner.style.transform = `translate3d(${view.x.toFixed(1)}px,${(-h / 2 + view.y - 8).toFixed(1)}px,0) scale(${view.z.toFixed(3)})`;
    $("zoomOut").textContent = `${Math.round(view.z * 100)}%`;
    inner.style.setProperty("--z", view.z.toFixed(3));
    if (view.light) view.light.size(W * view.z);
    aimAll();
  }
  function zoomBy(f, cx) { const W = view.stage.clientWidth, at = cx == null ? W / 2 : cx, z0 = view.z, z1 = clamp(z0 * f, 1, 3); view.x = at - ((at - view.x) * z1) / z0; view.z = z1; place(); }
  function setMode(m) { view.mode = m; $("stageBand").hidden = m !== "band"; view.inner.hidden = m === "band"; document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === m)); document.querySelector(".zoom").hidden = m === "band"; }

  function openDetail(rank, from) {
    if (!BY.has(rank)) return;
    const src = from && from.closest && from.closest(".entry");
    const run = () => { if (!detail.open) detail.showModal(); fill(rank); try { history.replaceState(null, "", `#no-${rank}`); } catch { /* sandboxed */ } };
    if (!src || detail.open || !canMorph()) { run(); return; }
    const img = src.querySelector(".entry-photo img"), name = src.querySelector("h3");
    img.style.viewTransitionName = "cigar"; name.style.viewTransitionName = "cigar-name";
    const vt = document.startViewTransition(() => { img.style.viewTransitionName = ""; name.style.viewTransitionName = ""; document.documentElement.classList.add("vt"); run(); });
    vt.finished.finally(() => document.documentElement.classList.remove("vt"));
  }
  function closeDetail() {
    if (!detail.open) return;
    const rank = view && view.rank, src = rank && $(`entry-${rank}`), done = () => { detail.close(); view = null; try { history.replaceState(null, "", location.pathname + location.search); } catch { /* sandboxed */ } };
    const onScreen = src && (() => { const r = src.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })();
    if (!src || !canMorph() || !onScreen || view.mode !== "whole") { done(); return; }
    const img = src.querySelector(".entry-photo img"), name = src.querySelector("h3"), root = document.documentElement;
    root.classList.add("vt");
    const vt = document.startViewTransition(() => { root.classList.remove("vt"); done(); img.style.viewTransitionName = "cigar"; name.style.viewTransitionName = "cigar-name"; });
    vt.finished.finally(() => { img.style.viewTransitionName = ""; name.style.viewTransitionName = ""; });
  }
  detail.addEventListener("cancel", (e) => { e.preventDefault(); closeDetail(); });

  async function share(rank) {
    const c = BY.get(rank), url = `${location.origin}${location.pathname}#no-${rank}`, text = `No. ${rank} on Cigar Aficionado's Top 25: ${c.name}, ${c.score} points.`;
    try { if (navigator.share) { await navigator.share({ title: c.name, text, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); $("dStatus").textContent = "Link copied."; } catch { $("dStatus").textContent = url; }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-save],[data-close],[data-go],[data-view],[data-zoom],[data-share],[data-reveal],[data-rv]"); if (!t) return;
    const d = t.dataset;
    if (d.save) { const r = +d.save; if (saved.has(r)) saved.delete(r); else saved.add(r); persist(); const on = saved.has(r);
      document.querySelectorAll(`[data-save="${r}"]`).forEach((b) => { b.setAttribute("aria-pressed", on); const s = b.querySelector("span"); if (s) s.textContent = on ? "Saved" : "Save"; else b.setAttribute("aria-label", `${on ? "Remove from saved" : "Save"}: ${BY.get(r).name}`); });
      if ($("dStatus") && detail.open) $("dStatus").textContent = on ? "Saved to your list on this device." : "Removed from your saved list."; }
    else if (d.open) { e.preventDefault(); openDetail(+d.open, t); }
    else if ("close" in d) closeDetail();
    else if (d.go) openDetail(+d.go);
    else if ("reveal" in d) playReveal();
    else if (d.rv) { if (d.rv === "skip") { if (rv.run) rv.run.finish(); } else if (d.rv === "replay") playReveal(); else { const then = d.rv; closeReveal(); if (then === "review") openDetail(1); } }
    else if (d.view) setMode(d.view);
    else if (d.zoom) zoomBy(+d.zoom > 0 ? 1.35 : 1 / 1.35);
    else if (d.share) share(+d.share);
  });

  // inspecting: drag to move, pinch or ctrl-wheel to zoom, keys when the table has focus
  { const pts = new Map(); let pinch = 0;
    detail.addEventListener("pointerdown", (e) => { const s = e.target.closest("#stage"); if (!s || !view || view.mode !== "whole") return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } s.classList.add("dragging"); });
    detail.addEventListener("pointermove", (e) => { if (!pts.has(e.pointerId) || !view) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomBy(dist / pinch, (a[0] + b[0]) / 2 - view.stage.getBoundingClientRect().left); pinch = dist; }
      else if (view.z > 1 || Math.abs(e.clientX - prev[0]) > Math.abs(e.clientY - prev[1])) { view.x += e.clientX - prev[0]; if (view.z > 1.6) view.y += e.clientY - prev[1]; place(); } });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; if (!pts.size && view) view.stage.classList.remove("dragging"); };
    detail.addEventListener("pointerup", up); detail.addEventListener("pointercancel", up);
    detail.addEventListener("wheel", (e) => { if (!e.ctrlKey || !e.target.closest("#stage") || !view) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - view.stage.getBoundingClientRect().left); }, { passive: false });
    detail.addEventListener("dblclick", (e) => { if (e.target.closest("#stage") && view && view.mode === "whole") zoomBy(view.z > 1.4 ? 1 / view.z : 2, e.clientX - view.stage.getBoundingClientRect().left); });
    detail.addEventListener("keydown", (e) => { if (!view || document.activeElement !== view.stage) return; const k = e.key;
      if (k === "+" || k === "=") zoomBy(1.35); else if (k === "-" || k === "_") zoomBy(1 / 1.35); else if (k === "ArrowLeft") { view.x += 60; place(); } else if (k === "ArrowRight") { view.x -= 60; place(); } else if (k === "0") { view.z = 1; view.x = view.y = 0; place(); } else return; e.preventDefault(); });
    addEventListener("resize", () => { if (view) place(); }); }

  /* ---------- the Cigar of the Year reveal ----------
     One sequence on one clock, so it can be skipped to its end or played again. The room starts dark,
     a light travels along the cigar and the page comes up to its usual paper, then the name and score. */
  const reveal = $("reveal"), rv = { run: null, light: null, done: false }, RV_END = 4.8;
  const seg = (a, b, t) => ease((t - a) / (b - a));
  function revealFrame(t) {
    const c = BY.get(1), up = seg(2.0, 3.5, t), move = seg(1.0, 3.6, t);
    reveal.style.setProperty("--t", up.toFixed(3));                                   // 0 dark, 1 paper
    reveal.dataset.ph = t < 0.25 ? 0 : t < 1.7 ? 1 : t < 3.5 ? 2 : t < 3.95 ? 3 : t < 4.5 ? 4 : 5;
    $("rvStage").style.transform = `translate3d(${((1 - move) * 5).toFixed(2)}%,0,0) scale(${(1.1 - 0.1 * move).toFixed(4)})`;
    if (rv.light) rv.light.set(-0.25 + 0.9 * seg(1.1, 3.4, t), 0.1, 0.04 + 0.96 * seg(1.5, 3.2, t));
    else $("rvStage").style.opacity = seg(1.5, 3.0, t);
    $("rvScore").textContent = Math.round(c.score - 9 + 9 * (1 - Math.pow(1 - clamp((t - 3.95) / 0.7), 3)));
  }
  function playReveal() {
    const c = BY.get(1);
    if (rv.run) rv.run.stop();
    $("rvName").textContent = c.name; rv.done = false;
    if (!reveal.open) reveal.showModal();
    if (!rv.light) { const cv = document.createElement("canvas"), api = lit(cv, 1); if (api) { rv.light = api; api.onready = () => { $("rvStage").classList.add("gl"); if (rv.done) revealFrame(RV_END); }; $("rvStage").prepend(cv); lights.add({ api, el: cv, held: () => !rv.done }); } }
    if (rv.light) rv.light.size($("rvStage").clientWidth);
    const finish = () => { rv.run = null; rv.done = true; $("rvSkip").hidden = true; reveal.querySelector('[data-rv="review"]').focus({ preventScroll: true }); aimAll(); };
    reveal.classList.toggle("instant", reduced);
    $("rvSkip").hidden = reduced;
    if (reduced) { revealFrame(RV_END); finish(); return; }
    $("rvSkip").focus({ preventScroll: true });
    let t0 = performance.now(), dead = false, id = 0;
    const step = (now) => { if (dead) return; const t = Math.min(RV_END, (now - t0) / 1000); revealFrame(t); if (t < RV_END) id = requestAnimationFrame(step); else { dead = true; finish(); } };
    revealFrame(0); id = requestAnimationFrame(step);
    rv.run = { stop() { dead = true; cancelAnimationFrame(id); }, finish() { if (dead) return; dead = true; cancelAnimationFrame(id); reveal.classList.add("instant"); revealFrame(RV_END); finish(); requestAnimationFrame(() => reveal.classList.remove("instant")); } };
  }
  function closeReveal() { if (rv.run) rv.run.stop(); rv.run = null; if (reveal.open) reveal.close(); }
  reveal.addEventListener("cancel", () => { if (rv.run) rv.run.stop(); rv.run = null; });
  window.__seekReveal = (t) => { if (rv.run) rv.run.stop(); rv.run = null; revealFrame(t); };     // for tools/ capture
  addEventListener("resize", () => { if (reveal.open && rv.light) rv.light.size($("rvStage").clientWidth); });

  /* ---------- boot ---------- */
  persist(); renderList(); flight();
  const m = /^#no-(\d{1,2})$/.exec(location.hash); if (m && BY.has(+m[1])) openDetail(+m[1]);
  if (location.hash === "#reveal" || new URLSearchParams(location.search).has("reveal")) playReveal();
})();
