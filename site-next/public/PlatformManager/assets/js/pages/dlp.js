import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { dataTable, openDrawer, extLink } from "../ui.js";
import { pageHead, noData, makerFlow, makerApps } from "./common.js";

const CLS = { Business: "warn", "Non-business": "info", Blocked: "risk" };

export async function render(ctx) {
  const d = await api.dlp();
  const root = h("div", {}, pageHead("Data loss prevention", "Which policies apply where, and which flows and apps break them."));
  if (!d) return root.append(noData(ctx, "platform", "DLP policies")), root;

  const kpi = (label, value, note, bad) => h("div", { class: "card kpi" }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }),
    h("div", { class: "note" }, bad ? h("b", { text: note }) : note));
  const blockedUsed = d.matrix.filter((m) => Object.values(m.classes).includes("Blocked")).length;
  root.append(h("div", { class: "grid g-kpi" },
    kpi("Policies", fmt.n(d.policies.length), `${d.policies.filter((p) => p.scope === "OnlyEnvironments").length} scoped to chosen environments`),
    kpi("Environments covered", `${d.coverage.covered} / ${d.coverage.environments}`, d.coverage.uncovered.length ? `${d.coverage.uncovered.length} uncovered` : "all covered", d.coverage.uncovered.length > 0),
    kpi("Items breaking a policy", fmt.n(d.violatingItems), `${fmt.n(d.violationCount)} policy hits`, d.violatingItems > 0),
    kpi("Used connectors blocked somewhere", fmt.n(blockedUsed), "of the top 60 in use", blockedUsed > 0)));

  root.append(h("div", { class: "section" }, h("h2", { text: "Policies" }), dataTable({
    rows: d.policies, csvName: "dlp-policies", pageSize: 25, searchText: (r) => r.name,
    columns: [
      { key: "name", label: "Policy" },
      { key: "scope", label: "Scope", render: (r) => ({ OnlyEnvironments: "Only chosen environments", ExceptEnvironments: "All except " + r.listedEnvironments, AllEnvironments: "All environments" }[r.scope] || r.scope) },
      { key: "appliesTo", label: "Applies to", num: true, render: (r) => `${r.appliesTo} env` },
      { key: "default", label: "New connectors default", render: (r) => pill(r.default, CLS[r.default] || "") },
      { key: "Business", label: "Business", num: true, render: (r) => fmt.n(r.counts.Business), sort: (r) => r.counts.Business || 0 },
      { key: "Non-business", label: "Non-business", num: true, render: (r) => fmt.n(r.counts["Non-business"]), sort: (r) => r.counts["Non-business"] || 0 },
      { key: "Blocked", label: "Blocked", num: true, render: (r) => fmt.n(r.counts.Blocked), sort: (r) => r.counts.Blocked || 0 },
      { key: "modified", label: "Modified", render: (r) => fmt.date(r.modified) }] })));

  if ((d.unlistedConnectors || []).length) {
    root.append(h("div", { class: "section" }, h("div", { class: "card" }, h("h3", {}, icon("alert"), "Used connectors that no policy lists", h("span", { class: "sub", text: `${d.unlistedConnectors.length}` })),
      h("div", { class: "muted", text: "Usually Microsoft system connectors that DLP cannot block. They are not counted as violations. Confirm any you do not recognise." }),
      h("div", { class: "chips", style: { marginTop: "8px" } }, d.unlistedConnectors.map((u) => h("span", { class: "chip", text: `${fmt.connector(u.connector)} (${u.flows + u.apps})` }))))));
  }

  if (d.coverage.uncovered.length) {
    root.append(h("div", { class: "section" }, h("div", { class: "card" }, h("h3", {}, icon("alert"), "Environments with no DLP policy", h("span", { class: "sub", text: `${d.coverage.uncovered.length}` })),
      h("div", { class: "chips" }, d.coverage.uncovered.map((e) => h("span", { class: "chip", text: `${e.name} (${e.type})` }))))));
  }

  root.append(h("div", { class: "section" }, h("h2", { text: `Violations (${fmt.n(d.violationCount)}${d.violationsTruncated ? ", showing the first 3,000" : ""})` }),
    d.violations.length ? dataTable({
      rows: d.violations, csvName: "dlp-violations", searchText: (r) => [r.name, r.envName, r.policy, r.owner, r.connectors.join(" ")].join(" "),
      filters: [{ key: "policy", label: "Policy" }, { key: "reason", label: "Reason" }, { key: "kind", label: "Type" }, { key: "envName", label: "Environment" }],
      columns: [
        { key: "kind", label: "Type" }, { key: "name", label: "Name" }, { key: "envName", label: "Environment" }, { key: "owner", label: "Owner" },
        { key: "policy", label: "Policy" }, { key: "reason", label: "Reason", render: (r) => pill(r.reason, r.reason.startsWith("Uses") ? "risk" : "warn") },
        { key: "connectors", label: "Connectors", render: (r) => r.connectors.map((c) => fmt.connector(c)).join(", "), csv: (r) => r.connectors.join("; ") }],
      onRow: (r) => openDrawer(r.name, [["Type", r.kind], ["Environment", r.envName], ["Owner", r.owner], ["State", r.state], ["Policy", r.policy], ["Problem", r.reason],
        ["Connector classes", h("div", { class: "chips" }, Object.entries(r.classes).map(([c, k]) => pill(`${fmt.connector(c)}: ${k}`, CLS[k] || "")))]],
      [extLink(r.kind === "flow" ? makerFlow(r) : makerApps(r), r.kind === "flow" ? "Open in Power Automate" : "Open in Power Apps")]),
    }) : h("div", { class: "card empty", text: "No flows or apps break a policy (among those with connector data)." })));

  root.append(h("div", { class: "section" }, h("h2", { text: "Connector classification by policy (most used)" }), dataTable({
    rows: d.matrix, csvName: "dlp-connector-matrix", pageSize: 20, searchText: (r) => r.connector,
    columns: [{ key: "connector", label: "Connector", render: (r) => fmt.connector(r.connector) }, { key: "flows", label: "Flows", num: true }, { key: "apps", label: "Apps", num: true },
      ...d.policyNames.map((n) => ({ key: "p:" + n, label: n, render: (r) => pill(r.classes[n], CLS[r.classes[n]] || ""), sort: (r) => r.classes[n], csv: (r) => r.classes[n] }))] })));
  return root;
}
