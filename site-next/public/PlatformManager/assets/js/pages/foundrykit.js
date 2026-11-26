import { h, svg, fmt } from "../dom.js";
import { api } from "../api.js";

// Shared pieces of the Azure AI Foundry pages: the letterman patch of each agent, the learning meter, and the product marks used in the topologies.

export const usd = (v, cur = "USD") => (typeof v === "number" ? (v < 0 ? "-" : "") + (cur === "USD" ? "$" : cur + " ") + fmt.n(Math.round(Math.abs(v))) : "-");
export const still = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const BASIS = { measured: ["Measured", "ok"], stated: ["Stated by you", "info"], list: ["List price", "warn"], assumed: ["Assumption", "warn"], unmeasured: ["Not measured", "risk"] };

const NAVY = "#0b2a4a";
let uid = 0;

// A felt patch: four logo colours turning slowly underneath, a stitched border and chenille-style letters on top.
export function patchGroup(a, size = 56) {
  const id = `pc${++uid}`;
  const [c0, c1, c2, c3] = a.colors;
  const quad = (x, y, fill) => svg("rect", { x, y, width: 72, height: 72, fill });
  const spin = svg("g", { class: "patch-spin" + (a.spin.reverse ? " rev" : "") }, quad(-72, -72, c0), quad(0, -72, c1), quad(-72, 0, c2), quad(0, 0, c3));
  spin.style.animationDuration = a.spin.seconds + "s";
  spin.style.animationDelay = `-${(a.abbr.charCodeAt(0) * 7) % a.spin.seconds}s`;
  const fs = a.abbr.length > 2 ? 34 : 46, y = 50 + fs * 0.36;
  const txt = (attrs) => { const t = svg("text", { x: 50, y, "text-anchor": "middle", "font-size": fs, class: "patch-letters", ...attrs }); t.textContent = a.abbr; return t; };
  return svg("g", { transform: `scale(${size / 100})` },
    svg("clipPath", { id }, svg("rect", { x: 0, y: 0, width: 100, height: 100, rx: 16 })),
    svg("g", { "clip-path": `url(#${id})` }, svg("g", { transform: "translate(50 50)" }, spin), svg("rect", { x: 0, y: 0, width: 100, height: 100, fill: "#fff", opacity: ".06" })),
    svg("rect", { x: 1.5, y: 1.5, width: 97, height: 97, rx: 15, fill: "none", stroke: NAVY, "stroke-width": 3 }),
    svg("rect", { x: 7, y: 7, width: 86, height: 86, rx: 11, fill: "none", stroke: "#fff", "stroke-width": 2.2, "stroke-dasharray": "5 3.5", opacity: ".95" }),
    txt({ transform: "translate(2 2.5)", fill: "#000", opacity: ".3" }),
    txt({ fill: NAVY, stroke: NAVY, "stroke-width": 9, "stroke-linejoin": "round" }),
    txt({ fill: "#fff", stroke: "#fff", "stroke-width": 1 }),
    txt({ fill: "none", stroke: NAVY, "stroke-width": 0.9, "stroke-dasharray": "2 2" }));
}

export function patch(a, size = 56) {
  return svg("svg", { viewBox: "0 0 100 100", width: size, height: size, class: "patch", role: "img", "aria-label": `${a.name} badge` }, patchGroup(a, 100));
}

const LEVEL = (p) => (p < 10 ? 0 : p < 30 ? 1 : p < 55 ? 2 : p < 80 ? 3 : 4);

// "Was this useful?" under an agent's answer. A yes is kept by that agent and used for similar requests from everyone.
export function rate(interactionId) {
  if (!interactionId) return null;
  const box = h("div", { class: "frate" });
  const say = async (useful) => {
    try { await api.foundry.feedback(interactionId, useful); box.replaceChildren(h("span", { class: "muted", text: useful ? "Thanks. The agent will use this answer to help the next person who asks something similar." : "Thanks. This answer will not be used to teach the agent." })); }
    catch (e) { box.replaceChildren(h("span", { class: "muted", text: e.message })); }
  };
  box.append(h("span", { text: "Was this useful?" }), h("button", { class: "btn sm", type: "button", onclick: () => say(true) }, "Yes"), h("button", { class: "btn sm", type: "button", onclick: () => say(false) }, "No"));
  return box;
}

// A bar that fills to the share of what the agent holds on its subject. The parts it is made of are in the tooltip.
export function meter(learning, { big = false, label = true } = {}) {
  const fill = h("i", { class: "lm-fill" });
  fill.style.width = "0%";
  const why = learning.parts.length ? learning.parts.map((p) => `${p.label}: ${p.points}`).join("\n") : "Nothing held yet";
  const el = h("div", { class: `lmeter lv-${LEVEL(learning.percent)}` + (big ? " big" : ""), role: "meter", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(learning.percent),
    "aria-label": `Knowledge held: ${learning.percent} percent, ${learning.level}`, title: `${learning.level}. How it is counted:\n${why}` },
  h("div", { class: "lm-track" }, fill, [25, 50, 75].map((t) => h("b", { class: "lm-tick", style: { left: t + "%" } }))),
  label ? h("span", { class: "lm-pct" }, h("b", { text: learning.percent + "%" }), h("small", { text: learning.level })) : null);
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = learning.percent + "%"; }));
  return el;
}

