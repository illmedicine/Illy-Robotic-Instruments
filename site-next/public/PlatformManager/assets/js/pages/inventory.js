import { h, fmt, pill, stateKind } from "../dom.js";
import { api } from "../api.js";
import { dataTable, openDrawer, extLink } from "../ui.js";
import { pageHead, noData, makerFlow, makerApps, adminEnv } from "./common.js";

const age = (ts) => (ts ? Math.floor((Date.now() - new Date(ts)) / 864e5) : null);
const ownerCell = (r) => (r.ownerState === "disabled" || r.ownerState === "missing"
  ? h("span", {}, r.owner || r.ownerId || "unknown", " ", pill(r.ownerState, "risk")) : r.owner || r.ownerUpn || r.ownerId || "-");
const connCell = (r) => h("span", { title: r.connectors.map(fmt.connector).join(", ") }, r.connectors.length ? `${r.connectors.length}` : "-");
const failedCell = (r) => (r.failed28 == null ? "-" : r.failed28 ? pill(`${r.failed28}${r.failed28Capped ? "+" : ""}`, "risk") : "0");

export async function flows(ctx) {
  const p = await api.data("platform");
  const root = h("div", {}, pageHead("Cloud flows", "Every Power Automate cloud flow, across all environments."));
  if (!p) return root.append(noData(ctx, "platform", "Flow inventory")), root;
  root.append(dataTable({
    rows: p.flows, csvName: "flows",
    searchText: (r) => [r.name, r.envName, r.owner, r.ownerUpn, r.connectors.join(" ")].join(" "),
    filters: [{ key: "state", label: "State" }, { key: "runHealth", label: "Run health" }, { key: "envName", label: "Environment" }, { key: "ownerState", label: "Owner" }],
    initialSort: "modified",
    columns: [
      { key: "name", label: "Flow" }, { key: "envName", label: "Environment" },
      { key: "state", label: "State", render: (r) => pill(r.state, stateKind(r.state)) },
      { key: "failed28", label: "Failed (28 d)", num: true, render: failedCell, sort: (r) => r.failed28 ?? -1, csv: (r) => (r.failed28 == null ? "" : `${r.failed28}${r.failed28Capped ? "+" : ""}`) },
      { key: "lastFailed", label: "Last failure", render: (r) => (r.lastFailed ? h("span", { title: r.lastError || "" }, fmt.date(r.lastFailed)) : "-"), sort: (r) => r.lastFailed || "", csv: (r) => r.lastFailed || "" },
      { key: "owner", label: "Owner", render: ownerCell, csv: (r) => r.owner || r.ownerUpn || r.ownerId },
      { key: "modified", label: "Modified", render: (r) => fmt.date(r.modified) },
      { key: "created", label: "Created", render: (r) => fmt.date(r.created) },
      { key: "trigger", label: "Trigger" },
      { key: "premium", label: "Tier", render: (r) => (r.premium == null ? "-" : pill(r.premium ? "Premium" : "Standard", r.premium ? "warn" : "")), sort: (r) => (r.premium == null ? -1 : +r.premium), csv: (r) => (r.premium == null ? "" : r.premium ? "Premium" : "Standard") },
      { key: "connectors", label: "Connectors", num: true, render: connCell, sort: (r) => r.connectors.length, csv: (r) => r.connectors.map(fmt.connector).join("; ") },
    ],
    onRow: (r) => openDrawer(r.name, [
      ["State", pill(r.state, stateKind(r.state))], ["Suspension reason", r.suspensionReason],
      ["Run health", r.runHealth || "Not collected"],
      ["Failed runs (last 28 days)", r.failed28 == null ? "Not checked" : `${r.failed28}${r.failed28Capped ? "+" : ""}`],
      ["Last failure", r.lastFailed ? fmt.dt(r.lastFailed) : ""], ["Error recorded by Power Automate", r.lastError],
      ["Environment", r.envName], ["Owner", r.owner || r.ownerUpn], ["Owner object ID", h("span", { class: "mono", text: r.ownerId })],
      ["Owner status", r.ownerState], ["Trigger", r.trigger], ["Created", fmt.dt(r.created)], ["Last modified", `${fmt.dt(r.modified)} (${age(r.modified)} days ago)`],
      ["Managed", r.managed ? "Yes (solution)" : "No"], ["Connectors", r.connectors.map(fmt.connector).join(", ")],
      ["Flow ID", h("span", { class: "mono", text: r.id })],
    ], [extLink(makerFlow(r), "Open in Power Automate")]),
  }));
  return root;
}

