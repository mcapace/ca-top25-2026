/* Top 25 Cigars of 2026 — concept prototype.
   Everything here runs in the browser so the reveal week can be simulated in a
   meeting. A production build would keep unreleased cigars on the server, as
   the Top 20 does, and the browser would only ever render what it is sent. */
(() => {
  "use strict";
  const CIGARS = window.CA_TOP25;
  const BY_RANK = new Map(CIGARS.map((c) => [c.rank, c]));
  const TIME = "10:00 AM ET";
  // Proposed schedule. Mid-December is Eastern Standard Time, so 10:00 AM ET is 15:00Z.
  const RELEASES = [
    { at: "2026-12-14T15:00:00Z", ranks: [10, 9, 8], day: "Monday, December 14", sim: "Mon", title: "Nos. 10–8" },
    { at: "2026-12-15T15:00:00Z", ranks: [7, 6, 5], day: "Tuesday, December 15", sim: "Tue", title: "Nos. 7–5" },
    { at: "2026-12-16T15:00:00Z", ranks: [4, 3, 2], day: "Wednesday, December 16", sim: "Wed", title: "Nos. 4–2" },
    { at: "2026-12-17T15:00:00Z", ranks: [1], day: "Thursday, December 17", sim: "No. 1", title: "No. 1, Cigar of the Year" },
    { at: "2026-12-18T15:00:00Z", ranks: [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11], day: "Friday, December 18", sim: "Full list", title: "Nos. 11–25" },
  ];
  const RELEASE_OF = new Map();
  RELEASES.forEach((r, i) => r.ranks.forEach((k) => RELEASE_OF.set(k, i)));
  const STRENGTH = { Mild: 1, "Mild-Medium": 2, Medium: 3, "Medium-Full": 4, Full: 5 };
  const POLL = ["Nicaragua", "Dominican Republic", "Cuba", "Honduras"];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ca25." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("ca25." + k, JSON.stringify(v)); } catch { /* private window */ } },
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    stage: 3, simBase: 0, simSetAt: 0,
    saved: new Set(store.get("humidor", [])),
    pick: store.get("pick", null),
    q: "", country: "All", sort: "rank",
    fresh: new Set(), open: null,
  };

  /* ---------- helpers ---------- */
  const now = () => state.simBase + (Date.now() - state.simSetAt);
  const isOpen = (rank) => RELEASE_OF.get(rank) < state.stage;
  const revealed = () => CIGARS.filter((c) => isOpen(c.rank));
  const FR = { 0.125: "1/8", 0.25: "1/4", 0.375: "3/8", 0.5: "1/2", 0.625: "5/8", 0.75: "3/4", 0.875: "7/8" };
  const fmtLen = (n) => { const w = Math.floor(n), f = FR[+(n - w).toFixed(3)]; return (f ? `${w} ${f}` : `${w}`) + "″"; };
  const fmtSize = (c) => `${fmtLen(c.len)} × ${c.ring}`;
  const fmtPrice = (c) => (c.price == null ? "Price n/a" : `${c.cur}${c.price.toFixed(2)}${c.cur === "£" ? " (U.K.)" : ""}`);
  const pad = (n) => String(n).padStart(2, "0");
  const parts = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 }; };
  const cdText = (ms) => { const p = parts(ms); return (p.d ? `${p.d}d ` : "") + `${pad(p.h)}h ${pad(p.m)}m ${pad(p.s)}s`; };
  const pips = (c) => { const n = STRENGTH[c.strength] || 3; return `<span class="pips" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "f" : ""}"></i>`).join("")}</span>`; };
  const ICON = {
    play: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>',
    box: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Zm1-4h16a1 1 0 0 1 1 1v3H3V6a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 12v5m-2.5-2.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" class="plus"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    l: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    r: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m10 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }
  const sealedMsg = (rank) => { const r = RELEASES[RELEASE_OF.get(rank)]; return `No. ${rank} opens ${r.day} at ${TIME}`; };

  /* ---------- hero: clock, ladder ---------- */
  function renderHero() {
    const next = RELEASES[state.stage];
    const n = revealed().length;
    $("revCount").textContent = n;
    $("heroEyebrow").textContent = state.stage === 0 ? "Reveal week begins December 14" : state.stage === 5 ? "The complete list" : `Reveal week · Day ${state.stage} of 5`;
    const clock = document.querySelector(".clock");
    clock.classList.toggle("done", !next);
    if (next) {
      $("clockKicker").textContent = "Next reveal";
      $("clockTitle").textContent = next.title;
      $("clockWhen").textContent = `${next.day} · ${TIME}`;
    } else {
      $("clockKicker").textContent = "The list is complete";
      $("clockTitle").textContent = "All 25, revealed";
      $("clockWhen").textContent = `Cigar of the Year: ${BY_RANK.get(1).name}`;
    }
    $("ladder").innerHTML = Array.from({ length: 25 }, (_, i) => 25 - i).map((rank) => {
      const on = isOpen(rank), nx = !on && RELEASE_OF.get(rank) === state.stage;
      return `<li><button type="button" data-jump="${rank}" class="${on ? "on" : ""}${on && rank === 1 ? " coty" : ""}${nx ? " next" : ""}" aria-label="No. ${rank}, ${on ? "revealed" : "sealed"}">${rank}</button></li>`;
    }).join("");
  }

  function renderSched() {
    $("sched").innerHTML = RELEASES.map((r, i) => {
      const cls = i < state.stage ? "is-open" : i === state.stage ? "is-next" : "";
      const chip = i < state.stage ? "✓ Revealed" : i === state.stage ? `Opens in <span data-cd="${i}"></span>` : "Sealed";
      return `<li class="${cls}"><span class="d">${r.day} · ${TIME}</span><span class="t">${r.title}${i === 4 ? " + Best Buys" : ""}</span><span class="s">${chip}</span></li>`;
    }).join("");
    const cur = $("sched").children[Math.min(state.stage, 4)];
    if (cur && $("sched").scrollWidth > $("sched").clientWidth) $("sched").scrollTo({ left: cur.offsetLeft - $("sched").offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
  }

  /* ---------- Cigar of the Year ---------- */
  function factsGrid(c) {
    const rows = [["Made by", c.maker], ["Factory", c.country], ["Size", fmtSize(c) + " ring gauge"], ["Strength", c.strength], ["Wrapper", c.wrapper], ["Binder", c.binder], ["Filler", c.filler], ["Price", fmtPrice(c)]];
    return `<dl class="facts-grid">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  }
  function renderCoty() {
    const el = $("cotyStage"), c = BY_RANK.get(1);
    if (!isOpen(1)) {
      const r = RELEASES[3];
      el.innerHTML = `<div class="coty-sealed">
        <div>
          <p class="kicker">No. 1 · Sealed</p>
          <h2 id="cotyH">Cigar of the Year <em>2026</em></h2>
          <p class="when">Opens <b>${r.day}</b> at <b>${TIME}</b>${state.stage <= 3 ? ` · in <b data-cd="3"></b>` : ""}</p>
          <div class="poll">
            <p>Call it. Which country makes this year's No. 1?</p>
            <div class="poll-opts" role="group" aria-label="Your prediction">${POLL.map((p) => `<button type="button" class="chip" data-pick="${p}" aria-pressed="${state.pick === p}">${p}</button>`).join("")}</div>
            <small id="pollMsg">${state.pick ? `Your call: ${state.pick}. We'll tell you how you did on Thursday.` : "Pick one. We'll tell you how you did when it opens."}</small>
          </div>
        </div>
        <div class="seal" aria-hidden="true"><div><b>1</b><span>Cigar of the Year<br>Sealed</span></div></div>
      </div>`;
      return;
    }
    const called = state.pick ? (state.pick === c.country ? `You called it: ${c.country}.` : `You picked ${state.pick}. It went to ${c.country}.`) : "";
    el.innerHTML = `<div class="coty-open${state.fresh.has(1) ? " fresh-coty" : ""}">
      <div class="coty-top">
        <div><p class="kicker">No. 1 · Cigar of the Year 2026</p><h2 id="cotyH">${esc(c.name)}</h2></div>
        <div class="coty-score"><b>${c.score}</b><span>points</span></div>
      </div>
      <button class="coty-photo" type="button" data-open="1" aria-label="Open the full review of ${esc(c.name)}"><img src="assets/c1.webp" alt="${esc(c.name)}" width="1400" height="350"></button>
      <div class="coty-bottom">
        <div>
          <p class="coty-note">${esc(c.note[0])}</p>
          <div class="coty-actions">
            <button class="btn btn-ink" type="button" data-open="1">Read the full review</button>
            ${c.video ? `<a class="btn btn-line" href="https://www.cigaraficionado.com/video/${c.video}" target="_blank" rel="noopener">${ICON.play} Watch the film</a>` : ""}
            <button class="btn btn-line" type="button" data-save="1" aria-pressed="${state.saved.has(1)}">${ICON.box} <span>${state.saved.has(1) ? "In my humidor" : "Add to my humidor"}</span></button>
          </div>
          ${called ? `<p style="margin-top:16px;font-weight:600;color:var(--red)">${esc(called)}</p>` : ""}
        </div>
        ${factsGrid(c)}
      </div>
    </div>`;
  }

  /* ---------- the list ---------- */
  function rowHTML(c, i) {
    const saved = state.saved.has(c.rank);
    return `<article class="row${c.rank === 1 ? " is-coty" : ""}${state.fresh.has(c.rank) ? " fresh" : ""}" id="no-${c.rank}-row" style="--tint:${c.tint};--i:${i}">
      <div class="row-rank"><small>No.</small>${c.rank}</div>
      <div class="row-photo"><img src="assets/c${c.rank}.webp" alt="" width="1400" height="350" loading="lazy"></div>
      <div class="row-body">
        <p class="row-origin">${esc(c.country)} · ${esc(c.strength)}</p>
        <h3><button type="button" data-open="${c.rank}">${esc(c.name)}</button></h3>
        ${c.rank === 1 ? '<span class="badge-coty">Cigar of the Year</span>' : ""}
        <ul class="facts"><li>${fmtSize(c)}</li><li>${pips(c)}<span class="sr">Strength: ${esc(c.strength)}</span></li><li>${fmtPrice(c)}</li></ul>
      </div>
      <div class="row-score"><b>${c.score}</b><span>points</span></div>
      <div class="row-acts">
        <span class="grow">Read the review <i aria-hidden="true">→</i></span>
        ${c.video ? `<a class="pill" href="https://www.cigaraficionado.com/video/${c.video}" target="_blank" rel="noopener" aria-label="Watch the film for ${esc(c.name)}">${ICON.play} Film</a>` : ""}
        <button class="pill" type="button" data-save="${c.rank}" aria-pressed="${saved}" aria-label="${saved ? "Remove from" : "Add to"} my humidor: ${esc(c.name)}">${ICON.box} <span>${saved ? "Saved" : "Save"}</span></button>
      </div>
    </article>`;
  }
  function sealedHTML(ranks) {
    const idx = RELEASE_OF.get(ranks[0]), r = RELEASES[idx];
    const asc = [...ranks].sort((a, b) => a - b);
    const title = asc.length === 1 ? (asc[0] === 1 ? "No. 1, Cigar of the Year" : `No. ${asc[0]}`) : `Nos. ${asc[0]}–${asc[asc.length - 1]}`;
    return `<div class="sealed${idx === state.stage ? " is-next" : ""}">
      <div><p class="d">${r.day} · ${TIME}</p><h3>${title}</h3><p class="cd">${idx === state.stage ? `Opens in <b data-cd="${idx}"></b>` : "Sealed until then"}</p></div>
      <div class="tiles">${asc.map((k) => `<button type="button" class="tile" data-sealed="${k}" aria-label="No. ${k}, sealed">${k}</button>`).join("")}</div>
    </div>`;
  }
  function renderList() {
    const rev = revealed();
    $("tools").classList.toggle("off", rev.length === 0);
    $("listSub").textContent = state.stage === 0 ? "Nothing has been revealed yet. The first three cigars open Monday morning."
      : state.stage === 5 ? "All 25 cigars, ranked. Search, filter and sort the full list, and save the ones you want to track down."
      : `${rev.length} of 25 are open. Sealed cigars stay sealed until their morning.`;

    // country chips, from revealed cigars only
    const counts = new Map();
    rev.forEach((c) => counts.set(c.country, (counts.get(c.country) || 0) + 1));
    if (state.country !== "All" && !counts.has(state.country)) state.country = "All";
    $("countryChips").innerHTML = [["All", rev.length], ...[...counts].sort((a, b) => b[1] - a[1])].map(([k, n]) =>
      `<button type="button" class="chip" data-country="${esc(k)}" aria-pressed="${state.country === k}">${esc(k)}<b>${n}</b></button>`).join("");

    const q = state.q.trim().toLowerCase();
    const plain = !q && state.country === "All" && state.sort === "rank";
    let html = "";
    if (plain) {
      let run = [], i = 0;
      const flush = () => { if (run.length) { html += sealedHTML(run); run = []; } };
      for (let rank = 1; rank <= 25; rank++) {
        if (isOpen(rank)) { flush(); html += rowHTML(BY_RANK.get(rank), state.fresh.has(rank) ? i++ : 0); }
        else { if (run.length && RELEASE_OF.get(run[0]) !== RELEASE_OF.get(rank)) flush(); run.push(rank); }
      }
      flush();
    } else {
      let rows = rev.filter((c) => (state.country === "All" || c.country === state.country) &&
        (!q || `${c.name} ${c.country} ${c.maker} ${c.wrapper} ${c.strength}`.toLowerCase().includes(q)));
      const usd = (c) => (c.cur === "$" && c.price != null ? c.price : Infinity);
      const cmp = { rank: (a, b) => a.rank - b.rank, score: (a, b) => b.score - a.score || a.rank - b.rank, price: (a, b) => usd(a) - usd(b) || a.rank - b.rank, length: (a, b) => b.len - a.len || b.ring - a.ring, strength: (a, b) => STRENGTH[b.strength] - STRENGTH[a.strength] || a.rank - b.rank }[state.sort];
      rows = rows.sort(cmp);
      html = rows.length ? rows.map((c) => rowHTML(c, 0)).join("")
        : `<div class="empty"><p>No revealed cigar matches that yet.</p><button class="btn btn-ghost btn-sm" type="button" id="clearFilters">Clear search and filters</button></div>`;
      const hidden = 25 - rev.length;
      if (hidden && rows.length) html += `<p class="empty" style="padding:18px">${hidden} more ${hidden === 1 ? "cigar is" : "cigars are"} still sealed and will join these results as they open.</p>`;
    }
    $("rows").innerHTML = html;
  }

  /* ---------- film reel ---------- */
  function renderReel() {
    $("reel").innerHTML = CIGARS.filter((c) => c.video).sort((a, b) => isOpen(b.rank) - isOpen(a.rank) || a.rank - b.rank).map((c) => isOpen(c.rank)
      ? `<a class="clip" href="https://www.cigaraficionado.com/video/${c.video}" target="_blank" rel="noopener">
          <img src="assets/b${c.rank}.webp" alt="" width="520" height="520" loading="lazy">
          <span class="clip-play" aria-hidden="true">${ICON.play}</span>
          <span class="clip-meta"><span>No. ${c.rank} · ${c.score} points</span><b>${esc(c.name)}</b></span></a>`
      : `<div class="clip sealed-clip"><div><b>${c.rank}</b><span>Film opens ${RELEASES[RELEASE_OF.get(c.rank)].day.replace(", December", ", Dec.")}</span></div></div>`).join("");
  }

  /* ---------- by the numbers ---------- */
  function renderNumbers() {
    const rev = revealed();
    const usd = rev.filter((c) => c.cur === "$" && c.price != null).map((c) => c.price).sort((a, b) => a - b);
    const med = usd.length ? (usd.length % 2 ? usd[(usd.length - 1) / 2] : (usd[usd.length / 2 - 1] + usd[usd.length / 2]) / 2) : null;
    const counts = new Map(); rev.forEach((c) => counts.set(c.country, (counts.get(c.country) || 0) + 1));
    const top = [...counts].sort((a, b) => b[1] - a[1]);
    const avg = rev.length ? (rev.reduce((s, c) => s + c.score, 0) / rev.length).toFixed(1) : "—";
    $("stats").innerHTML = [
      [`${rev.length}<small style="font-size:.5em;color:var(--smoke)"> / 25</small>`, "Revealed"],
      [avg, "Average score"],
      [med == null ? "—" : `$${med.toFixed(2)}`, "Median U.S. price"],
      [top.length ? esc(top[0][0]) : "—", top.length ? `Most cigars so far (${top[0][1]})` : "Leading country"],
    ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");

    const none = `<p class="empty" style="padding:24px">Opens with the first reveal on Monday, December 14.</p>`;
    $("chartCountry").innerHTML = top.length ? top.map(([k, n]) => `<div class="bar"><span>${esc(k)}</span><div><i style="width:${(n / top[0][1]) * 100}%"></i></div><b>${n}</b></div>`).join("") : none;

    // scatter: x = U.S. price, y = score; same-score points dodge vertically
    const pts = rev.filter((c) => c.cur === "$" && c.price != null);
    if (!pts.length) $("chartScatter").innerHTML = none;
    else {
      const small = $("chartScatter").clientWidth < 460, W = small ? 340 : 560, H = small ? 250 : 300, L = 34, R = 14, T = 14, B = 34;
      const xMax = Math.max(40, Math.ceil(Math.max(...pts.map((c) => c.price)) / 10) * 10);
      const sMin = Math.min(...pts.map((c) => c.score)), sMax = Math.max(...pts.map((c) => c.score));
      const lo = sMin - 0.5, hi = sMax + 0.5;
      const x = (v) => L + (v / xMax) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
      const band = (H - T - B) / (hi - lo);
      const placed = [];
      const dots = [...pts].sort((a, b) => a.price - b.price).map((c) => {
        const cx = x(c.price); let dy = 0;
        for (const d of [0, -11, 11, -22, 22].filter((d) => Math.abs(d) < band / 2 - 5 || d === 0)) { dy = d; if (!placed.some((p) => p.s === c.score && p.dy === d && Math.abs(p.cx - cx) < 14)) break; }
        placed.push({ s: c.score, dy, cx });
        return { c, cx, cy: y(c.score) + dy };
      });
      let g = "";
      for (let s = sMin; s <= sMax; s++) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(s)}" y2="${y(s)}"/><text x="${L - 8}" y="${y(s) + 4}" text-anchor="end">${s}</text>`;
      for (let v = 0; v <= xMax; v += small && xMax > 40 ? 20 : 10) g += `<text x="${x(v)}" y="${H - 10}" text-anchor="middle">$${v}</text>`;
      $("chartScatter").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Score against U.S. price for revealed cigars">${g}
        ${dots.map((d) => `<circle tabindex="0" role="button" aria-label="No. ${d.c.rank}, ${esc(d.c.name)}, ${d.c.score} points, $${d.c.price.toFixed(2)}" data-open="${d.c.rank}" data-tip="${d.c.rank}" data-x="${(d.cx / W) * 100}" data-y="${(d.cy / H) * 100}" cx="${d.cx}" cy="${d.cy}" r="7" fill="${d.c.rank === 1 ? "#b4232c" : d.c.tint}"/>`).join("")}
      </svg><div class="tip" id="tip" hidden></div>`;
    }

    $("chartSizes").innerHTML = rev.length ? [...rev].sort((a, b) => b.len - a.len || b.ring - a.ring || a.rank - b.rank).map((c) =>
      `<button type="button" class="size" data-open="${c.rank}" style="--len:${c.len};--ring:${c.ring};--tint:${c.tint}" aria-label="No. ${c.rank}, ${esc(c.name)}, ${fmtSize(c)}">
        <span class="shape"></span><span class="lab"><b>No. ${c.rank} · ${esc(c.name)}</b><span>${fmtSize(c)}</span></span></button>`).join("") : none;
  }

  /* ---------- drawers ---------- */
  function openDrawer(rank) {
    const c = BY_RANK.get(rank);
    if (!c || !isOpen(rank)) { if (c) toast(sealedMsg(rank)); return; }
    state.open = rank;
    const order = revealed().map((x) => x.rank), at = order.indexOf(rank);
    const saved = state.saved.has(rank);
    $("drawerIn").innerHTML = `
      <div class="d-bar">
        <span class="sp">${at + 1} of ${order.length} revealed</span>
        <button class="icon-btn" type="button" data-nav="${order[at - 1] ?? ""}" ${at === 0 ? "disabled" : ""} aria-label="Previous cigar">${ICON.l}</button>
        <button class="icon-btn" type="button" data-nav="${order[at + 1] ?? ""}" ${at === order.length - 1 ? "disabled" : ""} aria-label="Next cigar">${ICON.r}</button>
        <button class="icon-btn" type="button" data-close aria-label="Close">${ICON.x}</button>
      </div>
      <div class="d-head">
        <div><p class="d-rank">No. ${c.rank}${c.rank === 1 ? " · Cigar of the Year" : ""}</p><h2 id="dName">${esc(c.name)}</h2><p class="d-origin">${esc(c.maker)} · ${esc(c.country)}</p></div>
        <div class="d-score"><div><b>${c.score}</b><br><span>points</span></div></div>
      </div>
      <div class="d-photo"><img src="assets/c${c.rank}.webp" alt="${esc(c.name)}" width="1400" height="350"></div>
      <div class="d-acts">
        <button class="pill" type="button" data-save="${c.rank}" aria-pressed="${saved}">${ICON.box} <span>${saved ? "In my humidor" : "Add to my humidor"}</span></button>
        ${c.video ? `<a class="pill" href="https://www.cigaraficionado.com/video/${c.video}" target="_blank" rel="noopener">${ICON.play} Watch the film</a>` : ""}
        <button class="pill" type="button" data-share="${c.rank}">${ICON.share} Share</button>
      </div>
      <div class="d-note"><img class="d-band" src="assets/b${c.rank}.webp" alt="The band, up close" width="520" height="520" loading="lazy">${c.note.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      <div class="d-facts">${factsGrid(c)}</div>
      <p class="d-foot">Prototype content: this is the published 2025 review, standing in for 2026.</p>`;
    const d = $("drawer");
    if (!d.open) d.showModal();
    $("drawerIn").scrollTop = 0;
    try { history.replaceState(null, "", `#no-${rank}`); } catch { /* sandboxed */ }
  }
  function closeDrawer() { $("drawer").close(); }
  $("drawer").addEventListener("close", () => { state.open = null; try { history.replaceState(null, "", location.pathname + location.search); } catch { /* sandboxed */ } });

  function renderHumidor() {
    const items = revealed().filter((c) => state.saved.has(c.rank));
    $("humidorCount").textContent = items.length;
    const usd = items.filter((c) => c.cur === "$" && c.price != null);
    const total = usd.reduce((s, c) => s + c.price, 0);
    $("humidorIn").innerHTML = `
      <div class="d-bar"><span class="sp">Saved on this device</span><button class="icon-btn" type="button" data-close aria-label="Close">${ICON.x}</button></div>
      <div class="d-head"><div><p class="d-rank">${items.length} ${items.length === 1 ? "cigar" : "cigars"}</p><h2 id="hTitle">My humidor</h2></div></div>
      ${items.length ? `<div class="h-list">${items.map((c) => `<div class="h-item"><span class="r">${c.rank}</span><div><button type="button" class="name" data-open="${c.rank}">${esc(c.name)}</button><small>${fmtSize(c)} · ${c.score} points · ${fmtPrice(c)}</small></div><button class="icon-btn" type="button" data-save="${c.rank}" aria-label="Remove ${esc(c.name)}">${ICON.x}</button><img src="assets/c${c.rank}.webp" alt="" width="1400" height="350" loading="lazy"></div>`).join("")}</div>
        <div class="h-total"><span>One of each, U.S. suggested retail${usd.length < items.length ? "<br><small style='font-weight:400;color:var(--paper-mute)'>U.K.-priced cigars not included</small>" : ""}</span><b>$${total.toFixed(2)}</b></div>
        <div class="d-acts"><button class="btn btn-ink btn-sm" type="button" id="copyList">Copy my list</button></div>`
        : `<p class="h-empty">Nothing saved yet. Tap Save on any revealed cigar to build a shopping list for your next trip to the shop.</p>`}`;
  }
  function toggleSave(rank) {
    const c = BY_RANK.get(rank);
    if (state.saved.has(rank)) { state.saved.delete(rank); toast("Removed from your humidor"); }
    else { state.saved.add(rank); toast(`Saved: ${c.name}`); $("humidorBtn").classList.remove("bump"); void $("humidorBtn").offsetWidth; $("humidorBtn").classList.add("bump"); if (navigator.vibrate) try { navigator.vibrate(12); } catch { /* unsupported */ } }
    store.set("humidor", [...state.saved]);
    const on = state.saved.has(rank);
    document.querySelectorAll(`[data-save="${rank}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", on);
      const s = b.querySelector("span"); if (s) s.textContent = b.classList.contains("btn") || b.closest(".d-acts") ? (on ? "In my humidor" : "Add to my humidor") : (on ? "Saved" : "Save");
    });
    renderHumidor();
  }
  async function share(rank) {
    const c = BY_RANK.get(rank), url = `${location.origin}${location.pathname}#no-${rank}`;
    const text = `No. ${rank} on Cigar Aficionado's Top 25: ${c.name}, ${c.score} points.`;
    try { if (navigator.share) { await navigator.share({ title: c.name, text, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast("Link copied"); } catch { toast(url); }
  }

  /* ---------- takeover ---------- */
  let sparkRaf;
  function showTakeover() {
    const c = BY_RANK.get(1);
    $("takeoverIn").innerHTML = `<p class="kicker">Cigar of the Year 2026</p>
      <div class="paper"><img src="assets/c1.webp" alt="${esc(c.name)}" width="1400" height="350"></div>
      <h2>${esc(c.name)}</h2>
      <p class="meta"><b>${c.score}</b> points · ${esc(c.country)} · ${fmtSize(c)}</p>
      <div class="btns"><button class="btn btn-ember" type="button" data-take="review">Read the review</button><button class="btn btn-ghost" type="button" data-take="close">Back to the list</button></div>`;
    $("takeover").hidden = false;
    $("takeoverIn").querySelector("button").focus({ preventScroll: true });
    if (reduced) return;
    const cv = $("sparks"), ctx = cv.getContext("2d");
    const size = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }; size();
    const P = Array.from({ length: 90 }, () => ({ x: Math.random(), y: 1 + Math.random(), v: 0.0015 + Math.random() * 0.004, r: 0.6 + Math.random() * 2, w: Math.random() * 6.28 }));
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of P) {
        p.y -= p.v; p.w += 0.03; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const a = Math.max(0, Math.min(1, p.y * 1.3));
        ctx.beginPath(); ctx.fillStyle = `rgba(255,${130 + Math.round(70 * a)},60,${0.75 * a})`;
        ctx.arc((p.x + Math.sin(p.w) * 0.012) * cv.width, p.y * cv.height, p.r, 0, 6.28); ctx.fill();
      }
      sparkRaf = requestAnimationFrame(draw);
    };
    draw();
  }
  function hideTakeover(then) {
    $("takeover").hidden = true; cancelAnimationFrame(sparkRaf);
    if (then === "review") openDrawer(1); else $("coty").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  /* ---------- stage ---------- */
  function renderSim() {
    const labels = ["Before", ...RELEASES.map((r) => r.sim)].map((l) => ({ Before: '<span class="lg">Before</span><span class="sm">Pre</span>', "Full list": '<span class="lg">Full list</span><span class="sm">All 25</span>' }[l] || l));
    $("simStages").innerHTML = labels.map((l, i) => `<button type="button" data-stage="${i}" aria-pressed="${state.stage === i}">${l}</button>`).join("");
    const cur = $("simStages").children[state.stage];
    if (cur && cur.scrollIntoView && $("simStages").scrollWidth > $("simStages").clientWidth) $("simStages").scrollTo({ left: cur.offsetLeft - 60, behavior: "smooth" });
  }
  function setStage(n, { celebrate = false } = {}) {
    const before = new Set(revealed().map((c) => c.rank)), prev = state.stage;
    state.stage = Math.max(0, Math.min(5, n));
    state.simSetAt = Date.now();
    state.simBase = state.stage === 0 ? Date.parse(RELEASES[0].at) - (2 * 86400 + 6 * 3600 + 14 * 60 + 9) * 1000
      : Date.parse(RELEASES[state.stage - 1].at) + (3 * 3600 + 17 * 60 + 12) * 1000;
    state.fresh = celebrate && state.stage > prev ? new Set(revealed().map((c) => c.rank).filter((r) => !before.has(r))) : new Set();
    store.set("stage", state.stage);
    renderAll();
    if (state.fresh.size) setTimeout(() => { state.fresh = new Set(); document.querySelectorAll(".fresh").forEach((e) => e.classList.remove("fresh")); }, 3600);
    if (celebrate && state.fresh.has(1)) showTakeover();
    else if (celebrate && state.fresh.size) {
      const first = Math.min(...state.fresh);
      const el = $(`no-${first}-row`); if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      toast(`${RELEASES[state.stage - 1].title} just opened`);
    }
    if (state.open && !isOpen(state.open)) closeDrawer();
  }
  function renderAll() { renderHero(); renderSched(); renderCoty(); renderList(); renderReel(); renderNumbers(); renderHumidor(); renderSim(); tick(); }

  function tick() {
    const t = now(), next = RELEASES[state.stage];
    if (next) { const p = parts(Date.parse(next.at) - t); $("cdD").textContent = pad(p.d); $("cdH").textContent = pad(p.h); $("cdM").textContent = pad(p.m); $("cdS").textContent = pad(p.s); }
    document.querySelectorAll("[data-cd]").forEach((el) => { el.textContent = cdText(Date.parse(RELEASES[+el.dataset.cd].at) - t); });
  }
  setInterval(tick, 1000);

  let playTimer;
  function playWeek() {
    clearInterval(playTimer); setStage(0); scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    $("simPlay").textContent = "■ Stop";
    playTimer = setInterval(() => { if (state.stage >= 3) { stopPlay(); setStage(4, { celebrate: true }); } else setStage(state.stage + 1, { celebrate: true }); }, 4200);
  }
  function stopPlay() { clearInterval(playTimer); playTimer = null; $("simPlay").textContent = "▶ Play the week"; }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-save],[data-jump],[data-sealed],[data-stage],[data-country],[data-pick],[data-nav],[data-close],[data-share],[data-take],#clearFilters,#copyList");
    if (!t) return;
    const d = t.dataset;
    if (d.save) { e.preventDefault(); toggleSave(+d.save); }
    else if (d.open) { if ($("humidor").open) $("humidor").close(); openDrawer(+d.open); }
    else if (d.nav) openDrawer(+d.nav);
    else if ("close" in d) t.closest("dialog").close();
    else if (d.share) share(+d.share);
    else if (d.take) hideTakeover(d.take);
    else if (d.sealed) toast(sealedMsg(+d.sealed));
    else if (d.jump) {
      const rank = +d.jump;
      if (!isOpen(rank)) { toast(sealedMsg(rank)); return; }
      state.q = ""; state.country = "All"; state.sort = "rank"; $("q").value = ""; $("sort").value = "rank"; renderList();
      const el = $(`no-${rank}-row`); if (el) { el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); el.classList.add("fresh"); setTimeout(() => el.classList.remove("fresh"), 1600); }
    }
    else if (d.stage) { stopPlay(); setStage(+d.stage, { celebrate: true }); }
    else if (d.country) { state.country = d.country; renderList(); }
    else if (d.pick) {
      state.pick = state.pick === d.pick ? null : d.pick; store.set("pick", state.pick);
      document.querySelectorAll("[data-pick]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.pick === state.pick));
      $("pollMsg").textContent = state.pick ? `Your call: ${state.pick}. We'll tell you how you did on Thursday.` : "Pick one. We'll tell you how you did when it opens.";
    }
    else if (t.id === "clearFilters") { state.q = ""; state.country = "All"; state.sort = "rank"; $("q").value = ""; $("sort").value = "rank"; renderList(); }
    else if (t.id === "copyList") {
      const items = revealed().filter((c) => state.saved.has(c.rank));
      const text = "My Top 25 shortlist\n" + items.map((c) => `No. ${c.rank} ${c.name} (${fmtSize(c)}, ${c.score} pts, ${fmtPrice(c)})`).join("\n");
      navigator.clipboard.writeText(text).then(() => toast("List copied"), () => toast("Couldn't copy on this device"));
    }
  });
  $("q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderList(); });
  $("humidorBtn").addEventListener("click", () => { renderHumidor(); $("humidor").showModal(); });
  document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
  $("simPlay").addEventListener("click", () => (playTimer ? stopPlay() : playWeek()));
  $("simToggle").addEventListener("click", () => { const c = $("sim").classList.toggle("closed"); $("simToggle").setAttribute("aria-expanded", !c); });
  document.addEventListener("keydown", (e) => {
    if (!$("takeover").hidden && e.key === "Escape") { hideTakeover("close"); return; }
    if (state.open == null || !$("drawer").open) return;
    const order = revealed().map((x) => x.rank), at = order.indexOf(state.open);
    if (e.key === "ArrowRight" && order[at + 1]) openDrawer(order[at + 1]);
    if (e.key === "ArrowLeft" && order[at - 1]) openDrawer(order[at - 1]);
  });

  // scatter tooltip
  const showTip = (el) => { const c = BY_RANK.get(+el.dataset.tip), tip = $("tip"); if (!tip) return; tip.innerHTML = `<b>No. ${c.rank} · ${esc(c.name)}</b>${c.score} points · $${c.price.toFixed(2)}`; tip.style.left = `clamp(90px, ${el.dataset.x}%, calc(100% - 90px))`; tip.style.top = el.dataset.y + "%"; tip.hidden = false; };
  ["pointerover", "focusin"].forEach((ev) => $("chartScatter").addEventListener(ev, (e) => { if (e.target.dataset && e.target.dataset.tip) showTip(e.target); }));
  ["pointerout", "focusout"].forEach((ev) => $("chartScatter").addEventListener(ev, () => { const tip = $("tip"); if (tip) tip.hidden = true; }));
  $("chartScatter").addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.open) { e.preventDefault(); openDrawer(+e.target.dataset.open); } });

  // alerts (prototype: nothing is sent)
  $("alertForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("email").value.trim(), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    $("alertMsg").textContent = ok ? "You're set for all five reveals. (Prototype: no email was stored or sent.)" : "That doesn't look like an email address. Check it and try again.";
    $("alertMsg").style.color = ok ? "var(--paper-ink)" : "var(--red)";
  });

  // calendar file with the five reveal times
  $("icsBtn").addEventListener("click", () => {
    const stamp = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ev = RELEASES.map((r, i) => ["BEGIN:VEVENT", `UID:top25-2026-${i + 1}@cigaraficionado.com`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(r.at)}`, `DTEND:${stamp(new Date(Date.parse(r.at) + 18e5).toISOString())}`, `SUMMARY:Cigar Aficionado Top 25 reveal: ${r.title.replace(/,/g, "\\,")}`, "URL:https://www.cigaraficionado.com/top25", "END:VEVENT"].join("\r\n"));
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cigar Aficionado//Top 25//EN", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })); a.download = "cigar-aficionado-top-25-2026.ics";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Five reveal dates added to a calendar file");
  });

  // archive years
  $("archive").innerHTML = Array.from({ length: 22 }, (_, i) => 2025 - i).map((y) => `<li><a href="https://www.cigaraficionado.com/top25/${y}">${y}</a></li>`).join("");

  // burn line
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { const h = document.documentElement; $("burn").style.width = `${Math.min(100, (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100)}%`; ticking = false; });
  }, { passive: true });

  /* ---------- smoke (WebGL) ---------- */
  (function smoke() {
    const cv = $("smoke"), gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { cv.style.background = "radial-gradient(60% 60% at 70% 40%, #3a2416, #0f0b08 70%)"; return; }
    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `precision mediump float;uniform vec2 r;uniform float t;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
      void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=vec2(uv.x*r.x/r.y,uv.y)*2.4;p.y-=t*.07;
        vec2 q=vec2(fbm(p+t*.035),fbm(p+vec2(5.2,1.3)-t*.025));
        float f=fbm(p+2.4*q);float w=smoothstep(.38,.9,f);
        float side=smoothstep(.15,.95,uv.x);
        vec3 c=mix(vec3(.059,.043,.031),vec3(.72,.6,.5),w*.62*(.4+.6*side));
        c+=vec3(.95,.36,.1)*pow(1.-uv.y,3.5)*.28*(.5+.8*q.x)*side;
        gl_FragColor=vec4(c,1.);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.background = "radial-gradient(60% 60% at 70% 40%, #3a2416, #0f0b08 70%)"; return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t");
    const size = () => { const s = Math.min(1, 720 / cv.clientWidth); cv.width = Math.max(2, Math.round(cv.clientWidth * s)); cv.height = Math.max(2, Math.round(cv.clientHeight * s)); gl.viewport(0, 0, cv.width, cv.height); };
    let visible = true, raf;
    const frame = (ms) => { gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, ms / 1000 + 40); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); if (visible && !reduced) raf = requestAnimationFrame(frame); };
    size(); frame(0);
    new ResizeObserver(() => { size(); if (reduced) frame(0); }).observe(cv);
    new IntersectionObserver(([en]) => { const was = visible; visible = en.isIntersecting; if (visible && !was && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }).observe(cv);
  })();

  /* ---------- boot ---------- */
  const fromUrl = new URLSearchParams(location.search).get("stage");
  const start = fromUrl !== null && /^[0-5]$/.test(fromUrl) ? +fromUrl : store.get("stage", 3);
  setStage(Number.isInteger(start) ? start : 3);
  const m = /^#no-(\d{1,2})$/.exec(location.hash);
  if (m && isOpen(+m[1])) openDrawer(+m[1]);
})();
