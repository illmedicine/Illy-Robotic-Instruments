import { h, icon, fmt, pill } from "../dom.js";
import { pageHead } from "./common.js";
import { dataTable } from "../ui.js";
import { empty, field, fill, filePicker, finding, kpi, note, pct, select, tabs } from "./widgets.js";
import { downloadBlob, stamp, store, toCSV } from "../analyze/core.js";
import { ROLES, getProfile, roleById, saveProfile } from "../analyze/org.js";
import { ACCEPTED, extractText, extractWorkbook, tableToQuoteText, sha256, sha256Bytes } from "../analyze/engines/extract.js";
import { analyzeContract, applyPricing, buildRedlines, compareAnalyses, roleBrief } from "../analyze/engines/contracts.js";
import { analyzePricing, explainNoPrices, priceLines, usd } from "../analyze/engines/pricing.js";
import { ROLE_OPTIONS, roleOf, exhibitId } from "../analyze/engines/renewalcase.js";
import { CLAUSES, REDLINE_NOTE } from "../analyze/data/redlines.js";
import { results } from "../analyze/engines/advisor.js";
import { priceTab } from "./proposalprice.js";
import { mapperCard, tableRows, guess, readLines } from "./tablemap.js";
import { packageView, redlinePanel } from "./renewalcase.js";

