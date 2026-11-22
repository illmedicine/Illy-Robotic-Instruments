import { h, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { pageHead } from "./common.js";
import { appName, skuName } from "./names.js";
import { openProduct, productSearch } from "./personuse.js";

function seen(a) {
  if (!a || !a.last) return h("span", { class: "muted", text: "-" });
  return h("span", { title: `${fmt.dt(a.last)}${a.count != null ? ` - ${fmt.n(a.count)} events` : ""}`, text: fmt.ago(a.last) });
}

function kpi(label, value, note) {
  return h("div", { class: "card kpi", style: { cursor: "default" } }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note", text: note }));
}

// One row per person with the latest use of each application of one product, from the live usage sources.
export async function peopleTable(product, csvName) {
  const d = await api.peopleUsage(product);
  if (!d.available) return h("div", { class: "banner info", text: d.reason || "No usage data yet." });
  const used = d.rows.filter((r) => r.last).length;
  const parts = [h("div", { class: "grid g-kpi" },
    kpi("People listed", fmt.n(d.total), d.source),
    kpi("With activity", fmt.n(used), "a trace in the collected period"),
    kpi("No activity", fmt.n(d.rows.length - used), "licensed or listed, nothing seen"))];
  if (d.note) parts.push(h("div", { class: "banner info", text: d.note }));
  const cols = [
    { key: "name", label: "Name", render: (r) => r.name || r.upn },
    { key: "upn", label: "User" },
    { key: "dept", label: "Department" },
    { key: "licences", label: "Licences", sort: (r) => r.licences.length, csv: (r) => r.licences.map(skuName).join("; "),
      render: (r) => (r.licences.length ? h("span", { title: r.licences.map(skuName).join(", "), text: r.licences.slice(0, 2).map(skuName).join(", ") + (r.licences.length > 2 ? ` +${r.licences.length - 2}` : "") }) : h("span", { class: "muted", text: "-" })) },
    { key: "lastSignIn", label: "Last sign-in", sort: (r) => r.lastSignIn || "", render: (r) => seen({ last: r.lastSignIn }), csv: (r) => r.lastSignIn || "" },
    ...d.apps.map((a) => ({ key: "app:" + a, label: appName(a), sort: (r) => r.apps[a]?.last || "", render: (r) => seen(r.apps[a]), csv: (r) => r.apps[a]?.last || "" })),
    { key: "last", label: "Last activity", sort: (r) => r.last || "", render: (r) => (r.last ? seen({ last: r.last }) : pill("No activity", "warn")), csv: (r) => r.last || "" },
  ];
  parts.push(h("div", { class: "section" }, dataTable({
    rows: d.rows, columns: cols, csvName, pageSize: 100,
    searchText: (r) => [r.name, r.upn, r.dept, r.licences.map(skuName).join(" ")].join(" "),
    filters: [{ key: "act", label: "Activity", get: (r) => (r.last ? "Has activity" : "No activity"), values: ["Has activity", "No activity"] },
      { key: "acct", label: "Account", get: (r) => (r.enabled ? "Enabled" : "Disabled"), values: ["Enabled", "Disabled"] }],
    onRow: (r) => openProduct(product, r.upn),
  })));
  return h("div", {}, parts);
}

export function page(product, title, sub, csvName) {
  return async () => h("div", {}, pageHead(title, sub), productSearch(product), await peopleTable(product, csvName));
}
