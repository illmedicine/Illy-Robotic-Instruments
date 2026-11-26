import { h, svg, icon, pill } from "../dom.js";
import { markGroup, still } from "./foundrykit.js";

// The Estate diagram, the first document of Migration topology: the Power BI and Fabric estate drawn as the app's own interactive picture.
// Every name and figure below is invented for the demo; nothing here is read from a tenant. Product marks come from foundrykit.js.
// Arrows: solid blue is data, dashed purple is governance, dotted teal is sign-in and access, dashed green is cost and monitoring.

const W = 1640, H = 1120;

const GROUPS = [
  { id: "g-purview", x: 20, y: 20, w: 1600, h: 140, title: "Microsoft Purview (governance over the whole estate)" },
  { id: "g-sources", x: 20, y: 170, w: 250, h: 820, title: "Data sources (example estate)" },
  { id: "g-connect", x: 300, y: 170, w: 190, h: 820, title: "Connectivity" },
  { id: "g-fabric", x: 520, y: 170, w: 680, h: 600, title: "Microsoft Fabric (example tenant, East US 2)", cls: "fabric" },
  { id: "g-prod", x: 540, y: 280, w: 300, h: 230, title: "Production F64 (reserved)" },
  { id: "g-eng", x: 860, y: 280, w: 340, h: 230, title: "Data engineering F16 to F32" },
  { id: "g-dev", x: 540, y: 530, w: 660, h: 110, title: "Dev and test (paused out of hours)" },
  { id: "g-shared", x: 540, y: 660, w: 660, h: 100, title: "Shared capacity (Pro)", cls: "dash" },
  { id: "g-people", x: 1230, y: 170, w: 390, h: 600, title: "People and apps" },
  { id: "g-azure", x: 520, y: 800, w: 680, h: 170, title: "Azure subscription (example resource group)" },
  { id: "g-entra", x: 20, y: 1000, w: 1600, h: 100, title: "Microsoft Entra ID (who can do what, everywhere above)" },
];

