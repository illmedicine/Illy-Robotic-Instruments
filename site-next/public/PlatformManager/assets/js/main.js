import { h, icon, fmt } from "./dom.js";
import { api } from "./api.js";
import { ROOT, HASH_ROUTES, urlFor, currentRoute, routeFromHref, go as navigate, onRoute, replaceRoute } from "./route.js";
import { initSound } from "./sound.js";
import * as overview from "./pages/overview.js";
import * as inv from "./pages/inventory.js";
import * as people from "./pages/people.js";
import * as gov from "./pages/governance.js";
import * as builder from "./pages/builder.js";
import * as savings from "./pages/savings.js";
import * as aibuilder from "./pages/aibuilder.js";
import * as dlp from "./pages/dlp.js";
import * as remediation from "./pages/remediation.js";
import * as imports from "./pages/imports.js";
import * as fabric from "./pages/fabric.js";
import * as fabrictopology from "./pages/fabrictopology.js";
import * as renewal from "./pages/renewalposition.js";
import * as waste from "./pages/licencewaste.js";
import * as contracts from "./pages/contracts.js";
import * as advisor from "./pages/advisor.js";
import * as reference from "./pages/reference.js";
import * as workspace from "./pages/workspace.js";
import * as dynamics from "./pages/dynamics.js";
import * as m365 from "./pages/m365.js";
import { page as peoplePage } from "./pages/peopleusage.js";
import * as person from "./pages/person.js";
import * as personuse from "./pages/personuse.js";
import * as products from "./pages/products.js";
import * as spend from "./pages/spend.js";
import * as flowrepair from "./pages/flowrepair.js";
import * as flowbrowser from "./pages/flowbrowser.js";
import * as privacy from "./pages/privacy.js";
import * as groups from "./pages/groups.js";
import * as analyzer from "./pages/analyzer.js";
import * as assistant from "./pages/assistant.js";
import * as mine from "./pages/me.js";
import * as access from "./pages/access.js";
import * as foundry from "./pages/foundry.js";
import * as foundryagents from "./pages/foundryagents.js";
import * as foundrytopo from "./pages/foundrylandscape.js";
import * as foundryspend from "./pages/foundryspend.js";
import * as connect from "./pages/connect.js";
import * as support from "./pages/support.js";
import * as fabricflow from "./pages/fabricflow.js";
import { syncWorkspace } from "./tenantprofile.js";

// Every module above loaded: tell the boot watchdog (assets/js/boot-check.js) the app can start.
window.__ppmReady = true;
try { sessionStorage.removeItem("ppm-boot-retry"); } catch (e) { /* storage blocked */ }

