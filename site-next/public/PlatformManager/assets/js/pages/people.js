import { h, fmt, pill, icon } from "../dom.js";
import { api } from "../api.js";
import { dataTable, openDrawer } from "../ui.js";
import { barList, stackedColumns } from "../charts.js";
import { pageHead, noData } from "./common.js";
import { latestPanel } from "./latest.js";
import { peopleTable } from "./peopleusage.js";
import { productSearch } from "./personuse.js";

export async function licensing(ctx) {
  const lic = await api.data("licensing");
  const root = h("div", {}, pageHead("Licensing", "Power Automate / Power Apps / Dataverse licences and who holds them."));
  if (!lic) return root.append(noData(ctx, "licensing", "Licence data")), root;
  if (!lic.signInActivity) root.append(h("div", { class: "banner info" }, "Last sign-in is unavailable: grant AuditLog.Read.All (and Entra ID P1) to flag inactive licence holders."));
  root.append(h("div", { class: "grid g-3" }, lic.skus.map((s) => {
    const pct = s.purchased ? Math.min(100, (s.assigned / s.purchased) * 100) : 0;
    return h("div", { class: "card" }, h("h3", {}, icon("license"), s.sku), h("div", { class: "muted", text: s.plans.join(", ") }),
      h("div", { class: "skuline" }, h("div", { class: "top" }, h("span", { text: `${fmt.n(s.assigned)} assigned` }), h("span", { text: `${fmt.n(s.purchased)} purchased` })),
        h("div", { class: "progress" }, h("div", { class: pct > 90 ? "hot" : "", style: { width: pct + "%" } }))));
  })));
  root.append(h("div", { class: "section" }, h("h2", { text: `Licence holders (${fmt.n(lic.users.length)} of ${fmt.n(lic.totalUsers)} users)` }),
    dataTable({
      rows: lic.users, csvName: "licensed-users", initialSort: "lastSignIn",
      searchText: (r) => [r.name, r.upn, r.dept, r.skus.join(" "), r.plans.join(" ")].join(" "),
      filters: [{ key: "tier", label: "Tier" }, { key: "dept", label: "Department" },
        { key: "inactive", label: "Activity", get: (r) => (r.inactive ? "Inactive" : "Active"), values: ["Active", "Inactive"] },
        { key: "enabled", label: "Account", get: (r) => (r.enabled ? "Enabled" : "Disabled"), values: ["Enabled", "Disabled"] }],
      columns: [
        { key: "name", label: "Name" }, { key: "upn", label: "User" }, { key: "dept", label: "Department" },
        { key: "tier", label: "Tier", render: (r) => pill(r.tier, r.tier.startsWith("Premium") ? "warn" : r.tier.startsWith("Free") ? "info" : "") },
        { key: "flow", label: "Flow", render: (r) => (r.flow ? "Yes" : "-"), csv: (r) => (r.flow ? "Yes" : "No") },
        { key: "apps", label: "Apps", render: (r) => (r.apps ? "Yes" : "-"), csv: (r) => (r.apps ? "Yes" : "No") },
        { key: "skus", label: "SKUs", render: (r) => r.skus.join(", "), csv: (r) => r.skus.join("; ") },
        { key: "lastSignIn", label: "Last sign-in", render: (r) => (r.inactive ? pill(r.lastSignIn ? fmt.date(r.lastSignIn) : "never", "warn") : fmt.date(r.lastSignIn)) },
        { key: "enabled", label: "Account", render: (r) => pill(r.enabled ? "Enabled" : "Disabled", r.enabled ? "" : "risk"), csv: (r) => (r.enabled ? "Enabled" : "Disabled") },
      ],
      onRow: (r) => openDrawer(r.name, [["User", r.upn], ["Department", r.dept], ["Title", r.title], ["Tier", r.tier], ["SKUs", r.skus.join(", ")],
        ["Service plans", r.plans.join(", ")], ["Last sign-in", fmt.dt(r.lastSignIn)], ["Account", r.enabled ? "Enabled" : "Disabled"], ["Guest", r.guest ? "Yes" : "No"]]),
    })));
  return root;
}

function section(title, sub, body) {
  return h("div", { class: "card" }, h("h3", {}, title, sub ? h("span", { class: "sub", text: sub }) : null), body);
}

export async function usage(ctx) {
  const [us, dv] = await Promise.all(["usage", "dataverse"].map((m) => api.data(m)));
  const root = h("div", {}, pageHead("Usage", "Power Apps and Power Automate portal sign-ins and flow runs."));
  const notes = h("div");
  const grid = h("div", { class: "grid g-2" });
  root.append(notes, grid);

  if (us) {
    grid.append(section("Portal sign-ins per day", `${fmt.n(us.signIns)} in ${us.days} days${us.truncated ? " (capped)" : ""}`, stackedColumns(us.perDay, us.labels)));
    grid.append(section("Most active users", "by sign-ins", dataTable({
      rows: us.topUsers, csvName: "top-users", pageSize: 10, searchText: (r) => r.upn + " " + r.name,
      columns: [{ key: "name", label: "User", render: (r) => r.name || r.upn }, ...us.labels.map((l) => ({ key: l, label: l, num: true, render: (r) => r[l] || 0 })), { key: "total", label: "Total", num: true }] })));
  } else notes.append(noData(ctx, "usage", "Sign-in usage"));

  if (dv) {
    dv.environments.forEach((e) => grid.append(section(`Flow runs: ${e.envName}`, `${fmt.n(e.runs)} runs, ${dv.days} days`, h("div", {},
      barList(Object.entries(e.byStatus).map(([label, value]) => ({ label, value }))),
      dataTable({ rows: e.topFlows, csvName: "flow-runs", pageSize: 10, columns: [{ key: "name", label: "Flow" }, { key: "runs", label: "Runs", num: true }, { key: "failed", label: "Failed", num: true }] })))));
  }
  root.append(h("div", { class: "section" }, h("h2", { text: "People" }), productSearch("powerplatform"), await peopleTable("powerplatform", "power-platform-usage")));
  return root;
}

export async function powerBi(ctx) {
  const pbi = await api.data("powerbi");
  const root = h("div", {}, pageHead("Power BI & Fabric activity", "Workspace activity and capacities from the Power BI admin API."));
  root.append(await latestPanel("powerbi"));
  if (!pbi) return root.append(noData(ctx, "powerbi", "Power BI activity")), root;
  root.append(h("div", { class: "grid g-2" },
    section("Activity", `${fmt.n(pbi.activities)} events, ${fmt.n(pbi.workspaces)} workspaces`,
      barList(pbi.byActivity.slice(0, 10).map((o) => ({ label: o.activity, value: o.count })))),
    section("Capacities", "", dataTable({ rows: pbi.capacities, csvName: "capacities", columns: [
      { key: "name", label: "Capacity" }, { key: "sku", label: "SKU" }, { key: "state", label: "State" }, { key: "region", label: "Region" }] }))));
  return root;
}
