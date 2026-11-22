import { h, fmt } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { barList } from "../charts.js";
import { pageHead, noData } from "./common.js";

const kpi = (label, value, note) => h("div", { class: "card kpi", style: { cursor: "default" } }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note", text: note }));
const card = (title, sub, body) => h("div", { class: "card" }, h("h3", {}, title, sub ? h("span", { class: "sub", text: sub }) : null), body);
const money = (cur, v) => `${cur} ${fmt.n(Math.round(v))}`;
const gb = (v) => (v == null ? "-" : `${fmt.n(Math.round(v * 10) / 10)} GB`);
const monthLabel = (m) => { const d = new Date(`${m}-01T00:00:00`); return isNaN(d) ? m : d.toLocaleDateString(undefined, { month: "short", year: "numeric" }); };

const note = (text) => h("div", { class: "banner info", text });

// Pay-as-you-go lines from Azure Cost Management, as a table.
function lineTable(cs, rows, csvName) {
  return dataTable({
    rows, csvName, pageSize: 15, searchText: (r) => `${r.service} ${r.category}`,
    columns: [{ key: "service", label: "Service" }, { key: "category", label: "Meter category" },
      { key: "cost", label: `Cost (${cs.currency})`, num: true, render: (r) => fmt.n(Math.round(r.cost)), sort: (r) => r.cost },
      ...cs.byMonth.map((m) => ({ key: m.month, label: monthLabel(m.month), num: true, render: (r) => (r.byMonth[m.month] == null ? "-" : fmt.n(Math.round(r.byMonth[m.month]))), sort: (r) => r.byMonth[m.month] ?? 0 }))],
  });
}

// What Microsoft Copilot costs: licences held (from the directory) and Copilot Studio pay-as-you-go (from Azure).
export async function copilot(ctx) {
  const root = h("div", {}, pageHead("Microsoft Copilot spend", "What Copilot costs: licences held, and Copilot Studio pay-as-you-go billed to Azure."));
  const [people, cs] = await Promise.all([api.peopleUsage("copilot"), api.data("costmgmt").catch(() => null)]);
  const s = people.available ? people.spend : null;
  const studio = cs?.copilotStudio;
  root.append(note("Microsoft does not report tokens or Copilot Credits per person or per prompt for Microsoft 365 Copilot. Licence spend is the licence price; Copilot Studio pay-as-you-go is the only usage-based Copilot cost in Azure. Prepaid Copilot Credits are in the Power Platform admin center (Licensing, Copilot Studio) and are not collected."));
  root.append(h("div", { class: "grid g-kpi" },
    ...(s ? [kpi("Licences held", fmt.n(s.licensed), `${money(s.currency, s.monthly)} a month at ${s.currency} ${s.pricePerLicence} each`),
      kpi("Licence spend", `${money(s.currency, s.annual)} a year`, s.priceSource),
      kpi("Idle licences", fmt.n(s.idle), `${money(s.currency, s.idleAnnual)} a year on licences with no use in the audit period`)] : []),
    ...(studio ? [kpi("Copilot Studio pay-as-you-go", money(cs.currency, studio.cost), `over the last ${cs.days} days`),
      kpi("Copilot Credits implied", fmt.n(studio.credits), `cost divided by ${cs.currency} ${studio.creditUsd} a credit`)] : [])));
  if (!cs) root.append(noData(ctx, "costmgmt", "Azure Cost Management"));
  else {
    const lines = cs.lines.filter((l) => /copilot/i.test(`${l.service} ${l.category}`));
    root.append(h("div", { class: "grid g-2" },
      card("Copilot Studio by month", "pay-as-you-go cost", studio.byMonth.length ? barList(studio.byMonth.map((m) => ({ label: monthLabel(m.month), value: Math.round(m.cost) })), { warm: true }) : h("div", { class: "empty", text: "No Copilot pay-as-you-go cost in the period." })),
      card("Copilot Credits by month", "implied", studio.byMonth.length ? barList(studio.byMonth.map((m) => ({ label: monthLabel(m.month), value: m.credits || 0 }))) : h("div", { class: "empty", text: "None." }))));
    if (lines.length) root.append(h("div", { class: "section" }, h("h2", { text: "Copilot lines in Azure" }), lineTable(cs, lines, "copilot-spend")));
    for (const sc of cs.scopes.filter((x) => x.error)) root.append(h("div", { class: "banner warn", text: `${sc.scope}: ${sc.error}` }));
  }
  return root;
}

// Dataverse storage by environment, and the other Power Platform pay-as-you-go lines.
export async function capacity(ctx) {
  const root = h("div", {}, pageHead("Spend & capacity", "Dataverse storage by environment, and what Power Platform pay-as-you-go cost in Azure."));
  const [cap, cs] = await Promise.all([api.data("capacity").catch(() => null), api.data("costmgmt").catch(() => null)]);
  root.append(note("Tenant storage entitlements and per-table detail are in the Power Platform admin center (Licensing, Dataverse). Azure Cost Management shows only what is billed to an Azure subscription: prepaid licences and capacity are not in it."));
  if (!cap) root.append(noData(ctx, "capacity", "Dataverse storage"));
  else {
    const t = cap.totals;
    if (!t.reported) root.append(h("div", { class: "banner warn", text: (cap.warnings || [])[0] || "No environment returned storage figures." }));
    root.append(h("div", { class: "grid g-kpi" }, kpi("Database", gb(t.database), `${fmt.n(t.reported)} of ${fmt.n(t.environments)} environments reported`), kpi("File", gb(t.file), "Dataverse file storage"), kpi("Log", gb(t.log), "audit and trace logs")));
    const rows = cap.environments.filter((e) => e.reported);
    if (rows.length) {
      root.append(h("div", { class: "grid g-2" }, card("Largest environments", "database + file + log, GB", barList(rows.slice(0, 10).map((e) => ({ label: e.name, value: Math.round(e.total * 10) / 10 })), { warm: true })),
        card("By storage type", "tenant total, GB", barList([{ label: "Database", value: t.database }, { label: "File", value: t.file }, { label: "Log", value: t.log }]))));
      root.append(h("div", { class: "section" }, h("h2", { text: "Environments" }), dataTable({
        rows, csvName: "dataverse-storage", pageSize: 15, searchText: (r) => `${r.name} ${r.type}`,
        columns: [{ key: "name", label: "Environment" }, { key: "type", label: "Type" }, { key: "database", label: "Database", num: true, render: (r) => gb(r.database), sort: (r) => r.database ?? 0 },
          { key: "file", label: "File", num: true, render: (r) => gb(r.file), sort: (r) => r.file ?? 0 }, { key: "log", label: "Log", num: true, render: (r) => gb(r.log), sort: (r) => r.log ?? 0 },
          { key: "total", label: "Total", num: true, render: (r) => gb(r.total), sort: (r) => r.total }] })));
    }
  }
  if (!cs) root.append(noData(ctx, "costmgmt", "Azure Cost Management"));
  else {
    root.append(h("div", { class: "grid g-kpi" }, kpi("Power Platform and Copilot in Azure", money(cs.currency, cs.matched), `last ${cs.days} days, of ${money(cs.currency, cs.total)} across ${fmt.n(cs.scopes.length)} scope(s)`)));
    if (cs.lines.length) root.append(h("div", { class: "section" }, h("h2", { text: "Pay-as-you-go lines" }), lineTable(cs, cs.lines, "power-platform-pay-as-you-go")));
    for (const sc of cs.scopes.filter((x) => x.error)) root.append(h("div", { class: "banner warn", text: `${sc.scope}: ${sc.error}` }));
  }
  return root;
}