export async function apps(ctx) {
  const p = await api.data("platform");
  const root = h("div", {}, pageHead("Apps", "Canvas apps across all environments. Model-driven apps live in Dataverse and are not listed by this API."));
  if (!p) return root.append(noData(ctx, "platform", "App inventory")), root;
  root.append(dataTable({
    rows: p.apps, csvName: "apps", initialSort: "modified",
    searchText: (r) => [r.name, r.envName, r.owner, r.ownerUpn].join(" "),
    filters: [{ key: "envName", label: "Environment" }, { key: "plan", label: "Plan" }, { key: "ownerState", label: "Owner" }],
    columns: [
      { key: "name", label: "App" }, { key: "envName", label: "Environment" },
      { key: "owner", label: "Owner", render: ownerCell, csv: (r) => r.owner || r.ownerUpn },
      { key: "plan", label: "Plan", render: (r) => (r.plan ? pill(r.plan, r.plan === "Premium" ? "warn" : "") : "-") },
      { key: "sharedUsers", label: "Shared with", num: true, render: (r) => `${r.sharedUsers ?? 0} users, ${r.sharedGroups ?? 0} groups`, sort: (r) => r.sharedUsers ?? 0, csv: (r) => `${r.sharedUsers ?? 0} users; ${r.sharedGroups ?? 0} groups` },
      { key: "modified", label: "Modified", render: (r) => fmt.date(r.modified) },
      { key: "created", label: "Created", render: (r) => fmt.date(r.created) },
      { key: "connectors", label: "Connectors", num: true, render: connCell, sort: (r) => r.connectors.length, csv: (r) => r.connectors.map(fmt.connector).join("; ") },
    ],
    onRow: (r) => openDrawer(r.name, [
      ["Environment", r.envName], ["Owner", r.owner], ["Owner email", r.ownerUpn], ["Owner status", r.ownerState], ["Plan", r.plan],
      ["Created", fmt.dt(r.created)], ["Last modified", fmt.dt(r.modified)], ["Connectors", r.connectors.map(fmt.connector).join(", ")],
      ["App ID", h("span", { class: "mono", text: r.id })],
    ], [extLink(makerApps(r), "Open in Power Apps")]),
  }));
  return root;
}

