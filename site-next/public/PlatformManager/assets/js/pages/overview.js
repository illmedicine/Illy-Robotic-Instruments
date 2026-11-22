import { h, icon, fmt, pill, stateKind } from "../dom.js";
import { api } from "../api.js";
import { barList, lineChart } from "../charts.js";
import { dataTable } from "../ui.js";
import { pageHead, noData } from "./common.js";
import { latestPanel } from "./latest.js";
import { personSearch } from "./person.js";
import { SOURCES, feedStrip, legend, openZoom, sourceCard } from "./sources.js";

const SEV = { high: "risk", medium: "warn", low: "info", info: "" };

// Connection state of a product, from the data modules that feed it.
function productState(ctx, ids) {
  const mods = ctx.status.modules.filter((m) => ids.includes(m.id) && m.enabled);
  if (!mods.length) return { text: "Not connected", kind: "" };
  if (mods.some((m) => m.state === "running")) return { text: "Collecting", kind: "info" };
  if (mods.some((m) => m.state === "error")) return { text: "Error", kind: "risk" };
  if (mods.some((m) => m.fromSnapshot)) return { text: "Saved snapshot", kind: "info" };
  if (!mods.some((m) => m.lastSync)) return { text: "Waiting for first sync", kind: "warn" };
  return ctx.status.mode === "demo" ? { text: "Demo data", kind: "warn" } : { text: "Live", kind: "ok" };
}

function logo(p) {
  const img = h("img", { class: "plogo", src: `assets/img/products/${p.logo}`, alt: "", width: "28", height: "28" });
  img.addEventListener("error", () => img.replaceWith(icon(p.icon)), { once: true });
  return img;
}

function productCard(ctx, p) {
  const go = () => ctx.go(p.page);
  const st = p.state;
  const strip = p.id ? feedStrip(ctx, p.id) : null;
  if (strip) {
    strip.classList.add("click");
    strip.setAttribute("role", "button");
    strip.setAttribute("tabindex", "0");
    strip.setAttribute("aria-label", `${p.name}: show which sources feed it`);
    const zoom = (e) => { e.stopPropagation(); openZoom(ctx, "product", p.id); };
    strip.addEventListener("click", zoom);
    strip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zoom(e); } });
  }
  return h("div", { class: "card prod", tabindex: "0", role: "link", onclick: go, onkeydown: (e) => e.key === "Enter" && go() },
    h("h3", {}, logo(p), p.name, h("span", { class: "sub" }, pill(st.text, st.kind))),
    h("div", { class: "stats" }, p.stats.map(([label, value, risk]) =>
      h("div", { class: "stat" }, h("div", { class: "n" + (risk ? " risk" : ""), text: value }), h("div", { class: "l", text: label })))),
    h("div", { class: "foot", text: p.foot }), strip);
}