// One main menu per Microsoft product. `top` pages sit above the products; `product` starts a menu; `section` starts a
// labelled run (Inventory, People, Govern, Optimize...) inside it. Page ids are the URLs, so moving a page never breaks a link.
const PAGES = [
  { top: true, id: "overview", label: "Overview", icon: "home", render: overview.render },
  { top: true, id: "me", label: "My overview", icon: "users", render: mine.render },
  { hidden: true, id: "person", label: "Person", icon: "users", render: person.page },
  { hidden: true, id: "personuse", label: "Person activity", icon: "users", render: personuse.page },
  { hidden: true, id: "privacy", label: "Privacy & security", icon: "shield", render: privacy.render },
  { product: "Settings", id: "support", label: "Updates & support", icon: "shield", render: support.render },
  { id: "showcase", label: "Platform showcase", icon: "app", external: ROOT + "assets/showcase" },

  { product: "Microsoft 365", section: "Monitor", id: "m365activity", label: "App activity", icon: "chart", render: m365.render },
  { section: "People", id: "m365people", label: "Usage", icon: "users", render: peoplePage("m365", "Microsoft 365 usage by person", "Who has used Teams, Exchange, SharePoint, OneDrive, Copilot and the other Microsoft 365 apps, and when. Licensed people with no activity show as No activity.", "m365-usage") },
  { id: "groups", label: "Group lookup", icon: "users", render: groups.render },
  { id: "analyzer", label: "Insights Analyzer", icon: "chart", render: analyzer.render },
  { section: "Govern", id: "purviewmap", label: "Data Map", icon: "database", render: gov.purviewMap },
  { section: "Optimize", id: "licencewaste", label: "Licence waste", icon: "chart", render: waste.render },
  { section: "Build", id: "m365builder", label: "AI Builder", agent: "Microsoft 365", icon: "flow", render: assistant.page("m365") },
  { id: "m365recipes", label: "CLI recipes", icon: "terminal", render: builder.page("m365") },

  { product: "Power Platform", section: "Monitor", id: "ppsummary", label: "Summary", icon: "home", render: overview.powerPlatform },
  { id: "flows", label: "Cloud flows", icon: "flow", render: inv.flows },
  { id: "apps", label: "Apps", icon: "app", render: inv.apps },
  { id: "connections", label: "Connections", icon: "plug", render: inv.connections },
  { id: "environments", label: "Environments", icon: "env", render: inv.environments },
  { section: "People", id: "licensing", label: "Licensing", icon: "license", render: people.licensing },
  { id: "usage", label: "Usage", icon: "chart", render: people.usage },
  { section: "Govern", id: "governance", label: "Governance", icon: "shield", render: gov.governance, badge: true },
  { id: "dlp", label: "DLP", icon: "shield", render: dlp.render },
  { id: "remediation", label: "Remediation", icon: "terminal", render: remediation.render },
  { section: "Optimize", id: "savings", label: "Savings & insights", icon: "chart", render: savings.render },
  { id: "ppspend", label: "Spend & capacity", icon: "env", render: spend.capacity },
  { section: "Build", id: "aibuilder", label: "AI Builder", agent: "Power Platform", icon: "flow", render: aibuilder.render },
  { id: "flowrepair", label: "Fix a flow", agent: "Fix a flow", icon: "flow", render: flowrepair.render },
  { id: "flowbrowser", label: "Edit in Power Automate", agent: "Flow editor", icon: "flow", render: flowbrowser.render },
  { id: "builder", label: "CLI recipes", icon: "terminal", render: builder.render },

  { product: "Power BI & Fabric", section: "Monitor", id: "pbiactivity", label: "Activity & capacities", icon: "chart", render: people.powerBi },
  { section: "People", id: "pbipeople", label: "Usage", icon: "users", render: peoplePage("powerbi", "Power BI usage by person", "Who has used Power BI and when, from the Power BI activity log.", "powerbi-usage") },
  { section: "Optimize", id: "fabric", label: "Fabric planner", icon: "chart", render: fabric.render },
  { section: "Optimize", id: "fabrictopology", label: "Migration topology", icon: "env", render: fabrictopology.render },
  { id: "fabricflow", label: "Workflows", icon: "flow", render: fabricflow.render },
  { section: "Build", id: "pbibuilder", label: "AI Builder", agent: "Power BI & Fabric", icon: "flow", render: assistant.page("powerbi") },
  { id: "pbirecipes", label: "CLI recipes", icon: "terminal", render: builder.page("powerbi") },

  { product: "Dynamics 365", section: "People", id: "dynamics", label: "Usage", icon: "users", render: dynamics.render },
  { section: "Build", id: "dynbuilder", label: "AI Builder", agent: "Dynamics 365", icon: "flow", render: assistant.page("dynamics") },
  { id: "dynrecipes", label: "CLI recipes", icon: "terminal", render: builder.page("dynamics") },

  { product: "SharePoint", section: "Monitor", id: "spactivity", label: "Activity", icon: "chart", render: products.sharepoint },
  { section: "People", id: "sppeople", label: "Usage", icon: "users", render: peoplePage("sharepoint", "SharePoint usage by person", "Who has worked in SharePoint sites and OneDrive, and when. Licensed people with no activity show as No activity. Pick a person for the sites they used and their sharing changes.", "sharepoint-usage") },
  { section: "Build", id: "spbuilder", label: "AI Builder", agent: "SharePoint", icon: "flow", render: assistant.page("sharepoint") },
  { id: "sprecipes", label: "CLI recipes", icon: "terminal", render: builder.page("sharepoint") },

  { product: "Microsoft Copilot", section: "Monitor", id: "copilotactivity", label: "Activity", icon: "chart", render: products.copilot },
  { id: "copilotspend", label: "Spend", icon: "license", render: spend.copilot },
  { section: "People", id: "copilotpeople", label: "Usage", icon: "users", render: peoplePage("copilot", "Microsoft Copilot usage by person", "Who holds a Copilot licence and who has used it. A licence with no activity next to it is a licence nobody is using.", "copilot-usage") },
  { section: "Build", id: "copilotbuilder", label: "AI Builder", agent: "Microsoft Copilot", icon: "flow", render: assistant.page("copilot") },
  { id: "copilotrecipes", label: "CLI recipes", icon: "terminal", render: builder.page("copilot") },

  { product: "Azure AI Foundry", section: "Monitor", id: "foundryoverview", label: "Agent overview", icon: "home", render: foundry.overview },
  { id: "foundryspend", label: "AI spend", icon: "license", render: foundryspend.spend },
  { section: "Optimize", id: "foundrytopology", label: "AI topology", icon: "env", render: foundrytopo.render },
  { section: "Govern", id: "foundryagents", label: "Agent administration", icon: "shield", render: foundryagents.render },
  { id: "foundrymodels", label: "Models", icon: "database", render: foundry.models },

  { product: "Microsoft Renewal Analyze", id: "imports", label: "Upload workbook", icon: "database", render: imports.imports },
  { id: "triage", label: "Validate renewal decisions", icon: "shield", render: imports.triage },
  { id: "search", label: "Search exports", icon: "search", render: imports.search },
  { id: "renewalposition", label: "Renewal position", icon: "license", render: renewal.render },
  { id: "contracts", label: "Contract review", icon: "copy", render: contracts.render },
  { id: "advisor", label: "Renewal advisor", icon: "check", render: advisor.render },
  { id: "contractagent", label: "Contract Renewal Agent", icon: "flow", render: assistant.page("contracts") },

  { product: "Reference & setup", section: "Setup", id: "connect", label: "Connect your tenant", icon: "plug", render: connect.render },
  { id: "sources", label: "Data sources", icon: "database", render: gov.sources },
  { id: "access", label: "Users & roles", icon: "shield", render: access.render },
  { id: "workspace", label: "Workspace & rate card", icon: "env", render: workspace.render },
  { section: "Reference", id: "products", label: "Product catalogue", icon: "app", render: reference.products },
  { id: "transitions", label: "Licensing changes", icon: "refresh", render: reference.transitions },
  { id: "terms", label: "Contract terms", icon: "database", render: reference.terms },
];

