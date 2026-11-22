import { h, icon, pill } from "../dom.js";
import { dataTable } from "../ui.js";
import { downloadBlob, stamp, store, toCSV } from "../analyze/core.js";
import { buildCase, briefHtml, priceRowsForExport, tenantRowsForExport, termRowsForExport, TENANT_SCOPES } from "../analyze/engines/renewalcase.js";
import { TENANT_KINDS, channelOf, usd } from "../analyze/engines/pricing.js";
import { CLAUSES, REDLINE_NOTE } from "../analyze/data/redlines.js";
import { PEER_EVIDENCE, PEER_SOURCES, PEER_CLAIMS_CHECKED } from "../analyze/data/peers.js";
import { empty, finding, kpi, levelPill, note, tabs } from "./widgets.js";
import { e7Tab } from "./e7model.js";

const KIND = { replace: "Replace this language", insert: "Add this clause", exception: "Request this exception" };
const STATUS_KIND = { "In the documents": "ok", Missing: "risk", "Not yet seen": "warn", "Not found": "" };
const m = (v) => (v == null ? "-" : usd(v));
const money0 = (n) => (Number.isFinite(n) ? usd(n, 0) : "-");

export function redlinePanel(list) {
  return h("div", {}, h("p", { class: "muted", text: REDLINE_NOTE }),
    ...(list.length ? list.map((r) => h("div", { class: "card", style: { marginBottom: "10px" } },
      h("h3", {}, r.topic, levelPill(r.level), pill(KIND[r.kind], "info")),
      h("p", { class: "muted", text: `Raised by: ${r.reasons.join("; ")}` }),
      r.kind === "replace" ? h("p", {}, h("b", { text: "In the agreement: " }), h("del", { text: r.original })) : null,
      h("p", {}, h("b", { text: r.kind === "replace" ? "Proposed replacement: " : r.kind === "exception" ? "Proposed exception: " : "Proposed new clause: " }), h("ins", { text: r.clause })),
      h("p", {}, h("b", { text: "Fallback if Microsoft will not agree: " }), r.fallback)))
      : [empty("No redlines proposed.", "Nothing in these documents needs a new or changed clause.")]));
}

function findingList(findings) {
  let filter = "all";
  const opts = [["all", "All"], ["high", "High"], ["med", "Medium"], ["low", "Low"], ["ok", "In place"]];
  const count = (k) => (k === "all" ? findings.length : findings.filter((f) => f.level === k).length);
  const list = h("div", {});
  const bar = h("div", { class: "seg", style: { marginBottom: "12px" } });
  const show = () => {
    [...bar.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === filter)));
    const rows = findings.filter((f) => filter === "all" || f.level === filter);
    list.replaceChildren(...(rows.length ? rows.map((f) => h("div", {}, finding(f), f.source ? h("small", { class: "muted", style: { display: "block", margin: "-6px 0 10px 4px" }, text: `From: ${f.source}` }) : null)) : [h("p", { class: "muted", text: "Nothing in this category." })]));
  };
  opts.forEach(([k, l]) => bar.append(h("button", { type: "button", "data-k": k, text: `${l} (${count(k)})`, onclick: () => { filter = k; show(); } })));
  show();
  return h("div", {}, bar, list);
}

let lastTab = "Position";
const SCOPE_KEY = "tenantscope", KINDS_KEY = "tenantkinds";