const NODES = [
  // Purview
  { id: "pv-labels", g: "g-purview", label: "Sensitivity labels", sub: "Flow down to exports and Excel", mark: "purview", x: 40, y: 70, w: 270, h: 62, text: "Labels are set once in Fabric and follow the content into exports, Excel and PowerPoint." },
  { id: "pv-dlp", g: "g-purview", label: "DLP for Fabric and Power BI", sub: "Detects sensitive data in models", mark: "purview", x: 330, y: 70, w: 270, h: 62, text: "Data loss prevention scans semantic models and alerts or restricts sharing when sensitive data is found." },
  { id: "pv-map", g: "g-purview", label: "Data Map, Unified Catalog", sub: "Lineage, owners, classifications", mark: "purview", x: 620, y: 70, w: 270, h: 62, text: "Scans Fabric items for lineage, owners and classifications, so every report can be traced to its source." },
  { id: "pv-audit", g: "g-purview", label: "Audit log", sub: "Every activity, read by admins", mark: "trace", x: 910, y: 70, w: 270, h: 62, text: "Every activity in Fabric is written to the audit log, which Platform Manager reads for usage and sign-in reports." },
  { id: "pv-hub", g: "g-purview", label: "Purview hub in Fabric", sub: "Label coverage for admins", mark: "purview", x: 1200, y: 70, w: 270, h: 62, text: "A hub inside Fabric that shows label coverage and sensitive data reports to administrators." },

  // Sources (on premises first, then cloud and SaaS)
  { id: "s-files", g: "g-sources", label: "File shares (UNC)", sub: "Excel and CSV on drives", mark: "files", x: 40, y: 210, w: 210, h: 58, text: "Example network file shares holding Excel and CSV files, read through the on-premises gateway." },
  { id: "s-sql", g: "g-sources", label: "SQL Server", sub: "On premises, 23 servers", mark: "sql", x: 40, y: 288, w: 210, h: 58, text: "Example on-premises SQL Server estate. Refreshes run through the gateway on a schedule." },
  { id: "s-db2", g: "g-sources", label: "Db2 (ODBC)", sub: "Through the gateway", mark: "database", x: 40, y: 366, w: 210, h: 58, text: "Example Db2 database reached over ODBC through the on-premises gateway." },
  { id: "s-hive", g: "g-sources", label: "Data lake (ODBC)", sub: "Example production lake", mark: "database", x: 40, y: 444, w: 210, h: 58, text: "Example Hive-style data lake reached over ODBC through the gateway." },
  { id: "s-sp", g: "g-sources", label: "SharePoint, Exchange", sub: "Microsoft 365 APIs", mark: "sharepoint", x: 40, y: 522, w: 210, h: 58, text: "SharePoint lists and Exchange data, read through Microsoft 365 APIs." },
  { id: "s-dv", g: "g-sources", label: "Power Platform", sub: "Dataverse, Power Apps", mark: "powerplatform", x: 40, y: 600, w: 210, h: 58, text: "Dataverse tables and Power Apps environments, read directly in the cloud." },
  { id: "s-devops", g: "g-sources", label: "Azure DevOps", sub: "Work items, pipelines", mark: "devops", x: 40, y: 678, w: 210, h: 58, text: "Example work items and build pipelines in Azure DevOps." },
  { id: "s-azsql", g: "g-sources", label: "Azure SQL Database", sub: "Private endpoints", mark: "sql", x: 40, y: 756, w: 210, h: 58, text: "Example Azure SQL databases, reached over private endpoints through the VNet gateway." },
  { id: "s-api", g: "g-sources", label: "Web and REST APIs", sub: "OData and SaaS feeds", mark: "graph", x: 40, y: 834, w: 210, h: 58, text: "Example OData and SaaS feeds, read over HTTPS." },
  { id: "s-intune", g: "g-sources", label: "Intune and cost", sub: "Admin feeds, usage", mark: "cost", x: 40, y: 912, w: 210, h: 58, text: "Example device and cost feeds from the Microsoft admin centres." },

  // Connectivity
  { id: "gw-onprem", g: "g-connect", label: "On-premises gateway", sub: "3 example nodes", mark: "gateway", x: 310, y: 230, w: 170, h: 70, text: "A three-node example cluster that carries on-premises traffic into Fabric. Add a second node for resilience." },
  { id: "gw-vnet", g: "g-connect", label: "VNet data gateway", sub: "Optional, private", mark: "router", x: 310, y: 756, w: 170, h: 70, text: "Optional gateway inside a virtual network, for Azure SQL over private endpoints." },

  // Fabric: OneLake and capacities
  { id: "onelake", g: "g-fabric", label: "OneLake", sub: "One copy of data per workspace, with shortcuts to Azure storage", mark: "onelake", x: 540, y: 205, w: 640, h: 56, text: "One logical data lake per tenant. Lakehouses, warehouses and Direct Lake models read the same Delta tables, and shortcuts reach Azure storage without copying." },
  { id: "prod-rep", g: "g-prod", label: "Reports", sub: "12,480", x: 552, y: 312, w: 132, h: 52, text: "Example reports open every day by viewers. Figures are invented." },
  { id: "prod-mod", g: "g-prod", label: "Semantic models", sub: "6,215", x: 696, y: 312, w: 132, h: 52, text: "Example semantic models that hold the business logic behind the reports." },
  { id: "prod-dash", g: "g-prod", label: "Dashboards", sub: "912", x: 552, y: 372, w: 132, h: 52, text: "Example dashboards pinned for executives." },
  { id: "prod-act", g: "g-prod", label: "Activator", sub: "27 alert rules", x: 696, y: 372, w: 132, h: 52, text: "Example alert rules that watch data and notify owners when a value crosses a threshold." },
  { id: "prod-eh", g: "g-prod", label: "Eventhouse", sub: "4 streams", x: 552, y: 432, w: 132, h: 52, text: "Example real-time event streams stored for KQL queries." },
  { id: "prod-agent", g: "g-prod", label: "Data agents", sub: "9 answering", x: 696, y: 432, w: 132, h: 52, text: "Example data agents that answer questions from the production models." },
  { id: "eng-df", g: "g-eng", label: "Dataflows", sub: "570 across Gen1 and Gen2", x: 876, y: 312, w: 152, h: 52, text: "Example dataflows that prepare data, Gen1 and Gen2 together." },
  { id: "eng-pipe", g: "g-eng", label: "Pipelines", sub: "540 example runs", x: 1034, y: 312, w: 152, h: 52, text: "Example data pipelines that orchestrate loads and refreshes." },
  { id: "eng-lake", g: "g-eng", label: "Lakehouse", sub: "148", x: 876, y: 372, w: 152, h: 52, text: "Example lakehouses that hold the curated Delta tables." },
  { id: "eng-wh", g: "g-eng", label: "Warehouse", sub: "96", x: 1034, y: 372, w: 152, h: 52, text: "Example warehouses that serve the curated SQL layer." },
  { id: "eng-nb", g: "g-eng", label: "Notebooks", sub: "210", x: 876, y: 432, w: 152, h: 52, text: "Example Spark notebooks used for data science." },
  { id: "eng-sched", g: "g-eng", label: "Scheduled jobs", sub: "1,340 runs a week", x: 1034, y: 432, w: 152, h: 52, text: "Example scheduled jobs that run refreshes in the background." },
  { id: "dev-ws", g: "g-dev", label: "Dev workspaces", sub: "25 example", mark: "studio", x: 556, y: 566, w: 190, h: 52, text: "Example development workspaces where authors build and test." },
  { id: "test-ws", g: "g-dev", label: "Test workspaces", sub: "14 example", mark: "studio", x: 760, y: 566, w: 190, h: 52, text: "Example test workspaces that hold a copy of business-critical content." },
  { id: "git", g: "g-dev", label: "Git and deploy pipelines", sub: "Dev to Test to Prod, 40", mark: "devops", x: 964, y: 566, w: 190, h: 52, text: "Source control and deployment pipelines that promote content from Dev to Test to Prod." },
  { id: "shared-ws", g: "g-shared", label: "Shared workspaces (Pro)", sub: "420 workspaces, no move", x: 556, y: 692, w: 300, h: 52, text: "Example shared workspaces on Pro capacity. They are not moved, and viewers keep their Pro licences." },

  // People and apps
  { id: "pbi-service", g: "g-people", label: "Power BI service", sub: "app.powerbi.com, same reports", mark: "powerbi", x: 1250, y: 205, w: 350, h: 62, text: "The Power BI service where people open reports, with the same addresses before and after." },
  { id: "ws-apps", g: "g-people", label: "Workspace apps", sub: "Apps for business audiences", mark: "studio", x: 1250, y: 285, w: 350, h: 62, text: "Packaged apps that give a business audience a curated set of reports." },
  { id: "teams", g: "g-people", label: "Teams, SharePoint, Excel", sub: "Embedded reports and alerts", mark: "teams", x: 1250, y: 365, w: 350, h: 62, text: "Reports embedded in Teams, SharePoint and Excel, with alerts that reach people where they work." },
  { id: "exports", g: "g-people", label: "Subscriptions and exports", sub: "Paginated reports by email", mark: "excel", x: 1250, y: 445, w: 350, h: 62, text: "Email subscriptions and exports, governed by the sensitivity labels." },
  { id: "pbi-desktop", g: "g-people", label: "Power BI Desktop", sub: "Authors publish to Dev", mark: "powerbi", x: 1250, y: 525, w: 350, h: 62, text: "Report authors build in Power BI Desktop and publish to the Dev workspace." },
  { id: "copilot", g: "g-people", label: "Copilot in Fabric", sub: "Tenant setting decides who", mark: "copilot", x: 1250, y: 605, w: 350, h: 62, text: "Copilot in Fabric, switched on for the people the tenant setting allows." },

  // Azure subscription
  { id: "az-cap", g: "g-azure", label: "Capacities", sub: "Billed as Azure", mark: "azure", x: 536, y: 836, w: 152, h: 52, text: "Fabric capacities are Azure resources, so their cost appears on the subscription bill." },
  { id: "az-log", g: "g-azure", label: "Log Analytics", sub: "Capacity logs", mark: "trace", x: 696, y: 836, w: 152, h: 52, text: "Workspace and capacity logs, kept for example for 90 days." },
  { id: "az-kv", g: "g-azure", label: "Key Vault", sub: "Connection secrets", mark: "safety", x: 856, y: 836, w: 152, h: 52, text: "Connection secrets kept in Key Vault, never in the reports themselves." },
  { id: "az-adls", g: "g-azure", label: "ADLS Gen2", sub: "Backups, shortcuts", mark: "database", x: 1016, y: 836, w: 152, h: 52, text: "Example Azure Data Lake storage for model backups and shortcuts." },
  { id: "az-mon", g: "g-azure", label: "Monitor alerts", sub: "CU at 80% and 100%", mark: "shadow", x: 536, y: 900, w: 152, h: 52, text: "Alerts fire when a capacity passes 80 and 100 percent of its compute units." },
  { id: "az-cost", g: "g-azure", label: "Cost budgets", sub: "Per capacity", mark: "cost", x: 696, y: 900, w: 152, h: 52, text: "Budgets set per capacity, with alerts before the spend limit." },
  { id: "az-policy", g: "g-azure", label: "Policy and RBAC", sub: "Regions, SKUs, roles", mark: "safety", x: 856, y: 900, w: 152, h: 52, text: "Azure Policy limits regions and SKUs, and role assignments decide who can change capacities." },
  { id: "az-pl", g: "g-azure", label: "Private Link", sub: "Phase 2 workspaces", mark: "router", x: 1016, y: 900, w: 152, h: 52, text: "Private endpoints for workspaces that must stay off the public internet." },

  // Entra
  { id: "en-users", g: "g-entra", label: "Users and guests", sub: "Free viewers on F64", mark: "users", x: 40, y: 1032, w: 210, h: 52, text: "Users and guest accounts that sign in. Viewers on F64 need no Pro licence." },
  { id: "en-groups", g: "g-entra", label: "Security groups", sub: "Roles and audiences", mark: "users", x: 265, y: 1032, w: 210, h: 52, text: "Security groups that grant workspace roles and app audiences." },
  { id: "en-ca", g: "g-entra", label: "Conditional Access", sub: "MFA, compliant devices", mark: "safety", x: 490, y: 1032, w: 210, h: 52, text: "Conditional Access requires MFA and compliant devices before anyone reaches Fabric." },
  { id: "en-pim", g: "g-entra", label: "PIM for admin roles", sub: "Just in time", mark: "safety", x: 715, y: 1032, w: 210, h: 52, text: "Privileged Identity Management gives admin roles just in time, for a limited period." },
  { id: "en-sp", g: "g-entra", label: "Service principals", sub: "Deploy pipelines, read-only", mark: "entra", x: 940, y: 1032, w: 210, h: 52, text: "Service principals for deployment pipelines and for read-only admin scans." },
  { id: "en-wi", g: "g-entra", label: "Workspace identity", sub: "OneLake without secrets", mark: "entra", x: 1165, y: 1032, w: 210, h: 52, text: "Workspace identities reach OneLake and ADLS without stored secrets." },
  { id: "en-connect", g: "g-entra", label: "Entra Connect", sub: "Sync and single sign-on", mark: "gateway", x: 1390, y: 1032, w: 210, h: 52, text: "Syncs on-premises directories to Entra and provides single sign-on." },
];