const main = document.getElementById("main");
const nav = document.getElementById("nav");
const ctx = {
  status: null,
  go: (route) => navigate(route),
  // Why the manual sync and deep-read buttons are disabled, or "" when they work.
  manualOff() {
    const s = this.status;
    return s && s.manualSync === false ? `Manual sync is turned off. Everything is read by the daily sync at ${s.schedule?.time || "01:00"}, including the Copilot and SharePoint deep reads.` : "";
  },
  async sync(module) {
    if (ctx.manualOff()) return;
    await api.sync(module).catch((e) => alert(e.message));
    await refreshStatus(true);
  },
  refreshStatus: () => refreshStatus(),
  async pull(source) {
    if (ctx.manualOff()) return;
    await api.pull(source).catch((e) => alert(e.message));
    await refreshStatus(true);
  },
};

let current = null, renderToken = 0, lastSyncKey = "", stale = false, lastActive = Date.now();

// A background sync must never pull the page out from under someone who is reading or typing: refresh once they pause.
for (const ev of ["pointerdown", "keydown", "wheel"]) document.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true });
const userBusy = () => document.querySelector(".drawer") || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || Date.now() - lastActive < 10000;

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

// Which capability a page needs (the server enforces the same rules on every call; this only hides what a person cannot open).
// A page not listed here is admin-only. "self" is the personal profile, "builder" the AI Builder agents, "contracts" the renewal and contracts area.
const NEED = {
  me: "self", personuse: "self", privacy: "self", flowrepair: "builder", flowbrowser: "builder",
  m365builder: "builder", aibuilder: "builder", pbibuilder: "builder", dynbuilder: "builder", spbuilder: "builder", copilotbuilder: "builder",
  support: "self", fabricflow: "self", showcase: "self", imports: "contracts", triage: "contracts", search: "contracts", renewalposition: "contracts", contracts: "contracts", advisor: "contracts", contractagent: "contracts",
  workspace: "contracts", products: "contracts", transitions: "contracts", terms: "contracts",
};
const needOf = (p) => NEED[p.id] || "admin";
const CONTRACT_PAGES = new Set(["imports", "triage", "renewalposition", "contracts", "advisor", "contractagent"]);

