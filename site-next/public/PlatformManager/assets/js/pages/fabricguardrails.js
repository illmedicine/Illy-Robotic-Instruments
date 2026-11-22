import { h, fmt, pill } from "../dom.js";
import { dataTable } from "../ui.js";
import { empty, field, fill, kpi, note, num, tabs, date } from "./widgets.js";
import { DIRECT_LAKE_GUARDRAILS, ISOLATION_RULE, buildMigrationPlan, capacityLadder, jobBudget, planIsolation } from "../analyze/engines/fabric.js";
import { GOVERNANCE_GATES, ISOLATION_CHEAPER, ISOLATION_POINTS, MODEL_STANDARDS, MONITORING, SCALING_NOTES } from "../analyze/data/guardrails.js";
import { getProfile } from "../analyze/org.js";

const usd = (v) => (typeof v === "number" ? "$" + fmt.n(Math.round(v)) : "-");
const src = (s) => pill(s === "microsoft" ? "Microsoft" : "proposed", s === "microsoft" ? "info" : "warn");
const shortDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-");

function isolationPanel(plan, viewers) {
  const share = num(0, { max: "90", "aria-label": "Background share of CU" });
  const hours = num(12, { min: "1", max: "24", step: "1", "aria-label": "ETL hours per day" });
  const out = h("div", {});
  const paint = () => {
    const r = planIsolation(plan, { backgroundSharePct: Number(share.value) || 0, etlHoursPerDay: Number(hours.value) || 12, viewers });
    if (!r.known) {
      out.replaceChildren(empty("Enter the share of capacity used by background work.",
        "Read it from the Capacity Metrics app: refreshes, Spark, pipelines and Dataflows as a share of total CU. Without it, isolation cannot be priced."));
      return;
    }
    const tone = { separate: "error", consider: "demo", shared: "info" }[r.recommendation];
    const text = { separate: `Background work is ${r.sharePct}% of CU, at or above the ${ISOLATION_RULE.separateAtPct}% line: separate the capacities.`,
      consider: `Background work is ${r.sharePct}% of CU, above ${ISOLATION_RULE.considerAtPct}%: consider separating, and turn on alerts first.`,
      shared: `Background work is ${r.sharePct}% of CU, under ${ISOLATION_RULE.considerAtPct}%: a shared capacity is reasonable.` }[r.recommendation];
    out.replaceChildren(note(text, tone),
      h("div", { class: "grid g-kpi" },
        kpi("One shared capacity", `${r.shared.sku}: ${usd(r.shared.annualUsd)}`, "a year, reserved"),
        kpi("Split into three", usd(r.split.annualUsd), `${r.provisionedCu.split} CU provisioned`),
        kpi("Extra cost of splitting", usd(r.extraUsd), r.extraUsd > 0 ? "buys a hard boundary" : "cheaper than shared")),
      dataTable({
        rows: [
          { tier: "Production reporting", sku: r.split.prod.sku, annualUsd: r.split.prod.annualUsd, basis: `reserved. ${r.split.prod.note || ""}` },
          { tier: "Engineering (ETL, Spark, Dataflows)", sku: r.split.etl.sku, annualUsd: r.split.etl.annualUsd, basis: `pay-as-you-go, ${r.split.etl.hours} h a day` },
          { tier: "Dev and test", sku: r.split.dev.sku, annualUsd: r.split.dev.annualUsd, basis: `pay-as-you-go, ${r.split.dev.hoursPerMonth} h a month` },
        ],
        csvName: "fabric-isolation", pageSize: 10,
        columns: [{ key: "tier", label: "Tier" }, { key: "sku", label: "Size" }, { key: "annualUsd", label: "Annual", num: true, render: (x) => usd(x.annualUsd) }, { key: "basis", label: "Basis" }],
      }));
  };
  paint();
  return h("div", {},
    h("div", { class: "toolbar" }, field("Background share of CU %", Object.assign(share, { oninput: paint })), field("Engineering hours per day", Object.assign(hours, { oninput: paint }))),
    out,
    h("h4", { text: "What Microsoft says, and what is proposed" }),
    h("ul", {}, ISOLATION_POINTS.map((p) => h("li", {}, src(p.source), " ", p.text))),
    h("h4", { text: "Cheaper ways to get most of the benefit" }), h("ul", {}, ISOLATION_CHEAPER.map((t) => h("li", { text: t }))));
}