// One page across every end-user Microsoft product this tool can see. Admin data feeds (Purview, Entra sign-in logs, Power BI admin API)
// are the evidence behind the products, so they appear as data sources rather than as products.
export async function render(ctx) {
  const [p, lic, pur, pbi, dyn, ups, insights, access] = await Promise.all([
    api.data("platform"), api.data("licensing"), api.data("purview"), api.data("powerbi"), api.data("productusage"),
    api.uploads().catch(() => ({ datasets: [] })), api.insights(), api.access().catch(() => null)]);
  const root = h("div", {}, pageHead("Overview", "Every Microsoft product your users have, and what this tool can see about each one."), personSearch());

  const flows = p?.flows ?? [], conns = p?.connections ?? [];
  const susp = flows.filter((f) => f.state === "Suspended").length;
  const failing = flows.filter((f) => f.failed28 > 0).length;
  const checked = flows.some((f) => f.runHealth && f.runHealth !== "Not checked");
  const connErr = conns.filter((c) => !["Connected", "Unknown"].includes(c.status)).length;
  const dynUsers = dyn?.products?.dynamics ? Object.keys(dyn.products.dynamics.users).length : null;
  const datasets = ups?.datasets ?? [];
  const wl = (w) => pur?.audit?.byWorkload?.find((x) => x.workload === w);
  const wsum = (ws, k) => (pur?.audit ? ws.reduce((n, w) => n + (wl(w)?.[k] || 0), 0) : null);
  const wmax = (ws, k) => (pur?.audit ? Math.max(0, ...ws.map((w) => wl(w)?.[k] || 0)) : null);
  const products = [
    { id: "m365", name: "Microsoft 365", icon: "users", logo: "microsoft-365.svg", page: "m365activity", state: productState(ctx, ["licensing", "purview"]),
      stats: [["Entra users", fmt.n(lic?.totalUsers)], ["Apps in audit log", fmt.n(pur?.audit ? Object.keys(pur.audit.workloadsSeen || {}).length : null)],
        ["App audit events", fmt.n(pur?.audit ? Object.values(pur.audit.workloadsSeen || {}).reduce((n, v) => n + v, 0) : null)]],
      foot: "Teams, Exchange, SharePoint, OneDrive, Copilot and more, read from the Purview audit log; people from Entra." },
    { id: "powerplatform", name: "Power Platform", icon: "flow", logo: "power-platform.svg", page: "ppsummary", state: productState(ctx, ["platform", "licensing", "usage", "dataverse"]),
      stats: [["Environments", fmt.n(p?.environments.length)], ["Cloud flows", fmt.n(p ? flows.length : null)], ["Apps", fmt.n(p?.apps.length)]],
      foot: p ? `${fmt.n(lic?.users.length)} licensed users; ${susp} suspended flows; ${checked ? `${failing} flows with failed runs (28 days); ` : ""}${fmt.n(connErr)} connections in error.` : "Flows, apps, connections, DLP and licences." },
    { id: "powerbi", name: "Power BI & Fabric", icon: "chart", logo: "power-bi.svg", page: "pbiactivity", state: productState(ctx, ["powerbi"]),
      stats: [["Capacities", fmt.n(pbi?.capacities?.length)], ["Workspaces", fmt.n(pbi?.workspaces)], ["Activity events", fmt.n(pbi?.activities)]],
      foot: "Capacity planning for Premium to Fabric." },
    { id: "dynamics", name: "Dynamics 365", icon: "license", logo: "dynamics-365.svg", page: "dynamics", state: productState(ctx, ["productusage"]),
      stats: [["Users signed in", fmt.n(dynUsers)], ["Sign-ins", fmt.n(dyn?.counts?.signIns)], ["Days covered", fmt.n(dyn?.days)]],
      foot: "Per-user sign-ins to the Dataverse resource." },
    { id: "sharepoint", name: "SharePoint", icon: "database", logo: "sharepoint.svg", page: "spactivity", state: productState(ctx, ["purview"]),
      stats: [["Events", fmt.n(wsum(["SharePoint", "OneDrive"], "events"))], ["People (most active)", fmt.n(wmax(["SharePoint", "OneDrive"], "users"))], ["Workloads", fmt.n(pur?.audit ? ["SharePoint", "OneDrive"].filter(wl).length : null)]],
      foot: "Sites and OneDrive activity from the Purview audit log (Audit.SharePoint feed)." },
    { id: "copilot", name: "Microsoft Copilot", icon: "app", logo: "microsoft-copilot.svg", page: "copilotactivity", state: productState(ctx, ["purview", "licensing"]),
      stats: [["Interactions", fmt.n(wsum(["Copilot"], "events"))], ["People", fmt.n(wsum(["Copilot"], "users"))]],
      foot: "Who holds a Copilot licence and who has used it." },
    { name: "Microsoft Renewal Analyze", icon: "database", logo: "microsoft.svg", page: "imports",
      state: datasets.length ? { text: "Ready", kind: "ok" } : { text: "No exports yet", kind: "" },
      stats: [["Exports loaded", fmt.n(datasets.length)], ["Rows", fmt.n(datasets.reduce((n, d) => n + (d.rowCount || 0), 0))], ["Sheets", fmt.n(datasets.reduce((n, d) => n + (d.sheetNames?.length || 0), 0))]],
      foot: "Renewal workbooks checked against live usage." },
  ];
  root.append(h("div", { class: "section" }, h("h2", { text: "Products" }), legend(), h("div", { class: "grid g-prod" }, products.map((x) => productCard(ctx, x)))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Data sources" }),
    h("p", { class: "muted", text: "What each source helps identify, and which products it reaches. Click one to zoom in on its connections." }),
    h("div", { class: "grid g-src" }, SOURCES.map((s) => sourceCard(ctx, s, () => openZoom(ctx, "source", s.id))))));

  const top = insights.slice(0, 6);
  root.append(h("div", { class: "section" },
    h("div", { class: "card" }, h("h3", {}, icon("shield"), "Needs attention", h("span", { class: "sub", text: `${insights.length} findings` })),
      top.length ? top.map((i) => h("div", { class: "finding", onclick: () => ctx.go("governance") },
        pill(i.severity, SEV[i.severity]), h("div", {}, h("div", { class: "t", text: i.title }), h("div", { class: "d", text: i.detail })),
        h("b", { text: fmt.n(i.count) }))) : h("div", { class: "empty", text: "No findings." }))));

  if (access) {
    const isLocal = (ip) => ip === "127.0.0.1" || ip === "::1";
    root.append(h("div", { class: "section" }, h("h2", { text: "Who has opened Platform Manager" }),
      h("p", { class: "muted", text: `${access.clients.length} client${access.clients.length === 1 ? "" : "s"} since ${fmt.dt(access.since)}. The machine name comes from reverse DNS, so it is blank when DNS has no record for that address.` }),
      access.clients.length ? dataTable({
        rows: access.clients, csvName: "platform-manager-access",
        searchText: (c) => `${c.ip} ${c.host}`,
        columns: [
          { key: "host", label: "Machine name", sort: (c) => c.short || "", csv: (c) => c.host,
            render: (c) => h("span", { title: c.host || "" }, c.short || h("span", { class: "muted", text: "(no DNS name)" }), isLocal(c.ip) ? h("span", { class: "muted", text: " this server" }) : "") },
          { key: "ip", label: "IP address" },
          { key: "firstSeen", label: "First seen", render: (c) => fmt.dt(c.firstSeen) },
          { key: "lastSeen", label: "Last seen", sort: (c) => c.lastSeen, render: (c) => h("span", { title: fmt.dt(c.lastSeen), text: fmt.ago(c.lastSeen) }) },
          { key: "visits", label: "Page loads", num: true },
          { key: "requests", label: "Requests", num: true },
        ],
      }) : h("div", { class: "empty", text: "Nobody has connected yet." })));
  }
  return root;
}