// Every page learns its product menu and section from where it sits in the list above, before any page is filtered out.
let curGroup = "", curSection = "";
for (const p of PAGES.filter((x) => !x.top && !x.hidden)) {
  if (p.product) { curGroup = p.product; curSection = ""; }
  if (p.section) curSection = p.section;
  p.grp = curGroup;
  p.sec = curSection;
}

// A server from before the sign-in update has no /api/me: it has no roles either, so everyone is an administrator, as before.
async function loadMe() {
  try {
    return await api.me();
  } catch (e) {
    if (e.status === 404) return { role: "admin", roleLabel: "Platform Global Admin", caps: ["self", "builder", "contracts", "admin"], upn: "", name: "", sso: false, mode: null };
    throw e;
  }
}
let me;
try {
  me = await loadMe();
} catch (e) {
  main.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.status === 503 ? e.message : `Could not start: ${e.message}`));
  throw e;
}
ctx.me = me;
const isAdmin = me.role === "admin";
const mayOpen = (p) => me.caps.includes(needOf(p)) && !(p.id === "me" && !me.upn);
PAGES.find((p) => p.id === "me").label = isAdmin ? "My profile" : "My overview";
const LANDING = isAdmin ? "overview" : "me";
// The administrator's data feeds and sync controls do not exist for anyone else.
if (!isAdmin) ctx.status = { mode: me.mode, modules: [], pulls: {}, syncing: false, tenant: {}, manualSync: false };

// Products (collapsible menus) with their labelled sections, in order. Standalone pages are kept apart.
// Everyone sees the same product menus; a person only gets the pages their role allows (the AI Builder agents under each product for General Users).
const TOP = PAGES.filter((p) => p.top && mayOpen(p));
const GROUPS = [];
for (const p of PAGES.filter((x) => !x.top && !x.hidden && mayOpen(x))) {
  let g = GROUPS.find((x) => x.name === p.grp);
  if (!g) GROUPS.push(g = { name: p.grp, sections: [] });
  let s = g.sections.find((x) => x.name === p.sec);
  if (!s) g.sections.push(s = { name: p.sec, pages: [] });
  s.pages.push(p);
}
const groupOf = (id) => GROUPS.find((g) => g.sections.some((s) => s.pages.some((p) => p.id === id)))?.name;
const PRODUCT_USAGE_PAGE = { powerplatform: "usage", powerbi: "pbipeople", dynamics: "dynamics", sharepoint: "sppeople", copilot: "copilotpeople", m365: "m365people" };
const groupPages = (g) => g.sections.flatMap((s) => s.pages);

// Pinned by default; the user unpins to get the full width and reopens the navigation from the menu button.
let pinned = store.get("ppm-nav-pinned", true) !== false;
let flyoutOpen = false;
// null until the user first collapses or expands something: then only the current product starts open.
let openGroups = store.get("ppm-nav-products", null);
const menubtn = document.getElementById("menubtn");
menubtn.replaceChildren(icon("menu"));