const HISTORY = "contracts.history";
const POSTURE = { "needs-attention": "risk", caution: "warn", reasonable: "ok", "price-sheet": "info" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Uploads stay in memory for the browser session so a renewal can be built up over several visits to this page.
const session = { docs: [], view: "package", seq: 0, notice: "" };

export async function render() {
  let filter = "all";
  const out = h("div", {});
  const lens = select(ROLES.map((r) => [r.id, r.label]), getProfile().role, {
    "aria-label": "Audience lens", onchange: () => { saveProfile({ role: lens.value }); paint(); },
  });
  const pasteName = h("input", { class: "input", placeholder: "Name (optional)", "aria-label": "Pasted document name" });
  const pasteText = h("textarea", { class: "input", placeholder: "Or paste text or a table here", "aria-label": "Document text" });

  function saveHistory(a) {
    const hist = store.get(HISTORY, []);
    hist.unshift({ name: a.name, hash: a.hash, at: a.analyzedAt, counts: a.counts, coverage: a.coverage, posture: a.posture });
    store.set(HISTORY, hist.slice(0, 25));
    results.set("contracts", { name: a.name, counts: a.counts, coverage: a.coverage, posture: a.posture });
  }

  async function review(text, name, hash, info) {
    const analysis = analyzeContract(text, { name, hash });
    const exhibitNo = Math.max(0, ...session.docs.map((x) => x.exhibitNo ?? 0)) + 1;
    const d = { id: `d${++session.seq}`, exhibitNo, exhibit: exhibitId(exhibitNo), analysis, info, text, included: true };
    if (!analysis.pricing.lines.length) {
      const rows = tableRows(text);
      const m = rows.length ? guess(rows) : null;
      const lines = m ? readLines(rows, m).filter((l) => l.qty > 0).map((l) => ({ ...l, check: true })) : [];
      if (lines.length) {
        d.mapping = m;
        d.role = "pricing";
        analysis.pricing.lines = lines;
        applyPricing(analysis, text);
        d.info = { ...info, method: `${info.method}, ${lines.length} price lines read from the table (columns guessed, check them on the Read rows tab)` };
      }
    }
    session.docs.push(d);
    session.view = session.docs.length > 1 ? "package" : d.id;
    saveHistory(analysis);
    paint();
  }

  /** A table the usual reader finds nothing in, or one with price columns grouped by year (an exported tab, a paste from Excel), is read as a workbook tab. */
  function asTable(text, name) {
    const usual = analyzePricing(text, { name }).lines.length;
    const q = tableToQuoteText(text);
    return q && (usual === 0 || q.yearLabels || q.tenants > 0) ? q : null;
  }

  async function onWorkbook(file) {
    const tabs = await extractWorkbook(file);
    const hash = await sha256(file);
    const notes = [];
    for (const t of tabs) {
      if (!t.text) {
        const s = t.seen;
        notes.push(`${t.name}: not reviewed, no table with a product and a price column (${fmt.n(s.rows)} rows${s.header.length ? `, columns ${s.header.join(" | ")}` : ""}${s.amounts ? `, ${fmt.n(s.amounts)} dollar amounts` : ""})`);
        continue;
      }
      await review(t.text, `${file.name} - ${t.name}`, hash ? `${hash}#${t.name}` : null, { method: "xlsx tab", warning: null });
      notes.push(`${t.name}: ${fmt.n(t.lines)} price lines${t.hidden ? " (hidden tab)" : ""}`);
    }
    session.notice = `${file.name} has ${tabs.length} tab${tabs.length === 1 ? "" : "s"}. ${notes.join(". ")}.`;
    paint();
  }

  async function onFiles(files) {
    for (const file of files) {
      try {
        if (/\.xls[xm]$/i.test(file.name)) { await onWorkbook(file); continue; }
        const info = await extractText(file);
        if (info.text.split(/\s+/).length < 12) { out.replaceChildren(note(`${file.name}: too little readable text to review. ${info.warning || ""}`, "error")); continue; }
        let text = info.text, method = info.method;
        if (/\.(csv|tsv|txt)$/i.test(file.name)) {
          const q = asTable(text, file.name);
          if (q) { text = q.text; method = `${method}, read as a table: ${fmt.n(q.lines)} price lines${q.years > 1 ? ` with ${q.years} price years` : ""}${q.tenants ? `, ${q.tenants} named tenant${q.tenants === 1 ? "" : "s"}` : ""}`; }
        }
        await review(text, file.name, await sha256(file), { ...info, method });
      } catch (e) {
        out.replaceChildren(note(`${file.name}: ${e.message}`, "error"));
      }
    }
  }

  async function onPaste() {
    const t = pasteText.value.trim();
    if (t.split(/\s+/).filter(Boolean).length < 12) { out.replaceChildren(note("Paste at least a table or a few paragraphs.", "error")); return; }
    const name = pasteName.value.trim() || "Pasted document";
    const q = asTable(t, name);
    await review(q ? q.text : t, name, await sha256Bytes(new TextEncoder().encode(t)), { method: q ? `pasted table: ${fmt.n(q.lines)} price lines` : "pasted", warning: null });
    pasteText.value = "";
  }

  /** Why a document has no price lines, in terms of what it does contain. */
  function noPriceNote(d) {
    const x = explainNoPrices(d.text ?? "");
    if (!x.amounts && roleOf(d) === "contract") return null;
    const hdr = x.header;
    const yn = (b) => (b ? "yes" : "no");
    const sample = (d.text ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const first = h("pre", { class: "muted", style: { margin: "6px 0 0", whiteSpace: "pre-wrap", fontSize: "12px" }, text: `First lines as read:\n${sample.map((s) => s.slice(0, 160)).join("\n")}` });
    return h("div", {}, note(`No price lines were read from this document. It has ${fmt.n(x.rows)} lines and ${fmt.n(x.amounts)} dollar amounts. ` +
      (hdr ? `The closest header row (line ${hdr.row}: ${hdr.cells.join(" | ")}) has a product column: ${yn(hdr.found.product)}, a quantity column: ${yn(hdr.found.quantity)}, a unit price column: ${yn(hdr.found.price)}. ` : "No header row with a product, quantity or price column was found. ") +
      "A price line needs a product, a quantity and a unit price on the same row. Totals alone cannot be compared. If this is one tab of a workbook, upload the .xlsx file itself so every tab is read.", "demo"), first);
  }

  function findingsTab(a) {
    const opts = [["all", "All"], ["high", "High"], ["med", "Medium"], ["low", "Low"], ["ok", "In place"], ["pricing", "Price and terms"], ["environment", "Organization-specific"]];
    const isPrice = (f) => f.scope === "price" || f.scope === "pricing" || f.scope === "terms";
    const count = (k) => (k === "all" ? a.findings.length : k === "environment" ? a.findings.filter((f) => f.scope === "environment").length : k === "pricing" ? a.findings.filter(isPrice).length : a.counts[k]);
    const list = h("div", {});
    const bar = h("div", { class: "seg", style: { marginBottom: "12px" } });
    const show = () => {
      [...bar.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === filter)));
      const rows = a.findings.filter((f) => filter === "all" || (filter === "environment" ? f.scope === "environment" : filter === "pricing" ? isPrice(f) : f.level === filter));
      list.replaceChildren(...(rows.length ? rows.map(finding) : [h("p", { class: "muted", text: "No findings in this category." })]));
    };
    opts.forEach(([k, l]) => bar.append(h("button", { type: "button", "data-k": k, text: `${l} (${count(k)})`, onclick: () => { filter = k; show(); } })));
    show();
    return h("div", {}, bar, list);
  }

  function termsTab(a) {
    return dataTable({
      rows: a.detected, csvName: "contract-terms-found", pageSize: 50, searchText: (d) => `${d.term} ${d.category}`,
      columns: [
        { key: "term", label: "Term", render: (d) => h("span", {}, d.term, h("small", { class: "muted", style: { display: "block" }, text: d.category })) },
        { key: "expected", label: "Expected", render: (d) => (d.expected ? "Yes" : "Optional") },
        { key: "present", label: "In document", render: (d) => (d.present ? pill("found", "ok") : d.expected ? pill("not found", "risk") : pill("not found")) },
        { key: "evidence", label: "Source text", render: (d) => (d.evidence[0] ? d.evidence[0] : "-") },
      ],
    });
  }

  function factsTab(a) {
    const f = a.facts, rows = [];
    const add = (k, v, ev) => rows.push({ fact: k, value: v, evidence: ev });
    if (f.termMonths) add("Term", `${f.termMonths.value} months`, f.termMonths.evidence);
    if (f.effectiveDate) add("Effective date", fmt.date(f.effectiveDate.value), f.effectiveDate.evidence);
    if (f.expirationDate) add("Expiration", fmt.date(f.expirationDate.value), f.expirationDate.evidence);
    if (f.renewalDate) add("Renewal date", fmt.date(f.renewalDate.value), f.renewalDate.evidence);
    (f.notices || []).forEach((n) => add(n.renewalRelated ? "Renewal notice" : "Notice period", `${n.days} days`, n.evidence));
    if (f.autoRenew) add("Auto-renewal", "Present", f.autoRenew.evidence[0]);
    if (f.commitment) add("Commitment", `$${fmt.n(f.commitment.value)}`, f.commitment.evidence);
    if (f.macc) add("MACC", `$${fmt.n(f.macc.value)}`, f.macc.evidence);
    if (f.edeHours) add("EDE hours", fmt.n(f.edeHours.value), f.edeHours.evidence);
    if (f.overlapDays) add("Migration overlap", `${f.overlapDays.value} days`, f.overlapDays.evidence);
    (f.percentages || []).forEach((p) => add({ discount: "Discount", "increase-cap": "Increase cap", "reduction-limit": "Reduction limit" }[p.kind] || p.kind, `${p.value}%`, p.evidence));
    if (f.liabilityCap) add("Liability cap language", "Present", f.liabilityCap.evidence[0]);
    if (!rows.length) return empty("No dates, amounts or periods could be extracted.", "");
    return h("div", {}, h("p", { class: "muted", text: "Extracted automatically. Verify each against the document; extraction can pick up the wrong date or figure." }),
      dataTable({ rows, csvName: "contract-facts", pageSize: 50, columns: [{ key: "fact", label: "Fact" }, { key: "value", label: "Value" }, { key: "evidence", label: "Source text" }] }));
  }

  function historyTab() {
    const hist = store.get(HISTORY, []);
    if (!hist.length) return empty("No saved reviews.", "");
    return h("div", {}, h("p", { class: "muted", text: "Summaries of past reviews on this device. Document text is not kept." }),
      dataTable({
        rows: hist, csvName: "contract-review-history", pageSize: 25,
        columns: [
          { key: "name", label: "Document" }, { key: "at", label: "Reviewed", render: (x) => new Date(x.at).toLocaleString() },
          { key: "posture", label: "Posture", render: (x) => pill(x.posture.replace("-", " "), POSTURE[x.posture]) },
          { key: "counts", label: "High / Med", render: (x) => `${x.counts.high} / ${x.counts.med}` },
          { key: "coverage", label: "Coverage", num: true, render: (x) => pct(x.coverage) },
          { key: "hash", label: "Fingerprint", render: (x) => (x.hash ? x.hash.slice(0, 12) : "") },
        ],
      }), h("button", { class: "btn", type: "button", onclick: () => { store.remove(HISTORY); paint(); } }, "Clear history"));
  }

  function exportAsks(a) {
    const rows = a.findings.filter((f) => f.level !== "ok" && f.ask).map((f) => ({
      priority: f.level, finding: f.title, ask: f.ask, why: f.text, scope: f.scope,
      proposed_language: CLAUSES[f.redlineKey]?.clause ?? "", fallback: CLAUSES[f.redlineKey]?.fallback ?? "",
    }));
    downloadBlob(`negotiation-asks-${stamp()}.csv`, toCSV(rows, ["priority", "finding", "ask", "why", "scope", "proposed_language", "fallback"]), "text/csv;charset=utf-8");
  }

  function exportRedlines(a) {
    const list = buildRedlines(a);
    const p = (s) => `<p style="margin:4px 0 10px;font-family:Calibri,Arial,sans-serif;font-size:11pt">${s}</p>`;
    const lab = (s) => `<p style="margin:10px 0 2px;font-family:Calibri,Arial,sans-serif;font-size:9pt;color:#555;text-transform:uppercase">${esc(s)}</p>`;
    const kind = { replace: "Replace this language", insert: "Add this clause", exception: "Request this exception" };
    const body = list.map((r, i) => `<h2 style="font-family:Calibri,Arial,sans-serif;font-size:13pt;margin:22px 0 2px">${i + 1}. ${esc(r.topic)} <span style="font-size:10pt;color:#555">(${esc(r.level)} priority, ${esc(kind[r.kind])})</span></h2>`
      + p(`<i>Raised by: ${esc(r.reasons.join("; "))}</i>`)
      + (r.kind === "replace" ? lab("In the agreement") + p(`<span style="color:#b42318;text-decoration:line-through">${esc(r.original)}</span>`) : "")
      + lab(r.kind === "replace" ? "Proposed replacement" : r.kind === "exception" ? "Proposed exception" : "Proposed new clause")
      + p(`<span style="color:#18794e;text-decoration:underline">${esc(r.clause)}</span>`) + lab("Fallback if Microsoft will not agree") + p(esc(r.fallback))).join("");
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Redlines: ${esc(a.name)}</title></head><body style="max-width:780px;margin:24px auto">`
      + `<h1 style="font-family:Calibri,Arial,sans-serif;font-size:18pt">Redlines and exceptions</h1>${p(`<b>Document:</b> ${esc(a.name)}<br><b>Reviewed:</b> ${esc(new Date(a.analyzedAt).toLocaleString())}`)}`
      + p(`<i>${esc(REDLINE_NOTE)}</i>`) + (body || p("No redlines proposed.")) + "</body></html>";
    downloadBlob(`redlines-and-exceptions-${stamp()}.html`, html, "text/html;charset=utf-8");
  }

  function noPricesLabel(d) {
    const x = explainNoPrices(d.text ?? "");
    return x.amounts ? `no unit prices (${fmt.n(x.amounts)} dollar amounts seen)` : "no prices found";
  }

  function docsCard() {
    if (!session.docs.length) return null;
    const rows = session.docs.map((d) => {
      const a = d.analysis;
      return h("tr", {},
        h("td", {}, pill(d.exhibit, "info")),
        h("td", {}, h("button", { class: "btn sm", type: "button", "aria-pressed": String(session.view === d.id), text: a.name, onclick: () => { session.view = d.id; paint(); } })),
        h("td", {}, select(ROLE_OPTIONS, roleOf(d), { "aria-label": `How ${a.name} is used`, onchange: (e) => { d.role = e.target.value; paint(); } })),
        h("td", { class: "muted", text: a.pricing.lines.length ? `${a.pricing.lines.length} price line${a.pricing.lines.length === 1 ? "" : "s"}` : noPricesLabel(d) }),
        h("td", { class: "muted", text: a.kind === "pricing" ? "price sheet" : "agreement" }),
        h("td", {}, h("label", { style: { display: "flex", gap: "6px", alignItems: "center" } },
          h("input", { type: "checkbox", checked: d.included !== false ? "" : null, onchange: (e) => { d.included = e.target.checked; paint(); } }), "Include")),
        h("td", {}, h("button", { class: "btn sm", type: "button", "aria-label": `Remove ${a.name}`, onclick: () => {
          session.docs.splice(session.docs.indexOf(d), 1);
          if (session.view === d.id || session.docs.length < 2) session.view = session.docs.length > 1 ? "package" : session.docs[0]?.id ?? "package";
          paint();
        } }, icon("close"))));
    });
    return h("div", { class: "card" },
      h("div", { class: "toolbar" }, h("h3", { style: { margin: 0 }, text: "Documents for this renewal" }),
        h("button", { class: "btn sm", type: "button", "aria-pressed": String(session.view === "package"), onclick: () => { session.view = "package"; paint(); } }, icon("copy"), "Renewal package"),
        h("button", { class: "btn sm", type: "button", onclick: () => { session.docs.length = 0; session.view = "package"; session.notice = ""; paint(); } }, "Clear all")),
      h("p", { class: "muted", text: "Add the price sheet, each vendor's quote and the contract language. They are read together: a term found in any one counts, and prices are checked against the terms they will be bought under. Documents are kept in this browser session only." }),
      h("div", { class: "tablewrap" }, h("table", { class: "dt" }, h("tbody", {}, rows))));
  }

  function docView(d) {
    const a = d.analysis;
    const prev = session.docs.slice(0, session.docs.indexOf(d)).reverse().find((x) => x.analysis.name === a.name && x.analysis.hash !== a.hash);
    const b = roleBrief(a, lens.value);
    const cmp = prev ? compareAnalyses(prev.analysis, a) : null;
    const priceSheet = a.kind === "pricing";
    const rv = a.pricing.lines.length ? priceLines(a.pricing.lines, a.pricing.termMonths) : null;
    const panels = {};
    if (a.pricing.lines.length || priceSheet) panels["Price review"] = () => priceTab(d, paint);
    if (tableRows(d.text).length) panels["Read rows"] = () => mapperCard(d, paint);
    Object.assign(panels, {
      Findings: () => findingsTab(a), Redlines: () => redlinePanel(buildRedlines(a)),
      "Terms found": () => termsTab(a), "Extracted facts": () => factsTab(a), History: historyTab,
    });
    return h("div", {},
      h("p", { class: "muted", text: `${fmt.n(a.words)} words, ${fmt.n(a.sentences)} sentences, ${a.hash ? `fingerprint ${a.hash.slice(0, 12)}` : "no fingerprint (page not on HTTPS)"}, ${d.info.method}` }),
      d.info.warning ? note(d.info.warning, "demo") : null,
      a.pricing.lines.length ? null : noPriceNote(d),
      priceSheet ? note("This looks like a price sheet, not an agreement. Its prices are checked on the Price review tab; the contract terms it does not state appear as terms to secure. Add the contract language above to review the prices against it.") : null,
      cmp ? note(`Compared with the previous version loaded this session: ${cmp.termDiff.length ? cmp.termDiff.map((t) => `${t.term} ${t.change}`).join("; ") : "no change in terms"}. ${cmp.resolvedHigh.length} high item(s) resolved, ${cmp.newHigh.length} new.`) : null,
      h("div", { class: "grid g-kpi" },
        priceSheet
          ? kpi("Document type", "Price sheet", "terms are asks to secure")
          : kpi("Overall posture", a.posture.replace("-", " "), "against your organization requirements", POSTURE[a.posture] === "risk" ? "warn" : ""),
        kpi("High priority", String(a.counts.high), "raise before signing", a.counts.high ? "warn" : ""),
        kpi("Medium priority", String(a.counts.med), "negotiate"),
        rv ? kpi("Quoted per year", usd(rv.totals.quoted, 0), `${usd(rv.totals.gap, 0)} above target`, rv.totals.gap > 0 ? "warn" : "")
          : kpi("Expected terms found", pct(a.coverage), `${a.detected.filter((x) => x.expected && x.present).length} of ${a.detected.filter((x) => x.expected).length}`)),
      h("div", { class: "card" }, h("h3", { text: `${roleById(lens.value).short} lens: ${b.heading}` }), h("p", { class: "muted", text: b.lead }),
        ...(b.items.length ? b.items.map(finding) : [h("p", { class: "muted", text: "Nothing needing attention under this lens." })])),
      h("div", { class: "toolbar" },
        h("button", { class: "btn", type: "button", onclick: () => exportAsks(a) }, icon("download"), "Negotiation asks (CSV)"),
        h("button", { class: "btn", type: "button", onclick: () => exportRedlines(a) }, icon("download"), "Redlines (HTML)")),
      tabs(panels, priceSheet && panels["Price review"] ? "Price review" : !a.pricing.lines.length && panels["Read rows"] ? "Read rows" : undefined));
  }

  function paint() {
    if (!session.docs.length) { fill(out, tabs({ History: historyTab })); return; }
    const d = session.docs.find((x) => x.id === session.view);
    fill(out, session.notice ? note(session.notice) : null, docsCard(), d ? docView(d) : packageView(session.docs, paint));
  }

  const view = h("div", {},
    pageHead("Contract review",
      "Upload everything for one renewal: price sheets, vendor quotes and contract language. They are read in this browser, together, to find what is missing, what is risky and what the prices should be, and to build a negotiating brief you can export. Nothing is uploaded to a server.", lens),
    h("div", { class: "card" }, h("div", { class: "grid g-2" },
      filePicker(`Documents (${ACCEPTED}, up to 25 MB each; choose several)`, ACCEPTED, onFiles, true),
      h("div", {}, field("Paste text or a table", pasteText), h("div", { class: "toolbar" }, pasteName, h("button", { class: "btn primary", type: "button", onclick: onPaste }, icon("search"), "Review pasted text"))))),
    out);
  paint();
  return view;
}
