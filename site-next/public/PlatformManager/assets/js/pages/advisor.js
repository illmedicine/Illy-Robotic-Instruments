import { h, icon, pill } from "../dom.js";
import { pageHead } from "./common.js";
import { kpi, money, note, pct, select } from "./widgets.js";
import { advise, results, BENCHMARKS } from "../analyze/engines/advisor.js";
import { ROLES, getProfile, saveProfile, roleById, activeConstraints } from "../analyze/org.js";
import { parseLocalDate } from "../analyze/core.js";

const EVIDENCE = { measured: ["measured", "ok"], profile: ["from profile", "info"], benchmark: ["benchmark", "warn"] };
const evidence = (e) => pill(...(EVIDENCE[e] || [e, ""]));
const link = (hash, label) => h("a", { href: "#" + hash, text: label });

function evidenceRow(ok, label, hash, hint) {
  return h("div", { style: { display: "flex", gap: "8px", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" } },
    pill(ok ? "loaded" : "not loaded", ok ? "ok" : "warn"), h("span", { text: label }), ok ? null : h("span", { style: { marginLeft: "auto" } }, link(hash, hint)));
}

export async function render() {
  const body = h("div", {});
  const lens = select(ROLES.map((r) => [r.id, r.label]), getProfile().role, {
    "aria-label": "Audience lens", onchange: () => { saveProfile({ role: lens.value }); paint(); },
  });

  function paint() {
    const a = advise();
    const p = a.ctx.profile;
    const role = roleById(lens.value);
    const lev = a.leverageScore;
    const top = a.levers.filter((l) => l.highUsd > 0).sort((x, y) => y.highUsd - x.highUsd).slice(0, 3);
    const decisions = [];
    if (a.daysToDeadline != null && a.daysToDeadline >= 0) decisions.push(`Confirm all account decisions are returned by ${parseLocalDate(p.responseDeadline).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`);
    if (!a.ctx.completeness.ready) decisions.push("Complete the Workspace so figures use your own data instead of benchmarks.");
    if (!a.inputs.usedWaste) decisions.push("Load tenant licence data on Licence waste to replace the shelfware benchmark with a measured figure.");
    if (!a.inputs.usedFabric) decisions.push("Run the Fabric planner before any Power BI Premium capacity commitment.");
    decisions.push("Approve the negotiation asks and who owns each one.");
    const con = results.get("contracts");
    const act = activeConstraints(p);

    body.replaceChildren(
      ...a.warnings.map((w) => note(w, "demo")),
      h("div", { class: "grid g-kpi" },
        kpi("Leverage score", `${lev}/100`, lev >= 65 ? "strong position" : lev >= 45 ? "moderate position" : "weak position", lev < 45 ? "warn" : ""),
        kpi("Modelled savings a year", a.savings.high ? `${money(a.savings.low)} to ${money(a.savings.high)}` : "-",
          a.savingsOfSpend ? `${pct(a.savingsOfSpend.low, 1)} to ${pct(a.savingsOfSpend.high, 1)} of spend` : "enter spend in Workspace"),
        kpi("Backed by measured data", pct(a.savings.evidenceShare), `${money(a.savings.measuredHigh)} of the high case`),
        kpi("To response deadline", a.daysToDeadline != null ? (a.daysToDeadline >= 0 ? `${a.daysToDeadline} days` : "passed") : "-", a.daysToRenewal != null ? `${a.daysToRenewal} days to renewal` : "")),
      h("div", { class: "grid g-2" },
        h("div", { class: "card" }, h("h3", { text: `${role.label} summary` }), h("p", { class: "muted", text: role.lens }),
          role.id === "cfo" ? h("p", { text: `Annual spend ${money(a.totals.total)} (licences ${money(a.totals.licence)}, Azure ${money(a.totals.azure)}, support ${money(a.totals.support)}). Exposure over ${a.termYears} years: ${money(a.totals.total * a.termYears)}.` }) : null,
          h("h4", { text: "Biggest opportunities" }),
          top.length ? h("ol", { style: { paddingLeft: "18px" } }, top.map((l) => h("li", {}, h("b", { text: l.title }), ` up to ${money(l.highUsd)} a year `, evidence(l.evidence))))
            : h("p", { class: "muted", text: "Enter spend in Workspace to size opportunities." }),
          h("h4", { text: "Decisions needed" }), h("ul", { style: { paddingLeft: "18px" } }, decisions.map((d) => h("li", { text: d })))),
        h("div", { class: "card" }, h("h3", { text: "What this analysis is based on" }),
          evidenceRow(a.ctx.completeness.ready, "Organisation profile", "workspace", "Complete workspace"),
          evidenceRow(a.inputs.usedWaste, "Tenant licence data", "licencewaste", "Upload"),
          evidenceRow(a.inputs.usedFabric, "Fabric capacity plan", "fabric", "Run planner"),
          evidenceRow(a.inputs.usedDecisions, "Renewal decision export", "renewalposition", "Import"),
          evidenceRow(Boolean(con), "Contract review", "contracts", "Review a contract"),
          h("p", { class: "muted", text: `Environment applied: ${act.length} nuances.` }))),
      h("h3", { text: "Levers" }),
      ...a.levers.map((l) => h("div", { class: "card", style: { marginBottom: "10px" } },
        h("h3", {}, l.title, evidence(l.evidence), h("span", { class: "sub", text: l.noPrice ? "risk control" : l.highUsd ? `${money(l.lowUsd)} to ${money(l.highUsd)} a year` : "contract quality" })),
        h("p", { text: l.why }),
        l.asks && l.asks.length ? h("p", {}, h("b", { text: "Ask for: " }), l.asks.join("; ")) : null)),
      h("div", { class: "grid g-2" },
        h("div", { class: "card" }, h("h3", { text: "Timeline" }),
          a.timeline.length ? a.timeline.map((t) => h("p", {}, h("b", { text: `${t.when} days: ` }), t.what)) : h("p", { class: "muted", text: "Set the renewal date in Workspace to build a timeline." })),
        h("div", { class: "card" }, h("h3", { text: "Leverage windows" }),
          a.milestones.map((m) => h("div", { style: { display: "flex", justifyContent: "space-between", padding: "4px 0" } }, h("span", { text: m.label }), pill(m.strength, m.strength === "strongest" ? "warn" : "info"))),
          a.inChangeFreeze ? note("Today is inside the open-enrolment / year-end change freeze.", "demo") : null,
          h("h4", { text: "How the score is built" }),
          h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("span", { text: "Baseline" }), h("b", { text: "40" })),
          a.leverageNotes.map((n) => h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("span", { text: n.why }), h("b", { text: `${n.delta > 0 ? "+" : ""}${n.delta}` }))))),
      h("p", { class: "muted", text: `${a.caveat} ${BENCHMARKS.note}` }));
  }

  const view = h("div", {},
    pageHead("Renewal advisor",
      "Turns what the other pages measured, plus your profile, into negotiating levers with the evidence behind each one.",
      lens, h("button", { class: "btn", type: "button", onclick: () => window.print() }, icon("download"), "Print")),
    body);
  paint();
  return view;
}
