import { h, icon, fmt } from "../dom.js";
import { dataTable } from "../ui.js";
import { empty, field, fill, filePicker, finding, kpi, money, note, select } from "./widgets.js";
import { readFileText } from "../analyze/core.js";
import { analyzePowerBI, buildSuggestions, parseBundle } from "../analyze/engines/pbi.js";

const FILES = "users.csv, skus.csv, pbi-capacities.csv, pbi-workspaces.csv, pbi-activity.csv, pbi-workspace-activity.csv and export-info.json";

/**
 * The Power BI export bundle (scripts/Export-PowerBIFabricData.ps1): who really views and creates,
 * who already holds Pro, which workspaces are dormant. `onApply` receives the numbers for the planner.
 */
export function estateSection(onApply) {
  let bundle = null, analysis = null, target = "";
  const out = h("div", {}, empty("No Power BI export loaded.",
    `Run scripts\\Export-PowerBIFabricData.ps1 in Azure Cloud Shell, unzip the result, and choose its files here (${FILES}). Read in this browser; nothing is uploaded.`));

  async function onFiles(files) {
    try {
      const named = {};
      for (const f of files) named[f.name] = await readFileText(f);
      bundle = parseBundle(named);
      target = "";
      paint();
    } catch (e) {
      out.replaceChildren(note(e.message, "error"));
    }
  }

  function paint() {
    if (!bundle) return;
    try {
      analysis = analyzePowerBI(bundle, { capacityName: target });
    } catch (e) {
      analysis = null;
      fill(out, ...bundle.issues.map((m) => note(m, "demo")), note(e.message, "error"));
      return;
    }
    const a = analysis, u = a.usage, c = a.cleanup, w = a.workspaces;
    const capSel = select(a.capacities.map((x) => [x.name, `${x.name} (${x.sku || "?"}${x.region ? ", " + x.region : ""})`]), a.target.name,
      { "aria-label": "Capacity to migrate", onchange: (e) => { target = e.target.value; paint(); } });
    fill(out,
      ...bundle.issues.map((m) => note(m, "demo")),
      ...a.warnings.map((m) => note(m, "demo")),
      h("div", { class: "toolbar" }, field("Capacity being migrated", capSel),
        h("button", { class: "btn primary", type: "button", onclick: () => onApply(a.planInputs, a) }, icon("check"), "Use these numbers in the planner")),
      h("div", { class: "grid g-kpi" },
        kpi("Real viewers", fmt.n(u.viewers), `${fmt.n(u.viewersWithPro)} already hold Pro`),
        kpi("Real creators", fmt.n(u.creators), `${fmt.n(u.creatorsWithPro)} already hold Pro`, u.creatorsWithoutPro.length ? "warn" : ""),
        kpi("Creators without Pro", fmt.n(u.creatorsWithoutPro.length), "licence before the move"),
        kpi("Licensed users", a.hasUsers ? fmt.n(a.licences.licensed) : "-", a.hasUsers ? `${fmt.n(a.licences.viaSuite)} get Pro through a suite` : "users.csv not loaded"),
        kpi("Removable Pro / PPU", fmt.n(c.items.length), `${money(c.alwaysUsd)} a year, up to ${money(c.annualUsd)} on F64+`),
        kpi("Dormant workspaces", w.dormantKnown ? `${fmt.n(w.dormant)} of ${fmt.n(w.onCapacity)}` : "-", w.dormantKnown ? "no activity in the window" : "no workspace activity file")),
      u.creatorsWithoutPro.length ? h("div", { class: "card" }, h("h3", { text: "Creators without a Pro-capable licence" }), dataTable({
        rows: u.creatorsWithoutPro, csvName: "creators-without-pro", pageSize: 25, searchText: (x) => `${x.upn} ${x.name}`,
        columns: [{ key: "upn", label: "User" }, { key: "name", label: "Name" }, { key: "known", label: "In users.csv", render: (x) => (x.known ? "yes" : "no (guest or renamed)") }],
      })) : null,
      c.items.length ? h("div", { class: "card" }, h("h3", { text: "Standalone Pro and Premium Per User licences not needed" }), dataTable({
        rows: c.items, csvName: "removable-pro-licences", pageSize: 25, searchText: (x) => `${x.upn} ${x.product} ${x.reason}`, initialSort: "annualUsd",
        filters: [{ key: "product", label: "Licence" }],
        columns: [{ key: "upn", label: "User" }, { key: "product", label: "Licence" }, { key: "reason", label: "Why" },
          { key: "annualUsd", label: "A year", num: true, render: (x) => money(x.annualUsd) }],
      })) : null,
      h("div", { class: "card" }, h("h3", { text: "Capacities in the export" }), dataTable({
        rows: a.capacities, csvName: "pbi-capacities", pageSize: 25,
        columns: [{ key: "name", label: "Capacity" }, { key: "sku", label: "SKU" }, { key: "region", label: "Region" }, { key: "state", label: "State" },
          { key: "workspaces", label: "Workspaces", num: true, render: (x) => fmt.n(x.workspaces) }],
      })),
      w.dormantSample.length ? h("p", { class: "muted", text: `Examples of dormant workspaces: ${w.dormantSample.join(", ")}` }) : null);
  }

  /** Findings for the current plan, shown under the planner results. */
  function suggestions(plan, ctx) {
    if (!analysis) return null;
    const items = buildSuggestions(analysis, plan, plan.migration, ctx);
    return h("div", { class: "card" }, h("h3", { text: "What the export suggests" }), ...items.map(finding));
  }

  return { view: h("div", { class: "card" }, h("h3", {}, "Power BI estate", h("span", { class: "sub", text: "optional: from the export script" })),
    filePicker("Export files (.csv, .json)", ".csv,.json,.txt", onFiles, true), out), suggestions, hasData: () => Boolean(analysis) };
}