function isOpen(name) {
  return openGroups ? openGroups.includes(name) : name === groupOf(current);
}

function toggleGroup(name) {
  const open = new Set(openGroups ?? [groupOf(current)]);
  open.has(name) ? open.delete(name) : open.add(name);
  openGroups = [...open];
  store.set("ppm-nav-products", openGroups);
  buildNav(ctx.findings);
}

// The Platform Manager logo: a fresh start. My overview opens and every product menu is collapsed.
document.getElementById("brand")?.addEventListener("click", (e) => {
  e.preventDefault();
  openGroups = [];
  store.set("ppm-nav-products", openGroups);
  navigate("me");
});

function applyPin() {
  document.body.classList.toggle("nav-unpinned", !pinned);
  nav.classList.toggle("open", pinned || flyoutOpen);
  menubtn.setAttribute("aria-expanded", String(!pinned && flyoutOpen));
}

function setPinned(value) {
  pinned = value;
  flyoutOpen = false;
  store.set("ppm-nav-pinned", pinned);
  applyPin();
  buildNav(ctx.findings);
}

function closeFlyout() {
  if (pinned || !flyoutOpen) return;
  flyoutOpen = false;
  applyPin();
}

function buildNav(findings = 0) {
  const focusKey = document.activeElement?.dataset?.navKey;
  const link = (p) => h("a", p.external ? { href: p.external, target: "_blank", rel: "noopener", onclick: closeFlyout } : { href: urlFor(p.id), "aria-current": p.id === current ? "page" : null, onclick: closeFlyout }, icon(p.icon), p.label,
    p.badge && findings ? h("span", { class: "badge", text: findings }) : null);
  const pinLabel = pinned ? "Unpin navigation (use the full width)" : "Pin navigation open";
  nav.replaceChildren(
    h("div", { class: "nav-tools" },
      h("span", { class: "nav-title", text: "Navigation" }),
      h("button", { type: "button", class: "nav-pin", "aria-pressed": String(pinned), title: pinLabel, "aria-label": pinLabel, "data-nav-key": "pin", onclick: () => setPinned(!pinned) }, icon("pin"))),
    ...TOP.map((p) => h("div", { class: "nav-top" }, link(p))),
    ...GROUPS.map((g) => {
      const open = isOpen(g.name);
      const badge = !open && groupPages(g).some((p) => p.badge) && findings ? h("span", { class: "badge", text: findings }) : null;
      return h("div", { class: "grp" + (open ? "" : " closed") },
        h("button", { type: "button", class: "grp-head", "aria-expanded": String(open), "data-nav-key": "g:" + g.name, onclick: () => toggleGroup(g.name) },
          icon("chevron"), h("span", { text: g.name }), badge),
        h("div", { class: "grp-body" }, g.sections.map((s) => [s.name ? h("div", { class: "sec", text: s.name }) : null, s.pages.map(link)])));
    }));
  if (focusKey) nav.querySelector(`[data-nav-key="${focusKey}"]`)?.focus();
  applyPin();
}