export async function powerPlatform(ctx) {
  const [p, lic, usage, hist] = await Promise.all([api.data("platform"), api.data("licensing"), api.data("usage"), api.history()]);
  const root = h("div", {}, pageHead("Power Platform summary", "Live status of environments, flows, apps and connections."));
  root.append(await latestPanel("powerplatform"));
  if (!p) { root.append(noData(ctx, "platform", "Power Platform inventory")); }

  const flows = p?.flows ?? [], apps = p?.apps ?? [], conns = p?.connections ?? [];
  const susp = flows.filter((f) => f.state === "Suspended").length;
  const failing = flows.filter((f) => f.failed28 > 0).length;
  const checked = flows.some((f) => f.runHealth && f.runHealth !== "Not checked");
  const connErr = conns.filter((c) => !["Connected", "Unknown"].includes(c.status)).length;
  const lu = lic?.users ?? [];
  const kpi = (label, value, note, page) => h("div", { class: "card kpi", tabindex: "0", role: "link", onclick: () => ctx.go(page),
    onkeydown: (e) => e.key === "Enter" && ctx.go(page) }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note" }, note));
  root.append(h("div", { class: "grid g-kpi" },
    kpi("Environments", fmt.n(p?.environments.length), `${p?.environments.filter((e) => e.type === "Production").length ?? 0} production`, "environments"),
    kpi("Cloud flows", fmt.n(p ? flows.length : null), [`${flows.filter((f) => f.state === "Started").length} on, `, susp ? h("b", { text: `${susp} suspended` }) : "0 suspended", ...(checked ? [", ", failing ? h("b", { text: `${failing} with failed runs` }) : "none failing"] : [])], "flows"),
    kpi("Apps", fmt.n(p ? apps.length : null), `${apps.filter((a) => a.plan === "Premium").length} premium`, "apps"),
    kpi("Connections", fmt.n(p ? conns.length : null), connErr ? h("b", { text: `${connErr} in error` }) : "all healthy", "connections"),
    kpi("Licensed users", fmt.n(lic ? lu.length : null), lic?.signInActivity ? h("b", { text: `${lu.filter((u) => u.inactive).length} inactive 90d` }) : "sign-in data off", "licensing"),
    kpi("Sign-ins", fmt.n(usage?.signIns), usage ? `${usage.uniqueUsers} users, ${usage.days} days` : "not collected", "usage")));

  root.append(h("div", { class: "section" },
    h("div", { class: "card" }, h("h3", {}, icon("chart"), "Trend", h("span", { class: "sub", text: `source: ${hist.source}` })),
      hist.points.length > 1 ? lineChart(hist.points, [{ key: "flows", label: "Flows" }, { key: "apps", label: "Apps" }, { key: "connections", label: "Connections" }])
        : h("div", { class: "empty", text: "Trend builds up with each sync. Enable the datalake module to keep long-term history." }))));

  if (p) {
    const byEnv = {}, byConn = {};
    flows.forEach((f) => { byEnv[f.envName] = (byEnv[f.envName] || 0) + 1; f.connectors.forEach((c) => (byConn[fmt.connector(c)] = (byConn[fmt.connector(c)] || 0) + 1)); });
    const toItems = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
    root.append(h("div", { class: "section grid g-2" },
      h("div", { class: "card" }, h("h3", { text: "Flows by environment" }), barList(toItems(byEnv, 8))),
      h("div", { class: "card" }, h("h3", { text: "Most used connectors (flows)" }), barList(toItems(byConn, 8), { warm: true }))));
  }
  return root;
}
