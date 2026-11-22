// Page addresses. Every screen has its own clean address, for example /PlatformManager/overview or
// /PlatformManager/power-platform-summary: no "#", no ".html", no "index" and no "app" in it. Anything inside a screen
// (a person, an agent, a step of a topology) follows the screen's address: /PlatformManager/ai-foundry-agent-administration/<id>.
//
// Inside the app a route is the page id plus anything after it ("foundryagents/<id>"), exactly as the old #hash was, so the
// screens keep their ids. Only the address people see changes.
//
// GitHub Pages cannot serve deep addresses, so on github.io the same routes stay after "#" (for example
// illmedicine.github.io/PlatformManager/#privacy). Old "#" links still open the right screen on every host.

export const HASH_ROUTES = /(^|\.)github\.io$/i.test(location.hostname);

// The folder the app is served from: /PlatformManager/ on the website and github.io, / on a local server.
export const ROOT = location.pathname.startsWith("/PlatformManager/") ? "/PlatformManager/" : "/";

// Page id -> address segment. Pages not listed here use their id.
const SLUGS = {
  overview: "overview", me: "my-overview", person: "person", personuse: "person-activity", privacy: "privacy-security",
  support: "updates-support",
  m365activity: "m365-app-activity", m365people: "m365-usage", groups: "group-lookup", analyzer: "insights-analyzer",
  purviewmap: "data-map", licencewaste: "licence-waste", m365builder: "m365-ai-builder", m365recipes: "m365-cli-recipes",
  ppsummary: "power-platform-summary", flows: "cloud-flows", apps: "apps", connections: "connections",
  environments: "environments", licensing: "licensing", usage: "power-platform-usage", governance: "governance",
  dlp: "dlp", remediation: "remediation", savings: "savings-insights", ppspend: "spend-capacity",
  aibuilder: "power-platform-ai-builder", flowrepair: "fix-a-flow", flowbrowser: "edit-in-power-automate",
  builder: "power-platform-cli-recipes",
  pbiactivity: "power-bi-activity", pbipeople: "power-bi-usage", fabric: "fabric-planner",
  fabrictopology: "fabric-migration-topology", fabricflow: "fabric-workflows", pbibuilder: "power-bi-ai-builder",
  pbirecipes: "power-bi-cli-recipes",
  dynamics: "dynamics-365-usage", dynbuilder: "dynamics-365-ai-builder", dynrecipes: "dynamics-365-cli-recipes",
  spactivity: "sharepoint-activity", sppeople: "sharepoint-usage", spbuilder: "sharepoint-ai-builder",
  sprecipes: "sharepoint-cli-recipes",
  copilotactivity: "copilot-activity", copilotspend: "copilot-spend", copilotpeople: "copilot-usage",
  copilotbuilder: "copilot-ai-builder", copilotrecipes: "copilot-cli-recipes",
  foundryoverview: "ai-foundry-agent-overview", foundryspend: "ai-foundry-spend", foundrytopology: "ai-foundry-topology",
  foundryagents: "ai-foundry-agent-administration", foundrymodels: "ai-foundry-models",
  imports: "upload-workbook", triage: "validate-renewal-decisions", search: "search-exports",
  renewalposition: "renewal-position", contracts: "contract-review", advisor: "renewal-advisor",
  contractagent: "contract-renewal-agent",
  connect: "connect-your-tenant", sources: "data-sources", access: "users-roles", workspace: "workspace-rate-card",
  products: "product-catalogue", transitions: "licensing-changes", terms: "contract-terms",
};
const IDS = Object.fromEntries(Object.entries(SLUGS).map(([id, slug]) => [slug, id]));

// Route -> address. The route's segments are already percent-encoded where they need to be.
export function urlFor(route = "") {
  if (HASH_ROUTES) return ROOT + (route ? "#" + route : "");
  const [id = "", ...rest] = route.split("/");
  return ROOT + [SLUGS[id] ?? id, ...rest].filter(Boolean).join("/");
}

// Address path -> route. An unknown first segment is kept as it is, so an old id still reaches its screen.
export function parsePath(pathname) {
  if (!pathname.startsWith(ROOT)) return "";
  const parts = pathname.slice(ROOT.length).split("/").filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0].toLowerCase();
  return [IDS[first] ?? first, ...parts.slice(1)].join("/");
}

// The route of the page being shown (what location.hash used to hold, without the "#").
export function currentRoute() {
  return HASH_ROUTES ? location.hash.slice(1) : parsePath(location.pathname);
}

// The route a link points to, or null when the link leaves the app. "#page" links are routes too.
export function routeFromHref(href) {
  try {
    if (href.startsWith("#")) return decodeURIComponent(href.slice(1));
    const u = new URL(href, location.href);
    if (u.origin !== location.origin) return null;
    if (HASH_ROUTES) return u.pathname === ROOT && u.hash ? decodeURIComponent(u.hash.slice(1)) : null;
    return u.pathname.startsWith(ROOT) ? parsePath(u.pathname) : null;
  } catch {
    return null;
  }
}

const listeners = new Set();
// Called with no arguments whenever the route changes (a link, a button, Back or Forward).
export function onRoute(fn) { listeners.add(fn); }
window.addEventListener("popstate", () => listeners.forEach((fn) => fn()));
window.addEventListener("hashchange", () => listeners.forEach((fn) => fn()));

// Show another route. Pass quiet to change the address without redrawing, or replace to leave no entry in Back.
export function go(route, { replace = false, quiet = false } = {}) {
  const url = urlFor(route);
  if (url !== location.pathname + location.hash) history[replace ? "replaceState" : "pushState"](null, "", url);
  if (!quiet) listeners.forEach((fn) => fn());
}

// Change the address of the screen already on show, without a redraw (a tab, an agent or a step was chosen).
export function replaceRoute(route) {
  const url = urlFor(route);
  if (url !== location.pathname + location.hash) history.replaceState(null, "", url);
}