async function show() {
  const id = (currentRoute() || LANDING).split("/")[0];
  const found = PAGES.find((p) => p.id === id && !p.external);
  const refused = found && !mayOpen(found);
  const page = found && !refused ? found : PAGES.find((p) => p.id === LANDING);
  // A person's product view sits under that product's own Usage page in the navigation; without that page it sits under the profile.
  current = page.id === "personuse" ? (isAdmin ? PRODUCT_USAGE_PAGE[currentRoute().split("/")[1]] : "me") || page.id : page.id;
  const g = groupOf(current);
  if (g && openGroups && !openGroups.includes(g)) {
    openGroups = [...openGroups, g];
    store.set("ppm-nav-products", openGroups);
  }
  const token = ++renderToken;
  document.title = `${page.label} - Platform Manager`;
  buildNav(ctx.findings);
  main.replaceChildren(h("div", { class: "loading", text: "Loading..." }), siteFoot());
  try {
    const view = await page.render(ctx);
    if (token !== renderToken) return;
    if (CONTRACT_PAGES.has(page.id)) api.foundry.use("contracts"); // opening the renewal pages counts as use of the Contract Renewal Agent
    main.replaceChildren(...(ctx.status?.mode === "demo" ? [demoBanner()] : []),
      ...(refused || (found == null && id !== LANDING) ? [h("div", { class: "banner info" }, icon("shield"), refused ? `${me.roleLabel} access does not include that page. Here is your overview instead.` : "That page does not exist. Here is your overview instead.")] : []), view, siteFoot());
  } catch (e) {
    if (token === renderToken) main.replaceChildren(h("div", { class: "banner error" }, `Could not load this page: ${e.message}`), siteFoot());
  }
  window.scrollTo(0, 0);
}

// The last thing on every screen: where people read how sign-in works and what is recorded.
function siteFoot() {
  // Shown at the foot of every page for every role: a single centred link, not a menu item.
  return h("footer", { class: "sitefoot" }, h("a", { href: urlFor("privacy"), text: "Privacy & security" }));
}

function demoBanner() {
  return h("div", { class: "banner demo" }, icon("alert"), h("span", {}, h("b", { text: "DEMO DATA. " }),
    "Not connected to a tenant. Copy config/powerplatform.example.json to config/powerplatform.json and restart to go live. "), h("a", { href: urlFor("connect"), text: "Connect your tenant" }));
}

const livechip = document.getElementById("livechip"), livetext = document.getElementById("livetext");
const syncbtn = document.getElementById("syncbtn");

function paintChip() {
  const s = ctx.status;
  if (!s) return;
  const on = s.modules.filter((m) => m.enabled);
  const bad = on.filter((m) => m.state === "error").length, warn = on.filter((m) => m.state === "warn").length;
  const last = on.map((m) => m.lastSync).filter(Boolean).sort().at(-1);
  const kind = s.mode === "demo" ? "demo" : s.syncing ? "warn pulse" : bad ? "error" : warn ? "warn" : last ? "ok" : "warn";
  const running = on.find((m) => m.progress);
  const pulling = Object.entries(s.pulls || {}).find(([, v]) => v.progress);
  const working = running || on.find((m) => m.state === "running");
  const saved = on.some((m) => m.fromSnapshot) && s.snapshot?.savedAt;
  const syncingText = pulling ? `Deep read of ${pulling[0]}: ${fmt.n(pulling[1].progress.done)}${pulling[1].progress.total ? "/" + fmt.n(pulling[1].progress.total) : ""} ${pulling[1].progress.label}`
    : running ? `Syncing ${running.id}: ${fmt.n(running.progress.done)}${running.progress.total ? "/" + fmt.n(running.progress.total) : ""} ${running.progress.label}`
    : working ? `Syncing ${working.id}...` : "Syncing...";
  livechip.querySelector(".dot").className = "dot " + (saved && !s.syncing ? "warn" : kind);
  livetext.textContent = s.mode === "demo" ? "Demo data" : s.syncing ? syncingText : saved ? `Saved data from ${fmt.dt(saved)} (${fmt.ago(saved)})` : last ? `${on.length - bad} of ${on.length} sources live, ${fmt.ago(last)}` : "Waiting for first sync";
  syncbtn.replaceChildren(icon("refresh"), s.syncing ? "Syncing" : "Sync");
  syncbtn.disabled = s.mode === "demo" || s.syncing || !!ctx.manualOff();
  syncbtn.title = ctx.manualOff() || "Refresh all data sources now";
  if (stale && s.mode !== "demo") livetext.textContent += " - new data, refreshing when you pause";
  const next = s.schedule?.daily;
  livechip.title = next ? `Full sync every day at ${s.schedule.time} (${s.schedule.timezone}). Next: ${fmt.dt(next)}.` : "";
}

