import { h, icon, pill } from "../dom.js";
import { PRODUCTS } from "../analyze/data/products.js";
import { BASES, CHANNELS, VERDICTS, blankLine, priceLines, usd, PRICING_SCOPES } from "../analyze/engines/pricing.js";
import { applyPricing } from "../analyze/engines/contracts.js";
import { downloadBlob, stamp, toCSV } from "../analyze/core.js";
import { empty, field, finding, kpi, note, num, select } from "./widgets.js";

const PRODUCT_OPTIONS = [["", "(not matched)"], ...[...PRODUCTS].sort((a, b) => a.name.localeCompare(b.name)).map((p) => [p.id, p.name])];
const m = (v) => (v == null ? "-" : usd(v));

/** Editable price lines for one document, with the reference prices and the asks they produce. */
export function priceTab(d, repaint) {
  const p = d.analysis.pricing;
  const apply = () => { applyPricing(d.analysis, d.text ?? ""); repaint(); };
  const touch = (l, patch) => { Object.assign(l, patch, { basisSource: "stated", check: false }); apply(); };

  const review = priceLines(p.lines, p.termMonths);
  const t = review.totals;

  const controls = h("div", { class: "toolbar" },
    field("Quote is from", select(CHANNELS.map((c) => [c.id, c.label]), p.vendorId, { onchange: (e) => { p.vendorId = e.target.value; apply(); } })),
    field("Term for \"whole term\" prices (months)", num(p.termMonths, { min: "1", max: "120", onchange: (e) => { p.termMonths = Math.max(1, Number(e.target.value) || 12); apply(); } })),
    h("button", { class: "btn", type: "button", onclick: () => { p.lines.push(blankLine()); apply(); } }, icon("check"), "Add a line"));

  const rowEls = review.rows.map((r) => {
    const l = p.lines.find((x) => x.id === r.id);
    const v = VERDICTS[r.verdict];
    return h("tr", {},
      h("td", {},
        select(PRODUCT_OPTIONS, l.productId, { "aria-label": "Product", onchange: (e) => touch(l, { productId: e.target.value }) }),
        l.desc ? h("small", { class: "muted", style: { display: "block", maxWidth: "260px" }, text: l.desc }) : null,
        l.tenant ? h("small", { class: "muted", style: { display: "block" }, text: `Tenant: ${l.tenant}` }) : null,
        r.alt ? h("small", { class: "muted", style: { display: "block" }, text: `Alternative price: ${r.option}` }) : null),
      h("td", { class: "num" }, num(l.qty, { "aria-label": "Seats", style: { width: "88px" }, onchange: (e) => touch(l, { qty: Number(e.target.value) || 0 }) })),
      h("td", { class: "num" }, num(l.unit, { "aria-label": "Quoted price", style: { width: "96px" }, onchange: (e) => touch(l, { unit: Number(e.target.value) || 0 }) })),
      h("td", {}, select(BASES, l.basis, { "aria-label": "Price basis", onchange: (e) => touch(l, { basis: e.target.value }) }),
        r.check ? h("small", { class: "muted", style: { display: "block" }, text: "Basis or seats inferred: check" }) : null),
      h("td", { class: "num", text: r.perMonth > 0 ? usd(r.perMonth) : "-" }),
      h("td", { class: "num", text: m(r.ref?.current) }),
      h("td", { class: "num", text: m(r.ref?.target) }),
      h("td", { class: "num", text: m(r.ref?.stretch) }),
      h("td", { class: "num" }, r.ref?.quoteDiscount != null ? `${r.ref.quoteDiscount.toFixed(1)}%` : "-",
        r.peer ? h("small", { class: "muted", style: { display: "block" }, text: `range ${r.peer.low}% to ${r.peer.high}%` }) : null),
      h("td", {}, pill(v[0], v[1])),
      h("td", { class: "num", text: r.gap > 0 ? usd(r.gap, 0) : "-" }),
      h("td", {}, h("button", { class: "btn sm", type: "button", "aria-label": "Remove line", onclick: () => { p.lines.splice(p.lines.indexOf(l), 1); apply(); } }, icon("close"))));
  });

  const head = ["Product", "Seats", "Quoted price", "Quoted as", "Per user / month", "Your organization pays now", "Target", "Open at", "Off list", "Verdict", "Gap to target / yr", ""];
  const numCols = new Set([1, 2, 4, 5, 6, 7, 8, 10]);
  const table = h("div", { class: "tablewrap" }, h("table", { class: "dt" },
    h("thead", {}, h("tr", {}, head.map((x, i) => h("th", { class: numCols.has(i) ? "num" : "", scope: "col", text: x })))),
    h("tbody", {}, rowEls)));

  const asks = d.analysis.findings.filter((f) => PRICING_SCOPES.has(f.scope) && f.level !== "ok");

  const exportAsks = () => {
    const rows = review.rows.filter((r) => r.productId).map((r) => ({
      product: r.name, seats: r.qty, quoted_per_user_month: r.perMonth.toFixed(2), current: r.ref?.current ?? "", list: r.ref?.list ?? "",
      target: r.ref?.target?.toFixed(2) ?? "", open_at: r.ref?.stretch?.toFixed(2) ?? "", walk_away_above: r.ref?.ceiling?.toFixed(2) ?? "", annual_gap_to_target: Math.round(r.gap), verdict: VERDICTS[r.verdict][0],
    }));
    downloadBlob(`price-positions-${stamp()}.csv`, toCSV(rows, ["product", "seats", "quoted_per_user_month", "current", "list", "target", "open_at", "walk_away_above", "annual_gap_to_target", "verdict"]), "text/csv;charset=utf-8");
  };

  if (!p.lines.length) {
    return h("div", {},
      empty("No price lines were found in this document.", "Add a line for each product on the quote, or upload a price sheet with a header row (product, quantity, price)."), controls);
  }

  return h("div", {},
    h("div", { class: "grid g-kpi" },
      kpi("Quoted per year", usd(t.quoted, 0), `${t.lines} line${t.lines === 1 ? "" : "s"}`),
      kpi("At target", usd(t.atTarget, 0), "on the lines with a reference price"),
      kpi("Gap to target", usd(t.gap, 0), "a year", t.gap > 0 ? "warn" : ""),
      kpi("Lines checked", `${t.pricedLines} of ${t.lines}`, "have a reference price")),
    note(`Size band ${review.band.id} (${review.band.label}), from ${review.seats.toLocaleString("en-US")} seats: ${review.seatSource}. Where an advisor benchmark covers the product (Microsoft 365 E3, E5, F3 and Copilot), the target is the middle of the range reported for organisations of that size and the opening price is the best end; other products use the size-band assumptions in Workspace, Rate card. The benchmark is an advisory firm's, not a price Microsoft has agreed.`),
    h("p", { class: "muted" }, p.vendorId === p.vendorWhy?.id
      ? `Source identified as ${CHANNELS.find((c) => c.id === p.vendorId)?.label}: ${p.vendorWhy.how}.${p.vendorWhy.quote ? ` Text: "${p.vendorWhy.quote}"` : ""}`
      : `Source set by you to ${CHANNELS.find((c) => c.id === p.vendorId)?.label}. The text suggested: ${p.vendorWhy?.how ?? "nothing"}.`),
    controls, table,
    h("div", { class: "toolbar" }, h("button", { class: "btn", type: "button", onclick: exportAsks }, icon("download"), "Price positions (CSV)")),
    h("h3", { text: "Price and term insights" }),
    ...(asks.length ? asks.map(finding) : [h("p", { class: "muted", text: "Nothing to raise on the prices." })]));
}
