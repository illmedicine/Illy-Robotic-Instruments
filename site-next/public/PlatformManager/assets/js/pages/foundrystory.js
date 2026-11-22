import { h, svg, icon, pill } from "../dom.js";
import { patchGroup, markGroup, still } from "./foundrykit.js";

// A small engine for animated topology stories: nodes on lanes, and stories (scenarios) that light the nodes and move a token along the
// connections step by step. The page builds a spec; this draws it. Everything is built with DOM calls, never innerHTML.

const W_CHAR = 0.56; // average glyph width as a share of the font size

function wrap(text, width, size, lines) {
  const max = Math.max(6, Math.floor(width / (size * W_CHAR)));
  const out = [];
  let cur = "";
  for (const word of String(text || "").split(/\s+/).filter(Boolean)) {
    if ((cur + " " + word).trim().length > max && cur) { out.push(cur); cur = word; } else cur = (cur + " " + word).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/.{1,2}$/, "") + "..."; }
  return out;
}

const text = (attrs, s) => { const t = svg("text", attrs); t.textContent = s; return t; };

export function story(spec) {
  const nodes = new Map(spec.nodes.map((n) => [n.id, n]));
  const els = new Map(), edges = new Map();
  const root = svg("svg", { viewBox: `0 0 ${spec.width} ${spec.height}`, class: "topo-svg fstory", role: "img", "aria-label": spec.label });
  root.append(svg("defs", {}, svg("marker", { id: `ah-${spec.id}`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
    svg("path", { d: "M0 0L10 5L0 10z", class: "ah" }))));
  const laneLayer = svg("g", {}), edgeLayer = svg("g", {}), nodeLayer = svg("g", {}), fx = svg("g", {}), capLayer = svg("g", {});
  root.append(laneLayer, edgeLayer, nodeLayer, fx, capLayer);

  // The caption band at the foot of the diagram says what the current step is doing, so the picture can be followed without reading anything else.
  const capY = spec.height - 68, capW = spec.width - 140;
  const cap = svg("g", { class: "cap" });
  const capNum = text({ x: 58, y: capY + 38, "text-anchor": "middle", class: "cap-num-t" }, ""), capTitle = text({ x: 100, y: capY + 24, class: "cap-title" }, "");
  const capL1 = text({ x: 100, y: capY + 42, class: "cap-text" }, ""), capL2 = text({ x: 100, y: capY + 58, class: "cap-text" }, "");
  cap.append(svg("rect", { x: 16, y: capY, width: spec.width - 32, height: 64, rx: 12, class: "cap-bg" }), svg("rect", { x: 28, y: capY + 14, width: 60, height: 36, rx: 10, class: "cap-num" }), capNum, capTitle, capL1, capL2);
  capLayer.append(cap);
  function caption() {
    const s = run && at >= 0 ? run.steps[at] : null;
    capNum.textContent = s ? `${at + 1} / ${run.steps.length}` : "";
    capTitle.textContent = s ? s.t : run ? run.name : "Pick a story above";
    const lines = wrap(s ? s.d : run ? run.summary : spec.hint, capW, 13, 2);
    capL1.textContent = lines[0] || "";
    capL2.textContent = lines[1] || "";
    cap.classList.toggle("bad", !!(s && s.bad));
  }

  for (const l of spec.lanes || []) {
    laneLayer.append(svg("rect", { x: l.x, y: l.y, width: l.w, height: l.h, rx: 14, class: "lane" + (l.tone ? " " + l.tone : "") }),
      text({ x: l.x + 14, y: l.y + 22, class: "lane-title" }, l.title));
  }

  // Where a connection leaves one node and enters the next.
  function route(a, b) {
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const dx = bc.x - ac.x, dy = bc.y - ac.y;
    let p, q, c1, c2;
    if (Math.abs(dx) >= (a.w + b.w) / 2 * 0.55) {
      const right = dx > 0;
      p = { x: right ? a.x + a.w : a.x, y: ac.y }; q = { x: right ? b.x : b.x + b.w, y: bc.y };
      const k = Math.max(40, Math.abs(q.x - p.x) * 0.5) * (right ? 1 : -1);
      c1 = { x: p.x + k, y: p.y }; c2 = { x: q.x - k, y: q.y };
    } else {
      const down = dy > 0;
      p = { x: ac.x, y: down ? a.y + a.h : a.y }; q = { x: bc.x, y: down ? b.y : b.y + b.h };
      const k = Math.max(30, Math.abs(q.y - p.y) * 0.5) * (down ? 1 : -1);
      c1 = { x: p.x, y: p.y + k }; c2 = { x: q.x, y: q.y - k };
    }
    return `M${p.x} ${p.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}`;
  }

  for (const sc of spec.scenarios) {
    for (const st of sc.steps) {
      for (let i = 0; i + 1 < st.path.length; i++) {
        const a = nodes.get(st.path[i]), b = nodes.get(st.path[i + 1]), key = `${a.id}>${b.id}`;
        if (!edges.has(key)) {
          const p = svg("path", { d: route(a, b), class: "edge" + (st.bad ? " bad" : ""), "marker-end": `url(#ah-${spec.id})` });
          edges.set(key, p);
          edgeLayer.append(p);
        }
      }
    }
  }

  function draw(n) {
    const g = svg("g", { class: `node tone-${n.tone || "n"}`, "data-id": n.id, tabindex: 0, role: "button", "aria-label": n.title });
    const tip = svg("title", {});
    tip.textContent = [n.title, n.sub, n.badge && n.badge.text].filter(Boolean).join(" - ");
    g.append(tip, svg("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, class: "hl" }));
    const vs = Math.min(n.h - 14, n.agent ? 46 : 32);
    const vis = svg("g", { transform: `translate(${n.x + 8} ${n.y + (n.h - vs) / 2})` });
    vis.append(n.agent ? patchGroup(n.agent, vs) : markGroup(n.mark, vs));
    g.append(vis);
    const x0 = n.x + 8 + vs + 9, tw = n.w - (x0 - n.x) - 8;
    const title = wrap(n.title, tw, 12.5, 2), sub = n.agent ? [] : wrap(n.sub, tw, 10.5, n.h > 120 ? 5 : n.badge ? 1 : 2);
    const badge = n.badge ? wrap(n.badge.text, tw, 10.5, 2) : [];
    const meterRoom = n.learning ? 9 : 0;
    const total = title.length * 14 + sub.length * 12.5 + badge.length * 13 + meterRoom;
    let y = n.y + (n.h - total) / 2 + 11;
    title.forEach((l) => { g.append(text({ x: x0, y, class: "n-title" }, l)); y += 14; });
    sub.forEach((l) => { g.append(text({ x: x0, y, class: "n-sub" }, l)); y += 12.5; });
    badge.forEach((l) => { g.append(text({ x: x0, y, class: `n-badge ${n.badge.tone || ""}` }, l)); y += 13; });
    if (n.learning) {
      const my = n.y + n.h - 12;
      g.append(svg("rect", { x: x0, y: my, width: tw, height: 5, rx: 2.5, class: "m-track" }),
        svg("rect", { x: x0, y: my, width: Math.max(2, tw * n.learning.percent / 100), height: 5, rx: 2.5, class: `m-fill lv-${n.learning.percent < 10 ? 0 : n.learning.percent < 30 ? 1 : n.learning.percent < 55 ? 2 : n.learning.percent < 80 ? 3 : 4}` }));
    }
    els.set(n.id, g);
    nodeLayer.append(g);
  }
  spec.nodes.forEach(draw);

  // ---- the side panel and playback
  let run = null, at = -1, timer = null, playing = false, token = 0, picked = null;
  const speed = h("select", { class: "select", "aria-label": "Speed" }, h("option", { value: "0.6", text: "Slow" }), h("option", { value: "1", selected: "", text: "Normal" }), h("option", { value: "1.8", text: "Fast" }));
  const playBtn = h("button", { class: "btn primary", type: "button", onclick: () => (playing ? stop() : play()) }, "Play");
  const prevBtn = h("button", { class: "btn", type: "button", onclick: () => { stop(); go(at - 1); } }, "Back");
  const nextBtn = h("button", { class: "btn", type: "button", onclick: () => { stop(); go(at + 1); } }, "Next");
  const list = h("div", { class: "topo-runs" });
  const detail = h("div", { class: "topo-detail" });
  const nameOf = (id) => (nodes.get(id) || {}).title || id;

  spec.scenarios.forEach((sc) => list.append(h("button", { type: "button", class: "topo-run" + (sc.tone ? " " + sc.tone : ""), "aria-pressed": "false", onclick: () => choose(sc.id) },
    h("b", { text: sc.name }), h("small", { text: sc.kind }))));

  const intro = () => detail.replaceChildren(h("p", { class: "muted", text: spec.intro }));

  function choose(id, step) {
    stop();
    run = spec.scenarios.find((s) => s.id === id);
    if (!run) return;
    picked = null;
    [...list.children].forEach((b, i) => b.setAttribute("aria-pressed", String(spec.scenarios[i].id === id)));
    const touched = [...new Set(run.steps.flatMap((s) => s.path))];
    detail.replaceChildren(
      h("h3", { text: run.name }), h("p", { class: "muted", text: run.summary }),
      run.compare ? h("div", { class: "fcompare" }, run.compare.map((c) => h("div", { class: "fc-" + c.tone },
        h("small", { text: c.label }), h("p", { text: c.text })))) : null,
      h("h4", { text: "Step by step" }),
      h("ol", { class: "topo-steps" }, run.steps.map((s, i) => h("li", { class: s.bad ? "bad" : "", onclick: () => { stop(); go(i); } },
        h("b", { text: s.t }), h("div", { class: "meta", text: s.path.map(nameOf).join("  >  ") }), h("div", { class: "d", text: s.d })))),
      h("h4", { text: "Services and people it touches" }),
      h("div", { class: "topo-chips" }, touched.map((n) => pill(nameOf(n), nodes.get(n).tone === "bad" ? "risk" : ""))));
    root.classList.add("running");
    at = -1;
    paint();
    if (step) { go(step - 1); return; }
    if (!still()) play();
    else go(0);
  }

  function paint() {
    root.querySelectorAll(".on, .seen").forEach((e) => e.classList.remove("on", "seen"));
    fx.replaceChildren();
    if (!run) return;
    run.steps.forEach((s, i) => {
      if (i > at) return;
      const cls = i === at ? "on" : "seen";
      s.path.forEach((n) => { const g = els.get(n); if (g) { g.classList.remove("seen"); g.classList.add(cls); } });
      for (let k = 0; k + 1 < s.path.length; k++) { const e = edges.get(`${s.path[k]}>${s.path[k + 1]}`); if (e) { e.classList.remove("seen"); e.classList.add(cls); } }
    });
    const lis = detail.querySelectorAll(".topo-steps li");
    lis.forEach((li, i) => { li.classList.toggle("done", i < at); li.classList.toggle("now", i === at); });
    caption();
  }

  function travel(step, ms) {
    const mine = ++token;
    for (let k = 0; k + 1 < step.path.length; k++) {
      const p = edges.get(`${step.path[k]}>${step.path[k + 1]}`);
      if (!p) continue;
      const len = p.getTotalLength();
      if (!len) continue;
      const dot = svg("circle", { r: 7, class: "topo-token" + (step.bad ? " bad" : "") });
      fx.append(dot);
      const t0 = performance.now() + k * (ms / step.path.length), span = ms / step.path.length * 1.2;
      const frame = (now) => {
        if (mine !== token || !dot.isConnected) { dot.remove(); return; }
        const f = Math.max(0, Math.min(1, (now - t0) / span));
        const pt = p.getPointAtLength(len * f);
        dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
        if (f < 1) requestAnimationFrame(frame); else setTimeout(() => dot.remove(), 250);
      };
      requestAnimationFrame(frame);
    }
  }

  function go(i) {
    if (!run) return;
    at = Math.max(0, Math.min(run.steps.length - 1, i));
    paint();
    if (!still()) travel(run.steps[at], 1500 / Number(speed.value));
  }
  function next() {
    if (!run || !root.isConnected || root.closest("[hidden]")) { stop(); return; }
    if (at >= run.steps.length - 1) { stop(); playBtn.textContent = "Replay"; return; }
    go(at + 1);
    timer = setTimeout(next, 3400 / Number(speed.value));
  }
  function play() {
    if (!run) return;
    playing = true;
    playBtn.textContent = "Pause";
    if (at >= run.steps.length - 1) at = -1;
    next();
  }
  function stop() { playing = false; clearTimeout(timer); timer = null; playBtn.textContent = "Play"; }

  // A click on a box says what it is and starts the first story that passes through it.
  function select(id) {
    const n = nodes.get(id);
    if (!n) return;
    const inRun = run && run.steps.some((s) => s.path.includes(id));
    if (!inRun) {
      const sc = spec.scenarios.find((s) => s.steps.some((st) => st.path.includes(id)));
      if (sc) choose(sc.id); else { stop(); run = null; at = -1; paint(); root.classList.remove("running"); [...list.children].forEach((b) => b.setAttribute("aria-pressed", "false")); }
    }
    picked = id;
    const d = n.detail || {};
    const box = h("div", { class: "fnode card" },
      h("h4", {}, n.title, n.badge ? pill(n.badge.text, n.badge.tone === "bad" ? "risk" : n.badge.tone === "good" ? "ok" : "warn") : null),
      n.sub ? h("p", { class: "muted", text: n.sub }) : null,
      ...(d.lines || []).map((l) => h("p", { text: l })),
      d.link ? h("a", { class: "btn sm", href: d.link.href }, icon("external"), d.link.text) : null);
    detail.querySelector(".fnode")?.remove();
    detail.prepend(box);
    root.querySelectorAll(".picked").forEach((e) => e.classList.remove("picked"));
    els.get(id).classList.add("picked");
  }

  root.addEventListener("click", (ev) => { const g = ev.target.closest && ev.target.closest("g.node"); if (g) select(g.dataset.id); });
  root.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { const g = ev.target.closest && ev.target.closest("g.node"); if (g) { ev.preventDefault(); select(g.dataset.id); } } });

  intro();
  caption();
  const el = h("div", { class: "fstory-wrap" },
    h("div", { class: "card fstory-top" }, h("div", { class: "fstory-runs" }, list), h("div", { class: "toolbar topo-ctrl" }, playBtn, prevBtn, nextBtn, speed)),
    h("div", { class: "card topo-stage" }, root),
    h("div", { class: "card fstory-detail" }, detail));

  return {
    el,
    stop,
    // Called when the pane is shown: play the first story once, so the diagram arrives moving.
    start(id) { if (!run) choose(id || spec.scenarios[0].id); else if (!playing && at < run.steps.length - 1 && !still()) play(); },
    choose,
    select,
    picked: () => picked,
  };
}