function alertsPanel(plan, cu) {
  const budget = jobBudget(cu);
  return h("div", {},
    h("p", { class: "muted", text: `Alert and action ladder for ${cu} CU. The first and last rungs are proposals to adopt or change; the throttle stages are Microsoft's.` }),
    dataTable({
      rows: capacityLadder(cu), csvName: "fabric-alert-ladder", pageSize: 10,
      columns: [{ key: "usage", label: "Trigger" }, { key: "cu", label: "CU", num: true, render: (x) => fmt.n(x.cu) },
        { key: "source", label: "Source", render: (x) => src(x.source) }, { key: "action", label: "Action" }],
    }),
    h("p", {}, h("b", { text: "Job budget: " }), `a single job should not use more than ${budget.pct}% of a day's capacity (${fmt.n(budget.singleJobCuHours)} of ${fmt.n(budget.dailyCuHours)} CU hours) without sign-off.`),
    h("h4", { text: "Monitoring" }),
    dataTable({ rows: MONITORING, csvName: "fabric-monitoring", pageSize: 10, columns: [{ key: "name", label: "Tool" }, { key: "source", label: "Source", render: (x) => src(x.source) }, { key: "use", label: "Use" }] }),
    h("h4", { text: "Scaling" }), h("ul", {}, SCALING_NOTES.map((n) => h("li", {}, src(n.source), " ", n.text))));
}

function runbookPanel(estimatedDays, renewalDate) {
  const when = date(renewalDate || getProfile().renewalDate || "", { "aria-label": "Premium renewal date" });
  const out = h("div", {});
  const paint = () => {
    const r = buildMigrationPlan({ renewalDate: when.value, estimatedDays });
    fill(out,
      !when.value ? note("Enter the Premium renewal date to back-schedule the runbook and check it against the change freeze.", "info") : null,
      r.pastRenewal ? note("The plan finishes after the renewal date. Start earlier, or negotiate a longer overlap in writing.", "error") : null,
      ...r.freezeConflicts.map((c) => note(`${c.step} would start ${shortDate(c.wouldStart)}, inside the open-enrolment / year-end change freeze, so it moves to ${shortDate(c.movedTo)}.`, "demo")),
      dataTable({
        rows: r.steps, csvName: "fabric-migration-runbook", pageSize: 20,
        columns: [{ key: "name", label: "Step" }, { key: "days", label: "Days", num: true }, { key: "from", label: "Start", render: (x) => shortDate(x.from) },
          { key: "to", label: "End", render: (x) => shortDate(x.to) }, { key: "detail", label: "What happens" }],
      }),
      h("p", { class: "muted", text: `${r.totalDays} working days in total, finishing at least 14 days before renewal.` }));
  };
  paint();
  return h("div", {}, h("div", { class: "toolbar" }, field("Premium renewal date", Object.assign(when, { onchange: paint }))), out);
}

function standardsPanel(sku) {
  const g = DIRECT_LAKE_GUARDRAILS[sku];
  return h("div", {},
    g ? h("div", { class: "card" }, h("h3", { text: `Direct Lake limits for ${sku}` }), h("p", {},
      `Up to ${fmt.n(g.files)} Parquet files and ${fmt.n(g.rowGroups)} row groups per table, ${fmt.n(g.rowsM)} million rows per table, ${g.modelGb ? `${g.modelGb} GB model size` : "no model size limit"}, ${g.memGb} GB memory. Keep tables under 80% of each limit.`)) : null,
    ...MODEL_STANDARDS.map((grp) => h("div", { class: "card", style: { marginBottom: "10px" } }, h("h3", { text: grp.group }),
      h("ul", {}, grp.items.map((i) => h("li", {}, src(i.source), " ", i.rule, h("small", { class: "muted", style: { display: "block" }, text: `Check: ${i.check}` })))))),
    h("div", { class: "card" }, h("h3", { text: "Gates before anything reaches production capacity" }),
      dataTable({ rows: GOVERNANCE_GATES, csvName: "fabric-governance-gates", pageSize: 20, columns: [{ key: "gate", label: "Gate" }, { key: "requirement", label: "Requirement" }, { key: "evidence", label: "Evidence" }] })));
}

export function guardrails(plan, { viewers = 0, renewalDate = "" } = {}) {
  const sized = plan.scenarios.find((s) => s.id === "rightsized") || plan.scenarios[0];
  const migDays = plan.migration ? plan.migration.estimatedDays : 20;
  return h("div", { class: "card" }, h("h3", {}, "Capacity guardrails", h("span", { class: "sub", text: `sized on ${sized.fSku}` })),
    tabs({
      "Workload isolation": () => isolationPanel(plan, viewers),
      "Alerts and budgets": () => alertsPanel(plan, sized.cu),
      "Migration runbook": () => runbookPanel(migDays, renewalDate),
      "Model standards": () => standardsPanel(sized.fSku),
    }));
}