async function refreshStatus(force) {
  if (!isAdmin) return; // the data feeds, their health and the sync controls are the administrator's
  try {
    ctx.status = await api.status();
    ctx.findings = ctx.status.mode === "demo" || ctx.status.modules.some((m) => m.lastSync) ? (await api.insights()).filter((i) => i.severity === "high").length : 0;
  } catch (e) {
    livetext.textContent = "Server unreachable";
    return;
  }
  const key = ctx.status.modules.map((m) => m.lastSync).join("|") + "#" + Object.entries(ctx.status.pulls || {}).map(([k, v]) => k + (v.at || "")).join("|");
  if (force || (key !== lastSyncKey && lastSyncKey !== "")) { api.clear(); stale = true; }
  lastSyncKey = key;
  if (stale && (force ? !document.querySelector(".drawer") : !userBusy())) { stale = false; show(); }
  paintChip();
  buildNav(ctx.findings);
}

syncbtn.addEventListener("click", () => ctx.sync());
const themebtn = document.getElementById("themebtn");
const paintTheme = () => themebtn.replaceChildren(icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon"));
themebtn.addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("ppm-theme", t); } catch { /* storage blocked */ }
  paintTheme();
});
paintTheme();
initSound(document.getElementById("soundbtn"), icon);

onRoute(show);
// A click on a link to one of the app's pages opens it in the app (no page load, Back works); other links behave as usual.
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.("a[href]");
  if (!a || a.target) return;
  const route = routeFromHref(a.getAttribute("href"));
  if (!route || !PAGES.some((p) => p.id === route.split("/")[0] && !p.external)) return;
  e.preventDefault();
  closeFlyout();
  navigate(route);
});
menubtn.addEventListener("click", () => { flyoutOpen = !flyoutOpen; applyPin(); if (flyoutOpen) nav.querySelector(".grp-head, a")?.focus(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pinned && flyoutOpen) { closeFlyout(); menubtn.focus(); } });
document.addEventListener("click", (e) => {
  // composedPath, because rebuilding the navigation detaches the clicked button before this runs.
  const inside = e.composedPath();
  if (!pinned && flyoutOpen && !inside.includes(nav) && !inside.includes(menubtn)) closeFlyout();
});
await refreshStatus();
if (me.caps.includes("contracts")) await syncWorkspace();

// Who is signed in: their name and role, and a way out. Hidden when there is no sign-in at all (an install that has not switched it on).
const userchip = document.getElementById("userchip");
if (!isAdmin) { livechip.hidden = true; syncbtn.hidden = true; }
if (me.upn) {
  const out = me.sso ? h("button", { class: "btn", type: "button", title: "Sign out of Platform Manager", onclick: async () => { await api.signOut().catch(() => {}); location.assign("/auth/signed-out"); } }, "Sign out") : null;
  userchip.replaceChildren(...[h("span", { class: "who", title: me.upn }, h("b", { text: me.name || me.upn }), h("span", { class: "role", text: me.roleLabel })), out].filter(Boolean));
  userchip.hidden = false;
}

// Back from the company sign-in: return to the page the person was on when their session ended.
try {
  const back = sessionStorage.getItem("ppm-return");
  sessionStorage.removeItem("ppm-return");
  if (back && !currentRoute()) navigate(back, { replace: true, quiet: true });
} catch { /* storage blocked */ }
// An old "#page" address opens that page at its clean address; a clean address is written in its one canonical form.
const legacy = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : "";
if (legacy && !HASH_ROUTES) navigate(legacy, { replace: true, quiet: true });
else if (!HASH_ROUTES) replaceRoute(currentRoute());
// The logo in the header leads to My overview, from any address.
document.getElementById("brand")?.setAttribute("href", urlFor("me"));
await show();
if (isAdmin) (async function poll() {
  await new Promise((r) => setTimeout(r, ctx.status?.syncing ? 3000 : 15000));
  await refreshStatus();
  poll();
})();
