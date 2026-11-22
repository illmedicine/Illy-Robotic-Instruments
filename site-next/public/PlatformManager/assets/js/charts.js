import { h, svg } from "./dom.js";

export function barList(items, { warm = false, link } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return h("div", { class: "bars" }, items.length ? items.map((i) =>
    h("div", { class: "row" },
      h("div", { class: "name", title: i.label }, link ? h("a", { href: link(i), text: i.label }) : i.label),
      h("div", { class: "track" }, h("div", { class: "fill" + (warm ? " warm" : ""), style: { width: (i.value / max) * 100 + "%" } })),
      h("div", { class: "val", text: i.value.toLocaleString() }))) : h("div", { class: "empty", text: "No data" }));
}

const W = 560, H = 190, PAD = { l: 34, r: 8, t: 8, b: 22 };

function frame(max, labels, children) {
  const g = [];
  for (let i = 0; i <= 4; i++) {
    const y = PAD.t + ((H - PAD.t - PAD.b) * i) / 4;
    g.push(svg("line", { class: "grid-line", x1: PAD.l, x2: W - PAD.r, y1: y, y2: y }));
    g.push(svg("text", { x: PAD.l - 5, y: y + 3, "text-anchor": "end" }, String(Math.round(max * (1 - i / 4)))));
  }
  const step = Math.max(1, Math.ceil(labels.length / 7));
  const iw = (W - PAD.l - PAD.r) / Math.max(1, labels.length);
  labels.forEach((l, i) => {
    if (i % step === 0) g.push(svg("text", { x: PAD.l + iw * (i + 0.5), y: H - 6, "text-anchor": "middle" }, l.slice(5)));
  });
  return svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img" }, ...g, ...children);
}

// Stacked columns. rows: [{date, <series>: n}]
export function stackedColumns(rows, series) {
  const totals = rows.map((r) => series.reduce((s, k) => s + (r[k] || 0), 0));
  const max = niceMax(Math.max(1, ...totals));
  const iw = (W - PAD.l - PAD.r) / Math.max(1, rows.length), bw = Math.max(4, iw * 0.62);
  const bars = [];
  rows.forEach((r, i) => {
    let y = H - PAD.b;
    series.forEach((k, si) => {
      const hh = ((r[k] || 0) / max) * (H - PAD.t - PAD.b);
      y -= hh;
      bars.push(svg("rect", { class: "s" + si, x: PAD.l + iw * i + (iw - bw) / 2, y, width: bw, height: hh, rx: 2 },
        svg("title", {}, `${r.date} ${k}: ${r[k] || 0}`)));
    });
  });
  return wrap(frame(max, rows.map((r) => r.date), bars), series);
}

// Lines. points: [{date|ts, key: n}]
export function lineChart(points, series) {
  const rows = points.map((p) => ({ date: (p.date || p.ts || "").slice(0, 10), ...p }));
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key] || 0))));
  const iw = (W - PAD.l - PAD.r) / Math.max(1, rows.length);
  const kids = series.map((s, si) => {
    const pts = rows.map((r, i) => [PAD.l + iw * (i + 0.5), H - PAD.b - ((r[s.key] || 0) / max) * (H - PAD.t - PAD.b)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return svg("g", { class: "s" + si },
      svg("path", { class: "area", d: d + ` L${pts.at(-1)?.[0] ?? 0} ${H - PAD.b} L${pts[0]?.[0] ?? 0} ${H - PAD.b}Z` }),
      svg("path", { class: "line", d }));
  });
  return wrap(frame(max, rows.map((r) => r.date), kids), series.map((s) => s.label));
}

function wrap(chart, names) {
  return h("div", {}, chart, h("div", { class: "legend" }, names.map((n, i) => h("span", {}, h("i", { class: "s" + i }), n))));
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
