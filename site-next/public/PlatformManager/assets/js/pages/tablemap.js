import { h, icon } from "../dom.js";
import { field, note, select } from "./widgets.js";
import { parseDelimited, toNum } from "../analyze/core.js";
import { matchProduct, productBySku } from "../analyze/data/products.js";
import { blankLine, isGovCloud } from "../analyze/engines/pricing.js";
import { applyPricing } from "../analyze/engines/contracts.js";

const MAX_ROWS = 400, MAX_COLS = 24;

const letter = (i) => {
  let s = "", n = i + 1;
  while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

/** The rows of a delimited document with at least two filled cells; empty when the text is not a table. */
export function tableRows(text) {
  const rows = parseDelimited(String(text ?? ""), undefined).slice(0, MAX_ROWS).map((r) => r.slice(0, MAX_COLS).map((x) => String(x).trim()));
  const kept = rows.filter((r) => r.filter(Boolean).length >= 2);
  if (kept.length < 3) return [];
  const widths = new Map();
  for (const r of kept) widths.set(r.length, (widths.get(r.length) ?? 0) + 1);
  const [width, count] = [...widths.entries()].sort((a, b) => b[1] - a[1])[0];
  return width >= 3 && count >= kept.length * 0.5 ? kept : [];
}

const isNumber = (x) => /\d/.test(x) && /^\(?-?\$?\s?[\d,]+(\.\d+)?\)?$/.test(String(x).replace(/\s/g, ""));

/** A first guess at the header row and the product, quantity and price columns, so most tables need no clicking. */
export function guess(rows) {
  let header = rows.findIndex((r) => r.filter(Boolean).length >= 3 && r.filter(isNumber).length <= r.filter(Boolean).length / 2);
  if (header < 0) header = 0;
  const body = rows.slice(header + 1);
  const cols = Math.max(...rows.map((r) => r.length));
  const stat = (c) => {
    const vals = body.map((r) => r[c] ?? "").filter(Boolean);
    const n = vals.length || 1;
    return {
      text: vals.filter((v) => !isNumber(v)).length / n,
      money: vals.filter((v) => isNumber(v) && (/\$/.test(v) || /\.\d{2}\b/.test(v))).length / n,
      whole: vals.filter((v) => isNumber(v) && !/\$/.test(v) && !/\./.test(v)).length / n,
    };
  };
  const stats = Array.from({ length: cols }, (_, c) => stat(c));
  const product = stats.findIndex((s) => s.text >= 0.6);
  const head = (c) => rows[header]?.[c] ?? "";
  const moneyCols = stats.map((s, c) => (c !== product && s.money >= 0.3 ? c : -1)).filter((c) => c >= 0);
  const price = moneyCols.find((c) => /price|unit|rate|cost/i.test(head(c)) && !/total|amount/i.test(head(c))) ?? moneyCols[0] ?? -1;
  const varied = (c) => new Set(body.map((r) => r[c]).filter(Boolean)).size > 2;
  const wholeCols = stats.map((s, c) => (c !== product && c !== price && s.whole >= 0.5 && varied(c) ? c : -1)).filter((c) => c >= 0);
  const qty = wholeCols.find((c) => /qty|quantity|seats|units|licen/i.test(head(c))) ?? wholeCols.find((c) => price < 0 || c < price) ?? -1;
  const part = stats.findIndex((s, c) => c !== product && s.text >= 0.6 && /part|sku/i.test(head(c)));
  const prices = body.map((r) => toNum(r[price], NaN)).filter((v) => v > 0).sort((a, b) => a - b);
  const basis = prices.length && prices[Math.floor(prices.length / 2)] > 1000 ? "totalyear" : "month";
  return { header, product: Math.max(product, 0), qty, part, price: price < 0 ? Math.min(2, cols - 1) : price, basis };
}

const BASIS = [["month", "Price per user per month"], ["year", "Price per user per year"], ["totalyear", "Total per year (all seats)"], ["totalterm", "Total for the whole term (all seats)"]];

export function readLines(rows, m) {
  const lines = [];
  for (const r of rows.slice(m.header + 1)) {
    const label = r[m.product] ?? "";
    const price = toNum(r[m.price], NaN);
    if (!label || !(price > 0) || /^total\b/i.test(label) || isNumber(label)) continue;
    const qty = m.qty >= 0 ? toNum(r[m.qty], 0) : 0;
    const part = m.part >= 0 ? (r[m.part] ?? "") : "";
    const prod = (part && productBySku(part)) || matchProduct(label) || matchProduct(`${label} ${part}`);
    const l = blankLine();
    Object.assign(l, { productId: prod?.id ?? "", desc: [label, part].filter(Boolean).join(" ").slice(0, 160), qty, sku: part || undefined, gov: isGovCloud(label) || undefined, basisSource: "stated", check: false });
    if (m.basis === "month" || m.basis === "year") { l.unit = price; l.basis = m.basis; } else {
      l.basis = m.basis === "totalyear" ? "year" : "term";
      if (qty > 0) l.unit = price / qty; else { l.unit = price; l.qty = 0; l.check = true; }
    }
    lines.push(l);
  }
  return lines;
}

/** Shows the rows exactly as read and lets the reader be told which column is which, so any layout can be priced. */
export function mapperCard(d, repaint) {
  const rows = tableRows(d.text);
  const m = d.mapping ?? (d.mapping = guess(rows));
  const cols = Math.max(...rows.map((r) => r.length));
  const colOpts = (optional) => [...(optional ? [["-1", "(none)"]] : []), ...Array.from({ length: cols }, (_, i) => [String(i), `${letter(i)}: ${(rows[m.header]?.[i] || "").slice(0, 28)}`])];
  const pick = (key, optional) => select(colOpts(optional), String(m[key]), { "aria-label": key, onchange: (e) => { m[key] = Number(e.target.value); repaint(); } });
  const status = h("div", {});

  const preview = h("div", { class: "tablewrap" }, h("table", { class: "dt" },
    h("thead", {}, h("tr", {}, h("th", { scope: "col", text: "Row" }), Array.from({ length: cols }, (_, i) => h("th", { scope: "col", text: letter(i) })))),
    h("tbody", {}, rows.slice(0, 25).map((r, i) => h("tr", { style: i === m.header ? { fontWeight: "600" } : {} },
      h("td", { class: "muted", text: String(i + 1) }), Array.from({ length: cols }, (_, c) => h("td", { text: r[c] ?? "" })))))));

  const apply = () => {
    const lines = readLines(rows, m);
    if (!lines.length) { status.replaceChildren(note("No row had both a licence name and a price in the chosen columns. Check the header row and the price column.", "error")); return; }
    d.analysis.pricing.lines = lines;
    d.analysis.pricing.source = "mapped";
    d.role = "pricing";
    applyPricing(d.analysis, d.text ?? "");
    repaint();
  };

  return h("div", {},
    h("p", { class: "muted", text: `These are the ${rows.length} rows read from this document. Tell the reader which columns hold the licence, quantity and price, and it will read every row from the header down.` }),
    preview,
    h("div", { class: "grid g-3", style: { marginTop: "12px" } },
      field("Header row", select(Array.from({ length: Math.min(rows.length, 15) }, (_, i) => [String(i), `Row ${i + 1}`]), String(m.header), { "aria-label": "Header row", onchange: (e) => { m.header = Number(e.target.value); repaint(); } })),
      field("Licence or product", pick("product", false)),
      field("Part number", pick("part", true)),
      field("Quantity", pick("qty", true)),
      field("Price", pick("price", false)),
      field("The price is", select(BASIS, m.basis, { "aria-label": "Price basis", onchange: (e) => { m.basis = e.target.value; } }))),
    h("div", { class: "toolbar" }, h("button", { class: "btn primary", type: "button", onclick: apply }, icon("check"), "Read price lines")),
    status);
}
