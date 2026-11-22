import { h, fmt } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { barList } from "../charts.js";
import { pageHead, noData } from "./common.js";
import { latestPanel } from "./latest.js";
import { ADMIN, appName as app } from "./names.js";

const kind = (w) => (ADMIN.has(w) ? "Security & admin" : "People-facing apps");

// The Purview audit feed is how this tool sees what people do in Teams, Exchange, SharePoint, OneDrive, Copilot and the other Microsoft 365 apps.
export async function render(ctx) {
  const pur = await api.data("purview");
  const root = h("div", {}, pageHead("Microsoft 365 app activity", "What people did in Teams, Exchange, SharePoint, OneDrive, Copilot and the other Microsoft 365 apps, read from the Purview audit log."));
  root.append(await latestPanel("m365"));
  if (!pur?.audit) return root.append(noData(ctx, "purview", "The audit log")), root;
  const a = pur.audit;

  // Per-app totals: the newer collector sends byWorkload with people counts; older data only has the raw counts.
  const apps = a.byWorkload || Object.entries(a.workloadsSeen || {}).map(([workload, events]) => ({ workload, events, users: null })).sort((x, y) => y.events - x.events);
  const detail = new Set((a.byOperation || []).map((o) => o.workload));
  const noDetail = apps.filter((x) => !detail.has(x.workload)).map((x) => app(x.workload));
  const types = a.contentTypes || ["Audit.General"];

  if (!types.includes("Audit.Exchange") || !types.includes("Audit.SharePoint")) {
    root.append(h("div", { class: "banner info", text: "Exchange, SharePoint and OneDrive are not in this data yet: they come from separate audit feeds (Audit.Exchange and Audit.SharePoint). The next sync of the purview module reads them, and Microsoft can take up to 12 hours after the first request before those feeds have content." }));
  }
  if (noDetail.length) {
    root.append(h("div", { class: "banner info", text: `Operations and recent activity are kept only for ${[...detail].map(app).join(", ") || "no apps"}. Totals above cover every app seen. To keep the detail for all apps, set modules.purview.workloads to [] in config/powerplatform.json (a restart is needed).` }));
  }
  if (a.truncated) root.append(h("div", { class: "banner info", text: "The audit read hit its blob limit (modules.purview.maxBlobs), so counts are a sample of the period, not the full total." }));

  root.append(h("div", { class: "grid g-2" },
    card(`Activity by app`, `${fmt.n(apps.length)} apps, ${fmt.n(apps.reduce((n, x) => n + x.events, 0))} events`,
      barList(apps.slice(0, 12).map((x) => ({ label: app(x.workload), value: x.events })), { warm: true })),
    card("Apps seen in the audit log", "", dataTable({
      rows: apps, csvName: "m365-apps", pageSize: 12, searchText: (r) => `${app(r.workload)} ${r.workload}`,
      filters: [{ key: "kind", label: "Kind", get: (r) => kind(r.workload), values: ["People-facing apps", "Security & admin"] }],
      columns: [
        { key: "workload", label: "App", render: (r) => app(r.workload), sort: (r) => app(r.workload), csv: (r) => app(r.workload) },
        { key: "id", label: "Audit name", render: (r) => r.workload, csv: (r) => r.workload },
        { key: "events", label: "Events", num: true },
        { key: "users", label: "People", num: true, render: (r) => (r.users == null ? "-" : fmt.n(r.users)) },
      ] }))));

  if (a.byOperation?.length) {
    root.append(h("div", { class: "section" }, h("h2", { text: "Operations" }), dataTable({
      rows: a.byOperation, csvName: "m365-operations", pageSize: 15, searchText: (r) => `${app(r.workload)} ${r.operation}`,
      filters: [{ key: "workload", label: "App", get: (r) => app(r.workload) }],
      columns: [{ key: "workload", label: "App", render: (r) => app(r.workload), sort: (r) => app(r.workload) }, { key: "operation", label: "Operation" }, { key: "count", label: "Events", num: true }] })));
  }
  if (a.recent?.length) {
    root.append(h("div", { class: "section" }, h("h2", { text: `Recent activity (latest ${a.recent.length})` }), dataTable({
      rows: a.recent, csvName: "m365-recent", pageSize: 15, searchText: (r) => Object.values(r).join(" "),
      filters: [{ key: "workload", label: "App", get: (r) => app(r.workload) }],
      columns: [{ key: "time", label: "Time", render: (r) => fmt.dt(r.time), sort: (r) => r.time },
        { key: "workload", label: "App", render: (r) => app(r.workload), sort: (r) => app(r.workload) },
        { key: "operation", label: "Operation" }, { key: "user", label: "User" }, { key: "ip", label: "IP" }, { key: "result", label: "Result" }] })));
  }
  return root;
}

function card(title, sub, body) {
  return h("div", { class: "card" }, h("h3", {}, title, sub ? h("span", { class: "sub", text: sub }) : null), body);
}