// Structural arrows: [from, to, kind]. Flow arrows are added from FLOWS below.
const STRUCT = [
  ["s-files", "gw-onprem", "data"], ["s-sql", "gw-onprem", "data"], ["s-db2", "gw-onprem", "data"], ["s-hive", "gw-onprem", "data"],
  ["gw-onprem", "eng-pipe", "data"],
  ["s-sp", "onelake", "data"], ["s-dv", "onelake", "data"], ["s-devops", "onelake", "data"], ["s-intune", "onelake", "data"],
  ["s-azsql", "gw-vnet", "data"], ["gw-vnet", "eng-lake", "data"],
  ["eng-lake", "onelake", "data"], ["onelake", "prod-mod", "data"],
  ["pv-labels", "onelake", "govern"], ["pv-map", "onelake", "govern"], ["pv-dlp", "prod-mod", "govern"],
  ["en-ca", "onelake", "identity"], ["en-wi", "onelake", "identity"], ["en-groups", "ws-apps", "identity"],
  ["az-cap", "prod-rep", "cost"], ["az-cost", "az-mon", "cost"], ["az-mon", "prod-act", "cost"], ["az-adls", "onelake", "data"],
];

const FLOWS = [
  { id: "refresh", name: "Daily refresh from on-premises", text: "A scheduled refresh reads an example SQL Server through the gateway, prepares it in a pipeline and lands it in the lakehouse.",
    nodes: ["s-sql", "gw-onprem", "eng-pipe", "eng-lake", "prod-mod", "pbi-service"] },
  { id: "feed", name: "Cloud feed into the lakehouse", text: "An example REST feed is prepared by a dataflow and lands in the lakehouse, then reaches the production models.",
    nodes: ["s-api", "eng-df", "eng-lake", "prod-mod", "teams"] },
  { id: "publish", name: "Publish a report to production", text: "An author publishes from Power BI Desktop to Dev, the deployment pipeline promotes it through Test, and it reaches viewers as an app.",
    nodes: ["pbi-desktop", "dev-ws", "test-ws", "git", "prod-rep", "ws-apps"] },
  { id: "labels", name: "Labels follow the content", text: "A sensitivity label set in Purview flows down to the semantic model and on to every export and subscription.",
    nodes: ["pv-labels", "onelake", "prod-mod", "exports"] },
];