/** Everything uploaded for one renewal, read together. `repaint` redraws the page after the tenant scope changes. */
export function packageView(docs, repaint = () => {}) {
  const kinds = store.get(KINDS_KEY, {}) ?? {};
  const scope = TENANT_SCOPES.some((s) => s[0] === store.get(SCOPE_KEY, "all")) ? store.get(SCOPE_KEY, "all") : "all";
  const c = buildCase(docs, { scope, kinds });
  const pos = c.position;

  if (!c.docs.length) return empty("No documents are included.", "Tick Include on at least one document above.");

  const exportAll = () => {
    const rows = c.findings.filter((f) => f.level !== "ok" && f.ask).map((f) => ({
      priority: f.level, finding: f.title, why: f.text ?? "", ask: f.ask, source: f.source ?? "",
      basis: (f.why ?? []).map((w) => `${w.basis}: ${w.text}${w.source ? ` [${w.source}]` : ""}`).join(" | "),
      proposed_language: CLAUSES[f.redlineKey]?.clause ?? "", fallback: CLAUSES[f.redlineKey]?.fallback ?? "",
    }));
    downloadBlob(`negotiation-asks-${stamp()}.csv`, toCSV(rows, ["priority", "finding", "why", "basis", "ask", "source", "proposed_language", "fallback"]), "text/csv;charset=utf-8");
  };
  const exportPrices = () => {
    const rows = priceRowsForExport(c);
    downloadBlob(`price-positions-${stamp()}.csv`, toCSV(rows, rows[0] ? Object.keys(rows[0]) : ["product"]), "text/csv;charset=utf-8");
  };
  const exportTenants = () => {
    const rows = tenantRowsForExport(c);
    downloadBlob(`spend-by-tenant-${stamp()}.csv`, toCSV(rows, rows[0] ? Object.keys(rows[0]) : ["tenant"]), "text/csv;charset=utf-8");
  };
  const exportTerms = () => {
    const rows = termRowsForExport(c);
    downloadBlob(`term-positions-${stamp()}.csv`, toCSV(rows, ["term", "category", "status", "found_in", "source_text", "ask", "proposed_language", "fallback"]), "text/csv;charset=utf-8");
  };

  const stance = pos.quotedBest > 0
    ? `Open at ${money0(pos.atStretch)} a year, aim for ${money0(pos.atTarget)}, and do not go above ${money0(pos.ceiling)}. The best price quoted is ${money0(pos.quotedBest)}, ${money0(pos.gap)} above target.`
    : "No prices have been read yet. Upload a price sheet or quote, or add lines by hand on its Price review tab.";

  const positionTab = () => h("div", {},
    h("div", { class: "grid g-kpi" },
      kpi("Best price quoted", money0(pos.quotedBest), `${pos.offers} offer${pos.offers === 1 ? "" : "s"} compared, per year`),
      kpi("Target", money0(pos.atTarget), "per year"),
      kpi("Opening position", money0(pos.atStretch), "per year"),
      kpi("Gap to target", money0(pos.gap), "per year", pos.gap > 0 ? "warn" : ""),
      kpi("Terms secured", `${c.termsSecured} of ${c.termsExpected}`, "expected terms found"),
      kpi("To raise", `${c.counts.high} high, ${c.counts.med} medium`, "across all documents", c.counts.high ? "warn" : "")),
    h("div", { class: "card" }, h("h3", { text: "Recommended position" }), h("p", { text: stance }),
      h("p", { class: "muted", text: "Target is list less the size-band discount, or what your organization pays now if that is lower. Band discounts are assumptions until replaced in Workspace, Rate card." })),
    h("h3", { text: "What to raise first" }),
    ...(c.priorities.length ? c.priorities.map((f) => h("div", {}, finding(f), f.source ? h("small", { class: "muted", style: { display: "block", margin: "-6px 0 10px 4px" }, text: `From: ${f.source}` }) : null)) : [h("p", { class: "muted", text: "Nothing needing attention." })]));

  const pricesTab = () => {
    if (!c.refRows.length && !c.tenantRows.length) return empty("No price lines were read from these documents.", "Open a pricing document and add lines on its Price review tab.");
    const totalBy = (o) => c.tenantRows.reduce((a, t) => a + (t.annualBy[o.id] ?? 0), 0);
    const tenantTable = c.tenantRows.length > 1 || c.tenantRows.some((t) => t.key) ? h("div", {},
      h("h3", { text: "Spend by tenant" }),
      h("p", { class: "muted", text: "Every tenant on the quotes is listed here whatever the scope above. Seats in government-cloud and separate tenants are bought on the same agreement but are not part of the main tenant, so they are kept apart in the price comparison and the E5 vs E7 view. Change a tenant's type if it is classed wrongly." }),
      dataTable({
        rows: c.tenantRows, csvName: "spend-by-tenant", pageSize: 25, searchText: (t) => `${t.tenant} ${t.products.join(" ")}`,
        columns: [
          { key: "tenant", label: "Tenant" },
          { key: "kindLabel", label: "Type", sort: (t) => t.kindLabel, render: (t) => h("select", { class: "input", "aria-label": `Type of ${t.tenant}`, onchange: (e) => { store.set(KINDS_KEY, { ...kinds, [t.key]: e.target.value }); repaint(); } }, TENANT_KINDS.map(([id, label]) => h("option", { value: id, text: label, selected: id === t.kind ? "" : null }))) },
          { key: "lines", label: "Lines", num: true },
          { key: "licences", label: "Licences", num: true, render: (t) => t.licences.toLocaleString("en-US") },
          ...c.offers.map((o) => ({ key: `t${o.id}`, label: `${o.exhibit} per year`, num: true, sort: (t) => t.annualBy[o.id] ?? 0, render: (t) => (t.annualBy[o.id] ? usd(t.annualBy[o.id], 0) : "-") })),
          { key: "products", label: "Products", render: (t) => h("span", { class: "muted", style: { whiteSpace: "normal" }, text: t.products.slice(0, 6).join(", ") + (t.products.length > 6 ? ` and ${t.products.length - 6} more` : "") }) },
        ],
      }),
      h("p", { class: "muted", text: `Across all tenants: ${c.offers.map((o) => `${o.exhibit} ${usd(totalBy(o), 0)}`).join("; ")} per year.` })) : null;
    if (!c.refRows.length) return h("div", {}, tenantTable, empty("No price lines are in this scope.", "Choose All tenants above to see every line."));
    const cols = [
      { key: "name", label: "Product" },
      { key: "qty", label: "Seats", num: true, render: (r) => r.qty.toLocaleString("en-US") },
      ...c.offers.map((o) => ({ key: `o${o.id}`, label: o.exhibit, title: `${o.name} (${channelOf(o.vendorId).label})`, num: true, sort: (r) => r.prices[o.id] ?? null, render: (r) => h("span", { class: "amt" }, h("span", { class: "slot" }, r.prices[o.id] != null && r.bestId === o.id && c.offers.length > 1 ? pill("best", "ok") : null), h("span", { class: "v", text: r.prices[o.id] == null ? "-" : usd(r.prices[o.id]) })) })),
      { key: "best", label: "Best quoted", num: true, render: (r) => usd(r.best) },
      { key: "current", label: "Your organization pays now", num: true, render: (r) => m(r.current) },
      { key: "gap", label: "Gap to target / yr", num: true, render: (r) => (r.gap > 0 ? usd(r.gap, 0) : "-") },
    ];
    const toVendor = c.compare.asks;
    const exhibits = h("div", {},
      h("h3", { text: "Exhibits compared" }),
      dataTable({
        rows: c.offers.map((o) => ({ exhibit: o.exhibit, document: o.name, source: channelOf(o.vendorId).label, ...c.compare.totals[o.id] })), csvName: "exhibits", pageSize: 25,
        columns: [{ key: "exhibit", label: "Exhibit", render: (r) => pill(r.exhibit, "info") }, { key: "document", label: "Document" }, { key: "source", label: "Source" }, { key: "lines", label: "Lines", num: true },
          { key: "total", label: "Per year", num: true, render: (r) => usd(r.total, 0) },
          ...(c.offers.length > 1 ? [{ key: "save", label: "Saving if every line matched the best price", num: true, render: (r) => (r.save > 0 ? usd(r.save, 0) : "-") }] : [])],
      }));
    return h("div", {},
      tenantTable,
      exhibits,
      h("h3", { text: "Price per user per month, by exhibit" }),
      h("p", { class: "muted", text: "Each column is one exhibit, listed above. Where several exhibits quote the same product, the lowest is marked best and is the price to ask the others to match." }),
      dataTable({ rows: c.refRows, columns: cols, csvName: "price-positions", pageSize: 100, searchText: (r) => r.name }),
      toVendor.length ? h("div", {}, h("h3", { text: "Ask each vendor to match" }),
        h("ul", { class: "muted", style: { paddingLeft: "18px" } }, toVendor.slice(0, 20).map((a) => h("li", { text: `${c.offers.find((o) => o.id === a.offerId)?.exhibit}: match ${a.matchFrom} on ${a.product} at ${usd(a.matchPrice)} instead of ${usd(a.price)}, ${usd(a.save, 0)} a year.` })))) : null);
  };

  const termsTab = () => h("div", {},
    c.haveAgreement ? null : note("No contract language has been uploaded, so terms cannot be confirmed yet. Upload the agreement or order form and set it to Contract language.", "demo"),
    dataTable({
      rows: c.termRows, csvName: "term-positions", pageSize: 50, searchText: (r) => `${r.term} ${r.category}`,
      filters: [{ key: "status", label: "Status" }],
      columns: [
        { key: "term", label: "Term", render: (r) => h("span", {}, r.term, h("small", { class: "muted", style: { display: "block" }, text: r.category })) },
        { key: "status", label: "Status", render: (r) => pill(r.status, STATUS_KIND[r.status]) },
        { key: "where", label: "Found in", render: (r) => r.where.join("; ") || "-" },
        { key: "evidence", label: "Source text", render: (r) => r.evidence[0] ?? "-" },
        { key: "asks", label: "Ask", render: (r) => (r.present ? `Verify: ${r.asks[0]}` : r.asks.join("; ")) },
      ],
    }));

  const peersTab = () => {
    const pc = (v) => (v == null ? "-" : `${v.toFixed(1)}%`);
    const withBand = c.peerRows.filter((r) => r.band);
    const POS = { below: ["below the range", "risk"], within: ["within the range", "ok"], above: ["better than the range", "ok"] };
    return h("div", {},
      note("What this is: public agreements show terms and discount mechanisms, not E3 or E5 prices paid by named organisations, so none was found to compare per-user prices with. The discount ranges below come from an advisory firm's benchmark of 142 renewals. They frame the ask; they are not prices Microsoft has agreed, and they cannot be verified.", "demo"),
      withBand.length ? h("div", {},
        h("p", { class: "muted", text: `Size band ${c.peerTier.id} (${c.peerTier.label}), from ${c.peerSeatSource}.` }),
        dataTable({
          rows: withBand, csvName: "peer-comparison", pageSize: 25,
          columns: [
            { key: "name", label: "Product" },
            { key: "list", label: "List", num: true, render: (r) => usd(r.list) },
            { key: "current", label: "Your organization pays now", num: true, render: (r) => m(r.current) },
            { key: "currentDiscount", label: "Off list now", num: true, render: (r) => h("span", {}, pc(r.currentDiscount), r.currentPosition ? pill(POS[r.currentPosition][0], POS[r.currentPosition][1]) : null) },
            { key: "best", label: "Best quote", num: true, render: (r) => usd(r.best) },
            { key: "quoteDiscount", label: "Off list in quote", num: true, render: (r) => h("span", {}, pc(r.quoteDiscount), r.position ? pill(POS[r.position][0], POS[r.position][1]) : null) },
            { key: "band", label: "Range off list", render: (r) => `${r.band.low}% to ${r.band.high}%` },
            { key: "price", label: "Range price", num: true, render: (r) => `${usd(r.bestPrice)} to ${usd(r.worstPrice)}` },
            { key: "gapNow", label: "Gap to middle / yr", num: true, render: (r) => (r.gapNow > 0 ? usd(r.gapNow, 0) : "-") },
          ],
        })) : empty("No product here is covered by the benchmark.", "It covers Microsoft 365 E3, E5, F3 and Copilot. Add those lines to a price sheet to see the comparison."),
      h("h3", { text: "Public records and market sources" }),
      ...PEER_EVIDENCE.map((e) => {
        const s = PEER_SOURCES[e.source];
        return h("div", { class: "card", style: { marginBottom: "10px" } },
          h("h3", {}, e.topic, pill(s.verified === "document" ? "public agreement, read in full" : s.verified === "primary" ? "Microsoft's own price list" : "consultancy source, not verified", s.verified === "secondary" ? "warn" : "ok")),
          h("p", { class: "muted" }, s.url ? h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.label }) : s.label),
          h("blockquote", { class: "muted", style: { margin: "0 0 8px", paddingLeft: "10px", borderLeft: "3px solid var(--border, #ccc)" }, text: `"${e.quote}"` }),
          e.compare ? h("p", {}, h("b", { text: "For comparison: " }), e.compare) : null,
          h("p", {}, h("b", { text: "What it shows: " }), e.takeaway),
          h("p", { class: "muted" }, h("b", { text: "Limit: " }), e.limit));
      }),
      h("h3", { text: "Claims checked and not supported" }),
      ...PEER_CLAIMS_CHECKED.map((x) => h("div", { class: "card", style: { marginBottom: "10px" } }, h("p", {}, h("b", { text: "Claim: " }), x.claim), h("p", {}, h("b", { text: "What the documents say: " }), x.result))));
  };

  const caseFindings = c.findings.filter((f) => f.scope === "case" || f.scope === "pricing" || f.scope === "price" || f.scope === "terms");  const timelineTab = () => (c.timeline.length ? dataTable({
    rows: c.timeline, csvName: "renewal-timeline", pageSize: 50,
    columns: [{ key: "text", label: "When", sort: (r) => r.date.getTime() }, { key: "label", label: "What", render: (r) => h("span", {}, r.label, r.lever ? pill("leverage", "info") : null) },
      { key: "days", label: "Days", num: true, render: (r) => (r.days < 0 ? `${-r.days} ago` : String(r.days)) }],
  }) : empty("No dates were found.", "Set the renewal date and response deadline in the Workspace, or upload the agreement."));

  const e7Panel = () => {
    const home = scope === "home" ? c : buildCase(docs, { scope: "home", kinds });
    const others = c.tenantRows.filter((t) => t.kind !== "home");
    return h("div", {},
      others.length ? note(`This view models the main tenant only. ${others.length} other tenant${others.length === 1 ? "" : "s"} on the quotes (${others.map((t) => t.tenant).join(", ")}) are left out because their seats are outside the main tenant and, for government cloud, are priced and licensed separately. They are listed under Prices, Spend by tenant.`, "demo") : null,
      e7Tab(home));
  };

  const scopeSelect = h("select", { class: "input", "aria-label": "Tenants included in the analysis", onchange: (e) => { store.set(SCOPE_KEY, e.target.value); repaint(); } },
    TENANT_SCOPES.map(([id, label]) => h("option", { value: id, text: label, selected: id === scope ? "" : null })));
  const scopeNote = scope === "all" ? null : note(`Prices, targets and findings below cover ${TENANT_SCOPES.find((s) => s[0] === scope)[1].toLowerCase()}. Spend by tenant on the Prices tab always lists every tenant.`, "demo");

  return h("div", {},
    h("div", { class: "toolbar" },
      h("label", { class: "muted" }, "Tenants included ", scopeSelect),
      h("button", { class: "btn primary", type: "button", onclick: () => downloadBlob(`renewal-negotiation-brief-${stamp()}.html`, briefHtml(c), "text/html;charset=utf-8") }, icon("download"), "Negotiation brief (Word-ready HTML)"),
      h("button", { class: "btn", type: "button", onclick: exportAll }, icon("download"), "All asks (CSV)"),
      h("button", { class: "btn", type: "button", onclick: exportPrices }, icon("download"), "Price positions (CSV)"),
      h("button", { class: "btn", type: "button", onclick: exportTenants }, icon("download"), "Spend by tenant (CSV)"),
      h("button", { class: "btn", type: "button", onclick: exportTerms }, icon("download"), "Term positions (CSV)")),
    scopeNote,
    tabs({
      Position: positionTab,
      Prices: pricesTab,
      "E5 vs E7": e7Panel,
      Peers: peersTab,
      Terms: termsTab,
      "Across documents": () => (caseFindings.length ? findingList(caseFindings) : empty("Nothing to show yet.", "")),
      "All findings": () => findingList(c.findings),
      Redlines: () => redlinePanel(c.redlines),
      Timeline: timelineTab,
    }, lastTab, (name) => { lastTab = name; }));
}
