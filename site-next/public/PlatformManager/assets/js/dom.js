const ICONS = {
  home: "M3 11l9-8 9 8|M5 10v10h14V10",
  flow: "M4 5h6v5H4z|M14 14h6v5h-6z|M10 7.5h3a3 3 0 0 1 3 3V14",
  app: "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M16.5 13v7|M13 16.5h7",
  plug: "M9 3v5|M15 3v5|M6 8h12v3a6 6 0 0 1-12 0z|M12 17v4",
  env: "M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5",
  license: "M4 5h16v14H4z|M8 10h8|M8 14h5",
  chart: "M4 20V10|M10 20V4|M16 20v-7|M3 20h18",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z|M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6|M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  terminal: "M4 5h16v14H4z|M7 10l3 2-3 2|M12 15h5",
  refresh: "M20 11a8 8 0 1 0-2 6|M20 4v7h-7",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M12 2v2|M12 20v2|M2 12h2|M20 12h2|M5 5l1.5 1.5|M17.5 17.5L19 19|M5 19l1.5-1.5|M17.5 6.5L19 5",
  moon: "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z",
  download: "M12 3v12|M7 10l5 5 5-5|M4 20h16",
  close: "M5 5l14 14|M19 5L5 19",
  copy: "M8 8h12v12H8z|M4 16V4h12",
  external: "M14 4h6v6|M20 4l-9 9|M18 14v6H4V6h6",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6|M16 5.5a3 3 0 0 1 0 5|M18 14.5c1.8.8 3 2.6 3 5.5",
  alert: "M12 3l10 18H2z|M12 10v5|M12 18h.01",
  search: "M10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M15.5 15.5L21 21",
  check: "M4.5 12.5l5 5L20 7",
  chevron: "M9 6l6 6-6 6",
  pin: "M9 3h6l-1 6 3 3v2H7v-2l3-3z|M12 14v7",
  menu: "M4 6h16|M4 12h16|M4 18h16",
  sound: "M4 9h4l5-4v14l-5-4H4z|M16 9a4 4 0 0 1 0 6|M18.5 6.5a7.5 7.5 0 0 1 0 11",
  mute: "M4 9h4l5-4v14l-5-4H4z|M16 9l5 6|M21 9l-5 6",
};
const SVGNS = "http://www.w3.org/2000/svg";

export function icon(name) {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "ic");
  svg.setAttribute("aria-hidden", "true");
  svg.dataset.icon = name;
  for (const d of (ICONS[name] || "").split("|")) {
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

export function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids.filter((k) => k != null));
  return el;
}

// Builds DOM without innerHTML so tenant-supplied names can never inject markup.
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "style") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "pressed") el.setAttribute("aria-pressed", String(v));
    else el.setAttribute(k, v === true ? "" : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export const fmt = {
  n: (v) => (v == null ? "-" : Number(v).toLocaleString()),
  date: (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  },
  dt: (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  },
  ago: (v) => {
    if (!v) return "never";
    const s = (Date.now() - new Date(v)) / 1000;
    if (isNaN(s)) return String(v);
    if (s < 90) return "just now";
    if (s < 5400) return Math.round(s / 60) + " min ago";
    if (s < 129600) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  },
  connector: (id) => (id || "").replace(/^shared_/, ""),
};

export function pill(text, kind = "") {
  return h("span", { class: "pill " + kind, text });
}

export function stateKind(s) {
  return { Started: "ok", Connected: "ok", Ready: "ok", Active: "ok", ok: "ok", Stopped: "", Suspended: "risk", Error: "risk", error: "risk",
    warn: "warn", demo: "warn", disabled: "risk", missing: "risk", running: "info" }[s] ?? "";
}

export function copyText(text, btn) {
  const done = () => { const t = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = t), 1200); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
  else done();
}

export function download(name, text, type = "text/csv") {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function toCsv(rows, cols) {
  const esc = (v) => {
    let s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.map((c) => esc(c.label)).join(",")].concat(rows.map((r) => cols.map((c) => esc(c.csv ? c.csv(r) : r[c.key])).join(","))).join("\r\n");
}