const KIND = {
  data: { color: "#0f6cbd", label: "Data moves" },
  govern: { color: "#7a3dd6", label: "Governance" },
  identity: { color: "#0f766e", label: "Sign-in and access" },
  cost: { color: "#107c41", label: "Cost and monitoring" },
};

const BY = Object.fromEntries(NODES.map((n) => [n.id, n]));
const GROUP_BY = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

function curve(a, b) {
  const acx = a.x + a.w / 2, acy = a.y + a.h / 2, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
  let p, q, horiz;
  if (b.x >= a.x + a.w) { p = [a.x + a.w, acy]; q = [b.x, bcy]; horiz = true; }
  else if (b.x + b.w <= a.x) { p = [a.x, acy]; q = [b.x + b.w, bcy]; horiz = true; }
  else if (b.y >= a.y + a.h) { p = [acx, a.y + a.h]; q = [bcx, b.y]; horiz = false; }
  else { p = [acx, a.y]; q = [bcx, b.y + b.h]; horiz = false; }
  const c1 = horiz ? [(p[0] + q[0]) / 2, p[1]] : [p[0], (p[1] + q[1]) / 2];
  const c2 = horiz ? [(p[0] + q[0]) / 2, q[1]] : [q[0], (p[1] + q[1]) / 2];
  return `M${p[0]} ${p[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${q[0]} ${q[1]}`;
}

