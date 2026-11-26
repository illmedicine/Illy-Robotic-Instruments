import { h, icon, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { currentRoute, replaceRoute } from "../route.js";
import { estateView } from "./fabricestate.js";

// Interactive Power BI to Fabric target topology: pick a run and watch it move through the estate step by step.
// The diagram and runs come from /api/fabric/topology (made by the topology generator from a read-only admin API scan).
// Route: #fabrictopology/<run>/<step> opens a run at a step; #fabrictopology/separation and #fabrictopology/setup open the other two documents.

const SVGNS = "http://www.w3.org/2000/svg";

function sanitize(root) {
  root.querySelectorAll("script, foreignObject, iframe, style").forEach((n) => n.remove());
  root.querySelectorAll("*").forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name)) n.removeAttribute(a.name);
      if (/href$/i.test(a.name) && !/^(#|data:image\/svg\+xml;base64,)/.test(a.value)) n.removeAttribute(a.name);
    }
  });
  return root;
}

function parseSvg(text) {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName !== "svg" || doc.querySelector("parsererror")) throw new Error("The topology diagram could not be read.");
  return document.importNode(sanitize(svg), true);
}

export async function render() {
  // The estate diagram does not need the generated topology, so the page still opens without it and says what is missing.
  let t = null, missing = null;
  try {
    t = await api.fabricTopology();
  } catch (e) {
    missing = e.status === 404
      ? "No topology has been generated yet. Run the topology generator; it writes data\\docs\\fabric-topology, which Install-OnServer copies to the server."
      : e.message;
  }
  const runs = t?.runs || [];
  const svg = t ? parseSvg(t.svg) : document.createElementNS(SVGNS, "svg");
  svg.classList.add("topo-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Target topology: data sources, gateways, Fabric capacities, Azure services, Entra and Purview");
  const fx = svg.querySelector("#fx") || svg.appendChild(document.createElementNS(SVGNS, "g"));

  let run = null, at = -1, timer = null, playing = false, token = 0;
  const speed = h("select", { class: "select", "aria-label": "Speed" },
    h("option", { value: "0.6", text: "Slow" }), h("option", { value: "1", selected: "", text: "Normal" }), h("option", { value: "1.8", text: "Fast" }));
  const playBtn = h("button", { class: "btn primary", type: "button", onclick: () => (playing ? stop() : play()) }, "Play");
  const list = h("div", { class: "topo-runs" });
  const detail = h("div", { class: "topo-detail" });
  const nameOf = (id) => {
    const g = svg.querySelector("#n-" + CSS.escape(id));
    const tx = g && g.querySelector("text");
    return tx ? tx.textContent : id;
  };
  const intro = () => detail.replaceChildren(h("p", { class: "muted", text: "Pick a run to watch it move through the estate: what starts it, which data sources it reads, every service it passes and how it is governed and monitored at the end. Click a box in the diagram to find a run that uses it." }));

  runs.forEach((r) => list.append(h("button", { type: "button", class: "topo-run", "aria-pressed": "false", onclick: () => choose(r.id) },
    h("b", { text: r.name }), h("small", { text: r.kind }))));

  function choose(id, step) {
    stop();
    run = runs.find((r) => r.id === id);
    if (!run) return;
    [...list.children].forEach((b, i) => b.setAttribute("aria-pressed", String(runs[i].id === id)));
    const all = [...new Set(run.steps.flatMap((s) => s.n))];
    const src = all.filter((n) => n.startsWith("s-"));
    const rest = all.filter((n) => !n.startsWith("s-") && !n.startsWith("lane-"));
    detail.replaceChildren(
      h("h3", { text: run.name }), h("p", { class: "muted", text: run.summary }),
      h("h4", { text: "Data sources involved" }),
      h("div", { class: "topo-chips" }, src.length ? src.map((n) => pill(nameOf(n), "info")) : pill("none: no source is read", "")),
      h("h4", { text: "Lifecycle" }),
      h("ol", { class: "topo-steps" }, run.steps.map((s, i) => h("li", { onclick: () => { stop(); go(i); } },
        h("b", { text: s.t }), h("div", { class: "meta", text: [s.where, s.who, s.time].filter(Boolean).join("  |  ") }), h("div", { class: "d", text: s.d })))),
      h("h4", { text: "Services and items it touches" }),
      h("div", { class: "topo-chips" }, rest.map((n) => pill(nameOf(n), ""))));
    svg.classList.add("running");
    at = -1;
    if (step) { go(step - 1); return; }
    paint();
    play();
  }

  function paint() {
    svg.querySelectorAll(".on, .seen").forEach((e) => e.classList.remove("on", "seen"));
    fx.replaceChildren();
    if (!run) return;
    run.steps.forEach((s, i) => {
      if (i > at) return;
      const cls = i === at ? "on" : "seen";
      s.n.forEach((n) => { const g = svg.querySelector("#n-" + CSS.escape(n)); if (g) { g.classList.remove("seen"); g.classList.add(cls); } });
      s.e.forEach((e) => { const p = svg.querySelector("#e-" + CSS.escape(e)); if (p) { p.classList.remove("seen"); p.classList.add(cls); } });
    });
    const lis = detail.querySelectorAll(".topo-steps li");
    lis.forEach((li, i) => { li.classList.toggle("done", i < at); li.classList.toggle("now", i === at); });
    if (lis[at]) lis[at].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function travel(ids, ms) {
    const mine = ++token;
    for (const id of ids) {
      const p = svg.querySelector("#e-" + CSS.escape(id));
      if (!p) continue;
      const len = p.getTotalLength();
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("r", "7");
      dot.setAttribute("class", "topo-token");
      fx.append(dot);
      const t0 = performance.now();
      const step = (now) => {
        if (mine !== token || !dot.isConnected) { dot.remove(); return; }
        const k = Math.min(1, (now - t0) / ms);
        const pt = p.getPointAtLength(len * k);
        dot.setAttribute("cx", pt.x);
        dot.setAttribute("cy", pt.y);
        if (k < 1) requestAnimationFrame(step); else setTimeout(() => dot.remove(), 300);
      };
      requestAnimationFrame(step);
    }
  }

  function go(i) {
    if (!run) return;
    at = Math.max(0, Math.min(run.steps.length - 1, i));
    paint();
    travel(run.steps[at].e, 1400 / Number(speed.value));
  }
  function next() {
    if (!run || !view.isConnected) { stop(); return; }
    if (at >= run.steps.length - 1) { stop(); playBtn.textContent = "Replay"; return; }
    go(at + 1);
    timer = setTimeout(next, 3600 / Number(speed.value));
  }
  function play() {
    if (!run) return;
    playing = true;
    playBtn.textContent = "Pause";
    if (at >= run.steps.length - 1) at = -1;
    next();
  }
  function stop() {
    playing = false;
    clearTimeout(timer);
    timer = null;
    playBtn.textContent = "Play";
  }
  function clear() {
    stop();
    run = null;
    at = -1;
    token++;
    svg.classList.remove("running");
    [...list.children].forEach((b) => b.setAttribute("aria-pressed", "false"));
    paint();
    intro();
  }

  svg.addEventListener("click", (ev) => {
    const g = ev.target.closest && ev.target.closest("g.node");
    if (!g) return;
    const id = g.dataset.id;
    if (run && run.steps.some((s) => s.n.includes(id))) return;
    const r = runs.find((x) => x.steps.some((s) => s.n.includes(id)));
    if (r) choose(r.id);
  });

  intro();
  const doc = (text, label) => {
    if (!text) return h("div", { class: "banner" }, icon("alert"), "This document is not in the generated topology yet: run the topology generator again.");
    const d = parseSvg(text);
    d.classList.add("topo-svg", "topo-doc");
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", label);
    return h("div", { class: "card topo-stage" }, d);
  };
  const DOCS = [
    { id: "estate", label: "Estate diagram", sub: "the estate, with invented figures" },
    { id: "topology", label: "Topology and runs", sub: "the target estate; play a run" },
    { id: "separation", label: "Separating runs from production", sub: "refresh load, three capacities, release flow, baseline plan" },
    { id: "setup", label: "What to turn on", sub: "every Azure, Fabric, Entra and Purview step, in order" },
  ];
  const panes = {};
  const switcher = h("div", { class: "seg topo-switch", role: "tablist", "aria-label": "Document" });
  function show(id, init) {
    if (id !== "topology") stop();
    DOCS.forEach((x, i) => {
      switcher.children[i].setAttribute("aria-pressed", String(x.id === id));
      switcher.children[i].setAttribute("aria-selected", String(x.id === id));
      panes[x.id].hidden = x.id !== id;
    });
    const want = id === "topology" ? (run ? `fabrictopology/${run.id}` : "fabrictopology") : `fabrictopology/${id}`;
    if (!init && currentRoute().split("/").slice(0, 2).join("/") !== want) replaceRoute(want);
  }
  DOCS.forEach((x) => switcher.append(h("button", { type: "button", role: "tab", "aria-pressed": "false", onclick: () => show(x.id) },
    h("b", { text: x.label }), h("small", { text: x.sub }))));
  panes.separation = doc(t?.svgSeparation, "Separating runs from production: refresh load by hour, three capacities, how content is promoted, and the baseline plan");
  panes.setup = doc(t?.svgSetup, "What to turn on, in order: Azure, Fabric admin, Entra ID and Purview steps with owners");
  panes.estate = estateView();
  const view = h("div", { class: "topo" },
    pageHead("Migration topology",
      `The target Power BI and Fabric estate after the P1 move, with Azure, Entra and Purview. The estate diagram uses invented figures; the other documents count the read-only scan of ${t?.scannedAt || "the tenant"}.`,
      h("a", { class: "btn", href: "/api/docs/fabric-topology/Fabric-Target-Topology.pdf", download: "Fabric-Target-Topology.pdf" }, icon("download"), "PDF (3 pages)")),
    switcher,
    panes.estate,
    panes.topology = h("div", {}, missing ? h("div", { class: "banner" }, icon("alert"), missing) : null, h("div", { class: "topo-grid" },
      h("div", { class: "card topo-stage" }, svg,
        h("p", { class: "muted", text: "Orange outline: the step now. Faded: earlier steps. The orange dot travels along every line the step uses; each line starts at a dot on the box it comes from and ends with an arrow on the box it reaches." })),
      h("div", { class: "card topo-side" },
        h("h3", { text: "Run a workflow" }), list,
        h("div", { class: "toolbar topo-ctrl" }, playBtn,
          h("button", { class: "btn", type: "button", onclick: () => { stop(); go(at - 1); } }, "Back"),
          h("button", { class: "btn", type: "button", onclick: () => { stop(); go(at + 1); } }, "Next step"),
          h("button", { class: "btn", type: "button", onclick: clear }, "Clear"), speed),
        detail))),
    panes.separation, panes.setup);

  const [, rid, st] = currentRoute().split("/");
  const first = DOCS.some((x) => x.id === rid) ? rid : rid ? "topology" : "estate";
  show(first, true);
  if (rid && first === "topology") setTimeout(() => choose(decodeURIComponent(rid), Number(st) || 0), 0);
  return view;
}
