import { h, fmt } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { barList } from "../charts.js";
import { pageHead, noData } from "./common.js";
import { appName } from "./names.js";
import { latestPanel } from "./latest.js";

function kpi(label, value, note) {
  return h("div", { class: "card kpi", style: { cursor: "default" } }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note", text: note }));
}

function card(title, sub, body) {
  return h("div", { class: "card" }, h("h3", {}, title, sub ? h("span", { class: "sub", text: sub }) : null), body);
}

// Activity for the audit workloads that make up one product, read from the Purview audit feed.
async function auditProduct(ctx, { title, sub, workloads, what, extra, product }) {
  const pur = await api.data("purview");
  const root = h("div", {}, pageHead(title, sub));
  root.append(await latestPanel(product));
  if (!pur?.audit) return root.append(noData(ctx, "purview", "The audit log")), root;
  const a = pur.audit, mine = new Set(workloads);
  const apps = (a.byWorkload || []).filter((x) => mine.has(x.workload));
  const ops = (a.byOperation || []).filter((o) => mine.has(o.workload));
  const recent = (a.recent || []).filter((r) => mine.has(r.workload));
  const events = apps.reduce((n, x) => n + x.events, 0);
  if (!(a.contentTypes || []).includes("Audit.SharePoint") && workloads.includes("SharePoint")) {
    root.append(h("div", { class: "banner info", text: "SharePoint and OneDrive events come from the Audit.SharePoint feed. The next sync of the purview module reads it, and Microsoft can take up to 12 hours after the first request before it has content." }));
  }
  if (a.truncated) root.append(h("div", { class: "banner info", text: "The audit read hit its blob limit (modules.purview.maxBlobs), so counts are a sample of the period, not the full total." }));
  const extras = extra ? await extra() : [];
  root.append(h("div", { class: "grid g-kpi" }, kpi("Events", fmt.n(events), `in the audit period, ${what}`),
    kpi("People", fmt.n(Math.max(0, ...apps.map((x) => x.users || 0))), "most active workload, distinct people"), ...extras));
  root.append(h("div", { class: "grid g-2" },
    card("Activity by app", `${fmt.n(apps.length)} workloads`, apps.length ? barList(apps.map((x) => ({ label: appName(x.workload), value: x.events })), { warm: true }) : h("div", { class: "empty", text: "No events yet." })),
    card("Top operations", "", ops.length ? barList(ops.slice(0, 10).map((o) => ({ label: o.operation, value: o.count })), { warm: true }) : h("div", { class: "empty", text: "No operations yet." }))));
  if (ops.length) {
    root.append(h("div", { class: "section" }, h("h2", { text: "Operations" }), dataTable({
      rows: ops, csvName: `${title.toLowerCase().replace(/\W+/g, "-")}-operations`, pageSize: 15, searchText: (r) => `${appName(r.workload)} ${r.operation}`,
      columns: [{ key: "workload", label: "App", render: (r) => appName(r.workload), sort: (r) => appName(r.workload) }, { key: "operation", label: "Operation" }, { key: "count", label: "Events", num: true }] })));
  }
  if (recent.length) {
    root.append(h("div", { class: "section" }, h("h2", { text: `Recent activity (latest ${recent.length})` }), dataTable({
      rows: recent, csvName: `${title.toLowerCase().replace(/\W+/g, "-")}-recent`, pageSize: 15, searchText: (r) => Object.values(r).join(" "),
      columns: [{ key: "time", label: "Time", render: (r) => fmt.dt(r.time), sort: (r) => r.time }, { key: "workload", label: "App", render: (r) => appName(r.workload) },
        { key: "operation", label: "Operation" }, { key: "user", label: "User" }, { key: "ip", label: "IP" }, { key: "result", label: "Result" }] })));
  }
  return root;
}

export const sharepoint = (ctx) => auditProduct(ctx, {
  title: "SharePoint and OneDrive activity", sub: "What people did in SharePoint sites and OneDrive, read from the Purview audit log.",
  workloads: ["SharePoint", "OneDrive"], what: "SharePoint and OneDrive", product: "sharepoint",
});

// Licensed people from the directory against Copilot activity from the audit log.
export const copilot = (ctx) => auditProduct(ctx, {
  title: "Microsoft Copilot activity", sub: "Who holds a Microsoft 365 Copilot licence, and who has used it, read from the Entra directory and the Purview audit log.",
  workloads: ["Copilot"], what: "Copilot interactions", product: "copilot",
  async extra() {
    const t = await api.peopleUsage("copilot");
    if (!t.available) return [];
    const licensed = t.rows.filter((r) => r.licences.some((l) => /copilot/i.test(l)));
    const idle = licensed.filter((r) => !r.last);
    const s = t.spend, a = t.artifacts, money = (v) => `${s.currency} ${fmt.n(v)}`;
    const meters = Object.entries(a?.meters || {});
    return [kpi("Licensed", fmt.n(licensed.length), "hold a Copilot licence"), kpi("Licensed, no activity", fmt.n(idle.length), idle.length ? "licences nobody is using in the period" : "every licence shows use"),
      ...(s ? [kpi("Licence spend", `${money(s.monthly)} a month`, `${money(s.annual)} a year at ${s.currency} ${s.pricePerLicence} each (${s.priceSource})`),
        kpi("Spend on idle licences", `${money(s.idleAnnual)} a year`, `${money(s.idleMonthly)} a month for ${fmt.n(s.idle)} licences with no use`)] : []),
      ...(a ? [kpi("Artifacts generated", a.recorded ? fmt.n(a.artifacts) : "-", a.recorded ? `${fmt.n(a.makers)} of ${fmt.n(a.people)} people; ${Object.entries(a.kinds).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${n} ${k}`).join(", ") || "none"}` : "appears after the next Copilot read")] : []),
      meters.length ? kpi("Tokens and credits reported", meters.map(([k, v]) => `${fmt.n(Math.round(v))} ${k}`).join(", "), "summed from audit event fields that mention tokens, credits or cost")
        : kpi("Tokens and credits", "Not reported", "Microsoft's audit log carries no token or credit counts for Copilot, so spend here is the licence price")];
  },
});