// Every arrow is keyed "from>to". Flow arrows come from the flows themselves, so a flow can never use an arrow that is not drawn.
function buildEdges() {
  const edges = new Map();
  const add = (a, b, kind) => {
    if (!BY[a] || !BY[b]) throw new Error(`Estate diagram: unknown box in ${a} to ${b}`);
    const key = a + ">" + b;
    if (!edges.has(key)) edges.set(key, { a, b, kind, d: curve(BY[a], BY[b]) });
  };
  STRUCT.forEach(([a, b, kind]) => add(a, b, kind));
  FLOWS.forEach((f) => f.nodes.slice(1).forEach((b, i) => add(f.nodes[i], b, "data")));
  return edges;
}

export function estateView() {
  const edges = buildEdges();
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "topo-svg est-svg", role: "img",
    "aria-label": "Example Power BI and Fabric estate: sources, gateways, Fabric capacities, Azure, Entra and Purview, with arrows for data, governance, sign-in and cost" });

  const defs = svg("defs", {});
  Object.entries(KIND).forEach(([k, v]) => defs.append(svg("marker", { id: "est-arr-" + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" },
    svg("path", { d: "M0 0 L10 5 L0 10 z", fill: v.color }))));
  root.append(defs);

  for (const g of GROUPS) {
    root.append(svg("rect", { x: g.x, y: g.y, width: g.w, height: g.h, rx: 14, class: "est-group" + (g.cls ? " " + g.cls : "") }));
    root.append(svg("text", { x: g.x + 14, y: g.y + 22, class: "est-gtitle" }, g.title));
  }

  const edgeEls = new Map();
  for (const e of edges.values()) {
    const p = svg("path", { d: e.d, class: `est-edge k-${e.kind}`, "marker-end": `url(#est-arr-${e.kind})` });
    root.append(p);
    edgeEls.set(e.a + ">" + e.b, p);
  }

  const nodeEls = {};
  for (const n of NODES) nodeEls[n.id] = drawNode(n);
  Object.values(nodeEls).forEach((g) => root.append(g));
  const fx = svg("g", { class: "est-fx" });
  root.append(fx);

  const reduced = still();
  const list = h("div", { class: "topo-runs" });
  const detail = h("div", { class: "topo-detail" });
  let token = 0, timer = null, sel = null;

  const intro = () => detail.replaceChildren(h("p", { class: "muted", text: "Pick a flow to watch data move through the estate, or click any box for its details. Every name and figure here is invented for the demo." }));

  FLOWS.forEach((f) => list.append(h("button", { type: "button", class: "topo-run", "aria-pressed": "false", onclick: () => playFlow(f.id) },
    h("b", { text: f.name }), h("small", { text: f.nodes.length - 1 + " steps" }))));

  function setPressed(id) {
    [...list.children].forEach((b, i) => b.setAttribute("aria-pressed", String(FLOWS[i].id === id)));
  }

  function clearMarks() {
    token++;
    clearTimeout(timer);
    root.classList.remove("flowing");
    Object.values(nodeEls).forEach((g) => g.classList.remove("on", "seen"));
    edgeEls.forEach((p) => p.classList.remove("on", "seen"));
    fx.replaceChildren();
    setPressed(null);
  }

  function travel(p, ms, mine, done) {
    const dot = svg("circle", { r: 7, class: "est-token" });
    fx.append(dot);
    const len = p.getTotalLength();
    const t0 = performance.now();
    const step = (now) => {
      if (mine !== token || !dot.isConnected) { dot.remove(); return; }
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      const pt = p.getPointAtLength(len * k);
      dot.setAttribute("cx", pt.x);
      dot.setAttribute("cy", pt.y);
      if (k < 1) requestAnimationFrame(step); else { dot.remove(); done(); }
    };
    requestAnimationFrame(step);
  }

  function playFlow(id) {
    const f = FLOWS.find((x) => x.id === id);
    if (!f) return;
    clearMarks();
    const mine = token;
    root.classList.add("flowing");
    setPressed(id);
    const lis = f.nodes.map((nid) => h("li", {}, h("b", { text: BY[nid].label }), h("div", { class: "d", text: BY[nid].text })));
    detail.replaceChildren(h("h3", { text: f.name }), h("p", { class: "muted", text: f.text }), h("ol", { class: "topo-steps" }, lis));
    const pairs = f.nodes.slice(1).map((b, i) => [f.nodes[i], b]);
    const go = (i) => {
      if (mine !== token) return;
      f.nodes.forEach((nid, k) => {
        nodeEls[nid].classList.toggle("on", k === i);
        nodeEls[nid].classList.toggle("seen", k < i);
      });
      lis.forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("now", k === i); });
      if (i >= pairs.length) return;
      const [a, b] = pairs[i];
      const p = edgeEls.get(a + ">" + b);
      p.classList.add("on");
      travel(p, reduced ? 0 : 1100, mine, () => {
        p.classList.remove("on");
        p.classList.add("seen");
        timer = setTimeout(() => go(i + 1), reduced ? 0 : 350);
      });
    };
    go(0);
  }

  function select(id) {
    const n = BY[id];
    if (!n) return;
    clearMarks();
    if (sel) nodeEls[sel].classList.remove("sel");
    sel = id;
    nodeEls[id].classList.add("sel");
    const flows = FLOWS.filter((f) => f.nodes.includes(id));
    detail.replaceChildren(
      h("h3", { text: n.label }),
      h("div", { class: "meta", text: GROUP_BY[n.g].title }),
      h("p", { text: n.text }),
      n.sub ? h("div", { class: "topo-chips" }, pill(n.sub, "info")) : null,
      h("h4", { text: flows.length ? "Flows through it" : "No flow passes through it" }),
      h("div", { class: "topo-chips" }, flows.map((f) => h("button", { type: "button", class: "btn", text: f.name, onclick: () => playFlow(f.id) }))));
  }

  function hot(id, on) {
    for (const e of edges.values()) if (e.a === id || e.b === id) edgeEls.get(e.a + ">" + e.b).classList.toggle("hot", on);
  }

  Object.entries(nodeEls).forEach(([id, g]) => {
    g.addEventListener("click", () => select(id));
    g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(id); } });
    g.addEventListener("pointerenter", () => hot(id, true));
    g.addEventListener("pointerleave", () => hot(id, false));
  });

  const reset = () => {
    clearMarks();
    if (sel) nodeEls[sel].classList.remove("sel");
    sel = null;
    intro();
  };

  const legend = h("div", { class: "est-legend" }, Object.entries(KIND).map(([k, v]) => h("span", {}, h("i", { class: "est-sw k-" + k }), v.label)));

  intro();
  return h("div", { class: "est" },
    h("div", { class: "banner" }, icon("alert"), "Illustrative only: every name and figure on this page is invented. Live numbers appear in the other documents."),
    h("div", { class: "topo-grid" },
      h("div", { class: "card topo-stage" }, root,
        h("p", { class: "muted", text: "Arrows show where data, access and cost move. Hover a box to see its links, click it for details, or play a flow to watch it move." })),
      h("div", { class: "card topo-side" },
        h("h3", { text: "Flows" }), list,
        h("div", { class: "toolbar topo-ctrl" }, h("button", { class: "btn", type: "button", onclick: reset }, icon("close"), "Clear")),
        legend, detail)));
}

function drawNode(n) {
  const g = svg("g", { class: "est-node", "data-id": n.id, tabindex: "0", role: "button", "aria-label": n.sub ? `${n.label}, ${n.sub}` : n.label });
  g.append(svg("title", {}, n.sub ? `${n.label}: ${n.sub}` : n.label));
  g.append(svg("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, class: "est-box" }));
  // A logo sits at the left of a box; a box without one centres its text. Narrow boxes use a smaller logo and type.
  const narrow = n.w < 180;
  const cy = n.y + n.h / 2;
  let tx = n.x + n.w / 2, anchor = "middle";
  if (n.mark) {
    const size = narrow ? 22 : 28;
    g.append(svg("g", { transform: `translate(${n.x + 8} ${n.y + (n.h - size) / 2})` }, markGroup(n.mark, size)));
    tx = n.x + 8 + size + 8;
    anchor = "start";
  }
  g.append(svg("text", { x: tx, y: n.sub ? cy - 2 : cy + 4, "text-anchor": anchor, class: "est-label" + (narrow ? " narrow" : "") }, n.label));
  if (n.sub) g.append(svg("text", { x: tx, y: cy + 13, "text-anchor": anchor, class: "est-sub" }, n.sub));
  return g;
}