export async function connections(ctx) {
  const p = await api.data("platform");
  const root = h("div", {}, pageHead("Connections & connectors", "Who connected what, which connectors are in use, and custom connectors."));
  if (!p) return root.append(noData(ctx, "platform", "Connection inventory")), root;
  const usage = {};
  [...p.flows.map((f) => ["flows", f]), ...p.apps.map((a) => ["apps", a])].forEach(([k, x]) => x.connectors.forEach((c) => {
    const u = (usage[c] ||= { connector: c, flows: 0, apps: 0, connections: 0, custom: false });
    u[k]++;
  }));
  p.connections.forEach((c) => { (usage[c.connector] ||= { connector: c.connector, flows: 0, apps: 0, connections: 0 }).connections++; });
  const usageRows = Object.values(usage).map((u) => ({ ...u, total: u.flows + u.apps })).sort((a, b) => b.total - a.total);
  const views = {
    Connections: () => dataTable({
      rows: p.connections, csvName: "connections", searchText: (r) => [r.connector, r.name, r.envName, r.createdBy].join(" "),
      filters: [{ key: "status", label: "Status" }, { key: "envName", label: "Environment" }, { key: "connector", label: "Connector" }],
      columns: [
        { key: "connector", label: "Connector", render: (r) => fmt.connector(r.connector) }, { key: "name", label: "Connection" },
        { key: "status", label: "Status", render: (r) => pill(r.status, stateKind(r.status)) },
        { key: "errorKind", label: "Reason", render: (r) => ({ "inactive-token": "Sign-in expired (90d inactive)", unauthorized: "Unauthorized", other: "Other" }[r.errorKind] || ""), csv: (r) => r.errorKind || "" },
        { key: "createdBy", label: "Created by" }, { key: "envName", label: "Environment" }, { key: "created", label: "Created", render: (r) => fmt.date(r.created) }],
    }),
    "Custom connectors": () => dataTable({
      rows: p.customConnectors, csvName: "custom-connectors", searchText: (r) => [r.name, r.envName, r.createdBy].join(" "),
      columns: [{ key: "name", label: "Connector" }, { key: "envName", label: "Environment" }, { key: "createdBy", label: "Created by" },
        { key: "created", label: "Created", render: (r) => fmt.date(r.created) }, { key: "modified", label: "Modified", render: (r) => fmt.date(r.modified) }],
    }),
    "Connector usage": () => dataTable({
      rows: usageRows, csvName: "connector-usage", searchText: (r) => r.connector,
      columns: [{ key: "connector", label: "Connector", render: (r) => fmt.connector(r.connector) },
        { key: "flows", label: "Flows", num: true }, { key: "apps", label: "Apps", num: true }, { key: "connections", label: "Connections", num: true }, { key: "total", label: "Total use", num: true }],
    }),
  };
  const host = h("div");
  let cur = "Connections";
  const seg = h("div", { class: "seg", role: "group" });
  const show = (name) => {
    cur = name;
    seg.replaceChildren(...Object.keys(views).map((k) => h("button", { type: "button", pressed: k === cur, onclick: () => show(k), text: k })));
    host.replaceChildren(views[name]());
  };
  show(cur);
  root.append(h("div", { class: "toolbar" }, seg), host);
  return root;
}

export async function environments(ctx) {
  const p = await api.data("platform");
  const root = h("div", {}, pageHead("Environments", "Where work lives, and how much of it."));
  if (!p) return root.append(noData(ctx, "platform", "Environment inventory")), root;
  const cnt = (list, id) => list.filter((x) => x.env === id).length;
  const rows = p.environments.map((e) => ({ ...e, flows: cnt(p.flows, e.id), apps: cnt(p.apps, e.id), connections: cnt(p.connections, e.id) }));
  root.append(dataTable({
    rows, csvName: "environments", searchText: (r) => [r.name, r.type, r.region, r.createdBy].join(" "),
    filters: [{ key: "type", label: "Type" }, { key: "region", label: "Region" }],
    columns: [
      { key: "name", label: "Environment", render: (r) => h("span", {}, r.name, r.isDefault ? pill("default", "info") : null) },
      { key: "type", label: "Type" }, { key: "region", label: "Region" },
      { key: "state", label: "State", render: (r) => pill(r.state || "-", stateKind(r.state)) },
      { key: "hasDataverse", label: "Dataverse", render: (r) => (r.hasDataverse ? "Yes" : "No"), csv: (r) => (r.hasDataverse ? "Yes" : "No") },
      { key: "flows", label: "Flows", num: true }, { key: "apps", label: "Apps", num: true }, { key: "connections", label: "Connections", num: true },
      { key: "createdBy", label: "Created by" }, { key: "created", label: "Created", render: (r) => fmt.date(r.created) },
    ],
    onRow: (r) => openDrawer(r.name, [["Type", r.type], ["Region", r.region], ["State", r.state], ["Dataverse version", r.version],
      ["Instance", r.instanceUrl], ["Created by", r.createdBy], ["Created", fmt.dt(r.created)], ["Environment ID", h("span", { class: "mono", text: r.id })]],
    [extLink(adminEnv(r), "Open in admin center")]),
  }));
  return root;
}