// ---- product marks. Real Microsoft artwork where the app already has it; the others are plain marks in each product's colour, to be replaced
// by dropping the official artwork into assets/img/products/<key>.svg and listing it in FILES.
const P = "assets/img/products/";
const FILES = { m365: P + "microsoft-365.svg", powerplatform: P + "power-platform.svg", powerbi: P + "power-bi.svg", dynamics: P + "dynamics-365.svg", sharepoint: P + "sharepoint.svg",
  copilot: P + "microsoft-copilot.svg", microsoft: P + "microsoft.svg", ppm: "assets/img/favicon.svg" };
const MARKS = {
  foundry: { bg: "#0f6cbd", d: ["M12 3l8 4.5v9L12 21l-8-4.5v-9z", "M12 8l4 2.3v4.4L12 17l-4-2.3v-4.4z"] },
  azureopenai: { bg: "#0078d4", d: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M8.5 12h7", "M12 8.5v7"] },
  claude: { bg: "#d97757", d: ["M12 3v18", "M3 12h18", "M5.6 5.6l12.8 12.8", "M18.4 5.6L5.6 18.4"] },
  contracttool: { bg: "#475569", d: ["M6 3h9l4 4v14H6z", "M14 3v5h5", "M9 13h7", "M9 17h5"] },
  consultancy: { bg: "#7c5cbf", d: ["M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", "M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"] },
  local: { bg: "#334155", d: ["M4 5h16v5H4z", "M4 14h16v5H4z", "M7.5 7.5h.01", "M7.5 16.5h.01"] },
  qwen: { bg: "#615ced", t: "Q" },
  entra: { bg: "#0078d4", d: ["M12 3l9 9-9 9-9-9z", "M12 8l4 4-4 4-4-4z"] },
  purview: { bg: "#0f6cbd", d: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"] },
  search: { bg: "#0b7a75", d: ["M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z", "M15.5 15.5L21 21"] },
  safety: { bg: "#7a3dd6", d: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", "M9 12l2 2 4-4"] },
  gateway: { bg: "#5b4bd6", d: ["M4 8h12", "M12 4l4 4-4 4", "M20 16H8", "M12 12l-4 4 4 4"] },
  trace: { bg: "#68217a", d: ["M5 19V9", "M12 19V5", "M19 19v-7"] },
  cost: { bg: "#107c41", t: "$" },
  graph: { bg: "#0078d4", d: ["M5 7h4v4H5z", "M15 7h4v4h-4z", "M10 15h4v4h-4z", "M9 9h6", "M12 11v4"] },
  dataverse: { bg: "#0b6a8a", d: ["M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z", "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"] },
  users: { bg: "#475569", d: ["M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6", "M16 5.5a3 3 0 0 1 0 5", "M18 14.5c1.8.8 3 2.6 3 5.5"] },
  excel: { bg: "#107c41", t: "X" },
  cowork: { bg: "#7160e8", t: "Co" },
  studio: { bg: "#2b88d8", d: ["M4 5h16v11H9l-5 4z", "M8 9h8", "M8 12h5"] },
  router: { bg: "#0f6cbd", d: ["M12 3v6", "M12 15v6", "M3 12h6", "M15 12h6", "M10 10h4v4h-4z"] },
  shadow: { bg: "#b91c1c", d: ["M12 3l10 18H2z", "M12 10v5", "M12 18h.01"] },
  door: { bg: "#0067b1", d: ["M5 3h10v18H5z", "M15 7l5 2v10l-5 2", "M12 12h.01"] },
  copilotchat: { bg: "#3b82f6", d: ["M4 5h16v11H9l-5 4z"] },
  onelake: { bg: "#117865", t: "OL" },
  sql: { bg: "#cc2927", t: "SQL" },
  devops: { bg: "#0078d4", t: "DO" },
  teams: { bg: "#5b5fc7", t: "T" },
  azure: { bg: "#0078d4", t: "A" },
  files: { bg: "#8a6d1d", d: ["M3 7h7l2 2h9v10H3z"] },
  database: { bg: "#334155", d: ["M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z", "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"] },
  empty: { bg: "#94a3b8", d: ["M4 4h16v16H4z", "M4 9h16", "M9 4v16"] },
  saving: { bg: "#15803d", d: ["M4.5 12.5l5 5L20 7"] },
};

// A mark for a vendor named in the configuration (foundry.vendors): a known brand where there is one, else the generic mark.
const BRAND_MATCH = [];
export const vendorMark = (name, fallback) => (BRAND_MATCH.find(([re]) => re.test(String(name || ""))) || [null, fallback])[1];

// A mark inside an SVG diagram, `size` square, with its top-left corner at the origin.
export function markGroup(key, size = 32) {
  if (FILES[key]) return svg("image", { href: FILES[key], x: 0, y: 0, width: size, height: size, preserveAspectRatio: "xMidYMid meet" });
  const m = MARKS[key] || MARKS.empty, g = svg("g", {}, svg("rect", { x: 0, y: 0, width: size, height: size, rx: size * 0.22, fill: m.bg }));
  if (m.t) {
    const t = svg("text", { x: size / 2, y: size / 2 + size * 0.17, "text-anchor": "middle", "font-size": size * (m.t.length > 1 ? 0.4 : 0.55), "font-weight": 800, fill: "#fff", class: "mark-letter" });
    t.textContent = m.t;
    g.append(t);
  } else {
    const k = size * 0.7 / 24;
    g.append(svg("g", { transform: `translate(${size * 0.15} ${size * 0.15}) scale(${k})`, fill: "none", stroke: m.fg || "#fff", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, ...m.d.map((d) => svg("path", { d }))));
  }
  return g;
}

export function mark(key, size = 28) {
  return svg("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: "pmark", "aria-hidden": "true" }, markGroup(key, size));
}
