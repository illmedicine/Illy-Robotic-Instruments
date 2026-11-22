import { h, icon, fmt, pill } from "../dom.js";
import { pageHead } from "./common.js";
import { dataTable } from "../ui.js";
import { empty, field, fill, filePicker, kpi, money, note, num, pct, select } from "./widgets.js";
import { downloadBlob, readFileText, stamp, toCSV, parseLocalDate } from "../analyze/core.js";
import { orgContext } from "../analyze/org.js";
import { analyzeDecisions, deadlineBrief, parseDecisions } from "../analyze/engines/decisions.js";
import { results } from "../analyze/engines/advisor.js";

export async function render() {
  const ctx = orgContext();
  const p = ctx.profile;
  const term = num(p.termYears || 3, { min: "1", max: "5", step: "1" });
  const assume = select([["renew", "Renew (keep spend)"], ["drop", "Drop (lose seats)"]], "renew", { "aria-label": "Undecided accounts" });
  const out = h("div", {}, empty("No decisions export loaded.", "Drop the renewal decisions export (.csv). It is read in this browser and not uploaded."));
  let records = null, last = null;

  async function onFiles(files) {
    try {
      const parsed = [];
      for (const f of files) parsed.push(parseDecisions(await readFileText(f)));
      records = parsed.flatMap((x) => x.records);
      paint();
    } catch (e) {
      out.replaceChildren(note(e.message, "error"));
    }
  }

  function paint() {
    if (!records) return;
    const res = analyzeDecisions(records, { termYears: Math.min(5, Math.max(1, Number(term.value) || 3)), outstandingAssumption: assume.value });
    last = res;
    const o = res.overall, m = res.money;
    const unknown = o.outstanding > 0 && m.outstandingAnnual === 0 && res.unpriced.length > 0;
    const lines = deadlineBrief(res, ctx.daysToDeadline);
    const cols = [
      { key: "name", label: "Name" },
      { key: "total", label: "Records", num: true, render: (r) => fmt.n(r.total) },
      { key: "keep", label: "Keep", num: true, render: (r) => fmt.n(r.keep) },
      { key: "remove", label: "Remove", num: true, render: (r) => fmt.n(r.remove) },
      { key: "change", label: "Change", num: true, render: (r) => fmt.n(r.change) },
      { key: "outstanding", label: "Outstanding", num: true, render: (r) => fmt.n(r.outstanding) },
      { key: "completion", label: "Complete", num: true, render: (r) => pct(r.completion) },
    ];
    fill(out,
      h("div", { class: "grid g-kpi" },
        kpi("Records", fmt.n(o.total), "licence decisions loaded"),
        kpi("Decided", pct(o.completion, 1), `${fmt.n(o.decided)} of ${fmt.n(o.total)}`),
        kpi("Outstanding", fmt.n(o.outstanding), unknown ? "cost unknown: licence unpriced" : `${money(m.outstandingAnnual)} a year unresolved`, o.outstanding ? "warn" : ""),
        kpi("Keep / remove", `${fmt.n(o.keep)} / ${fmt.n(o.remove)}`, o.change ? `${fmt.n(o.change)} to change` : ""),
        kpi("Committed per year", money(m.committedAnnual), res.assumption === "renew" ? "keep plus undecided" : "keep only"),
        kpi(`Locked over ${res.termYears} years`, money(m.committedTerm), "at current unit prices"),
        kpi("Removed per year", money(m.avoidedAnnual), `${money(m.avoidedTerm)} over the term`),
        kpi("Outstanding exposure", unknown ? "unknown" : money(m.outstandingTermExposure), `over ${res.termYears} years if left as-is`)),
      ...(lines.length ? lines.map((l) => note(l.text, l.level === "high" ? "error" : l.level === "low" ? "info" : "demo")) : [note("All decisions are recorded.")]),
      h("div", { class: "toolbar" }, h("button", { class: "btn", type: "button", onclick: () => {
        const rows = res.byLob.map((l) => ({ line_of_business: l.name, records: l.total, keep: l.keep, remove: l.remove, change: l.change, outstanding: l.outstanding, percent_complete: (l.completion * 100).toFixed(1) }));
        downloadBlob(`renewal-outstanding-by-lob-${stamp()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
      } }, icon("download"), "Outstanding by line of business (CSV)")),
      h("div", { class: "card" }, h("h3", { text: "By line of business" }), dataTable({ rows: res.byLob, csvName: "renewal-by-lob", pageSize: 25, initialSort: "outstanding", searchText: (r) => r.name, columns: cols })),
      h("div", { class: "card" }, h("h3", { text: "By tenant" }), dataTable({ rows: res.byTenant, csvName: "renewal-by-tenant", pageSize: 25, columns: cols })),
      h("div", { class: "card" }, h("h3", { text: "By licence" }), dataTable({
        rows: res.byLicence, csvName: "renewal-by-licence", pageSize: 25, searchText: (r) => r.name,
        columns: [
          { key: "name", label: "Licence" },
          { key: "unit", label: "Per user / month", num: true, render: (r) => (r.source === "unpriced" ? pill("unpriced", "warn") : `$${r.unit.toFixed(2)}`) },
          { key: "total", label: "Records", num: true, render: (r) => fmt.n(r.total) },
          { key: "keepAnnual", label: "Keep a year", num: true, render: (r) => money(r.keepAnnual) },
          { key: "removeAnnual", label: "Remove a year", num: true, render: (r) => money(r.removeAnnual) },
          { key: "outstandingAnnual", label: "Outstanding a year", num: true, render: (r) => money(r.outstandingAnnual) },
        ],
      })),
      res.reviewers.length ? h("div", { class: "card" }, h("h3", { text: "Who decided" }), dataTable({
        rows: res.reviewers, csvName: "renewal-reviewers", pageSize: 25,
        columns: [{ key: "name", label: "Reviewer" }, { key: "count", label: "Decisions recorded", num: true, render: (r) => fmt.n(r.count) }],
      })) : null,
      h("p", { class: "muted", text: res.caveat }));
    results.set("decisions", {
      overall: res.overall, money: res.money, termYears: res.termYears,
      byLob: res.byLob.slice(0, 25).map(({ name, total, outstanding, completion }) => ({ name, total, outstanding, completion })),
    });
  }

  const d = ctx.daysToDeadline;
  const deadline = d == null
    ? note("No response deadline is set. Add it on Workspace & rate card.", "info")
    : note(`Responses due ${parseLocalDate(p.responseDeadline).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}: ${d >= 0 ? `${d} day(s) remaining` : `${Math.abs(d)} day(s) overdue`}. Final decisions lock a ${p.termYears || 3}-year commitment.`, d <= 7 ? "error" : "demo");

  return h("div", {},
    pageHead("Renewal position", "Prices the decisions in a renewal export, so the commitment being locked in is visible in dollars. To check those decisions against live data, use Validate renewal decisions."),
    deadline,
    h("div", { class: "toolbar" }, filePicker("Decisions export (.csv)", ".csv,.tsv,.txt", onFiles, true),
      field("Term (years)", Object.assign(term, { onchange: paint })), field("Undecided accounts", Object.assign(assume, { onchange: paint }))),
    out);
}
