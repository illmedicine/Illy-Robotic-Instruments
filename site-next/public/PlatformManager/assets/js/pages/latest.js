import { h, icon, fmt, download, toCsv } from "../dom.js";
import { api } from "../api.js";
import { stackedColumns } from "../charts.js";
import { appName } from "./names.js";

const TONE = { ok: "good", warn: "warn", bad: "bad" };

function tile(t) {
  const value = t.time ? fmt.ago(t.time) : t.value ?? "";
  const long = String(value).length > 14;
  return h("div", { class: "tile " + (TONE[t.tone] || "info"), title: t.time ? fmt.dt(t.time) : null },
    h("div", { class: "tile-head" }, h("span", { class: "tile-title", text: t.label })),
    h("div", { class: "tile-value", style: long ? { fontSize: "20px" } : null, text: value }),
    t.note ? h("div", { class: "tile-note", text: t.note }) : null);
}

function cell(col, v) {
  if (v == null || v === "") return "";
  if (col.type === "time") return h("span", { title: fmt.dt(v), text: fmt.ago(v) });
  if (col.type === "number") return fmt.n(v);
  if (col.type === "app") return appName(v);
  return String(v);
}

function table(t) {
  const csvCols = t.columns.map((c, i) => ({ key: i, label: c.label }));
  return h("div", { class: "card" }, h("h3", {}, t.title,
    h("button", { class: "btn sm", type: "button", style: { marginLeft: "auto" }, "aria-label": `Download ${t.title} as CSV`, onclick: () => download(`${t.title.toLowerCase().replace(/\W+/g, "-")}.csv`, toCsv(t.rows, csvCols)) }, icon("download"), "CSV")),
    t.note ? h("p", { class: "muted", text: t.note }) : null,
    h("div", { class: "tablewrap" }, h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, t.columns.map((c) => h("th", { class: c.type === "number" ? "num" : "", text: c.label })))),
      h("tbody", {}, t.rows.map((r) => h("tr", {}, t.columns.map((c, i) => h("td", { class: c.type === "number" ? "num" : "" }, cell(c, r[i])))))))));
}

// The newest events of one product, read from what the last sync collected: when it last happened, what it was, how often, and what went wrong.
// It sits at the top of each product's main page, ahead of licence and inventory counts.
export async function latestPanel(product) {
  const box = h("div", { class: "section" });
  let p;
  try { p = await api.latest(product); } catch (e) { return box.append(h("div", { class: "banner info" }, icon("alert"), `Latest activity could not be read: ${e.message}`)), box; }
  box.append(h("h2", {}, p.title, h("span", { class: "sub", text: p.asOf ? ` data read ${fmt.ago(p.asOf)}` : "" })));
  if (!p.available) return box.append(h("div", { class: "banner info" }, icon("alert"), p.reason)), box;
  box.append(h("div", { class: "grid g-kpi" }, p.tiles.map(tile)));
  if (p.perDay?.rows?.length) box.append(h("div", { class: "card", style: { margin: "14px 0" } }, h("h3", { text: p.perDay.label }), stackedColumns(p.perDay.rows, p.perDay.series)));
  const wide = p.tables.filter((t) => t.columns.length >= 4), narrow = p.tables.filter((t) => t.columns.length < 4);
  wide.forEach((t) => box.append(h("div", { style: { margin: "14px 0" } }, table(t))));
  if (narrow.length) box.append(h("div", { class: "grid g-2", style: { margin: "14px 0" } }, narrow.map(table)));
  p.notes.forEach((n) => box.append(h("p", { class: "muted", text: n })));
  return box;
}
