import { h, svg, icon, fmt } from "../dom.js";

// What each data source helps identify, and for which products. This is the one place that says what a source does and does not tell you.
// level: full = the product's own data comes from it; partial = it adds context only; none = it tells you nothing about that product.
export const PRODUCTS = [
  { id: "m365", name: "Microsoft 365", note: "Teams, Exchange and the other Office apps" },
  { id: "powerplatform", name: "Power Platform", note: "Power Automate, Power Apps, connections, DLP" },
  { id: "powerbi", name: "Power BI & Fabric", note: "reports, datasets, capacities" },
  { id: "dynamics", name: "Dynamics 365", note: "Dataverse sign-ins and records" },
  { id: "sharepoint", name: "SharePoint", note: "sites and OneDrive" },
  { id: "copilot", name: "Microsoft Copilot", note: "licences and interactions" },
  { id: "visio", name: "Visio", note: "and other licensed desktop apps" },
  { id: "project", name: "Project", note: "Project plans and Planner" },
  { id: "renewal", name: "Renewal Analyze", note: "uploaded renewal workbooks" },
];

const NO_USAGE = "It cannot show use: no source in this tool records use of the desktop app.";
const f = (t) => ["full", t], p = (t) => ["partial", t], n = (t) => ["none", t];

export const SOURCES = [
  { id: "licensing", name: "Entra ID: people, licences and last sign-in", via: "Microsoft Graph",
    does: "Who works here, which licences each person holds, whether the account is enabled, and the last time they signed in to anything.",
    links: {
      m365: f("Every person, their Microsoft 365 licences, and their last sign-in to any app."),
      powerplatform: f("Each person's Power Platform licence tier and plans, so idle Premium seats show up."),
      powerbi: p("Who holds a Power BI Pro or Premium Per User licence. It says nothing about use."),
      dynamics: p("Who holds a Dynamics 365 licence. It says nothing about use."),
      sharepoint: p("Who holds a licence that includes SharePoint. It says nothing about use."),
      copilot: f("Who holds a Microsoft 365 Copilot licence: the base for finding licences nobody uses."),
      visio: p("Who holds a Visio licence, and whether that account is disabled. " + NO_USAGE),
      project: p("Who holds a Project licence, and whether that account is disabled. " + NO_USAGE),
      renewal: f("The directory the renewal decisions are checked against: disabled and departed accounts."),
    } },
  { id: "productusage", name: "Entra sign-in logs: Dynamics 365 (Dataverse)", via: "Microsoft Graph",
    does: "Who signed in to the Dataverse resource that Dynamics 365 runs on, and when. Interactive and background sign-ins both count.",
    links: {
      dynamics: f("Who signed in to Dynamics 365 and when, over the last 30 days."),
      powerplatform: p("Model-driven Power Apps use the same resource, so some of these sign-ins may be theirs."),
      renewal: p("Evidence that a person with a Dynamics licence actually signed in."),
    } },
  { id: "platform", name: "Power Platform admin: environments, flows, apps, connections", via: "Power Platform admin APIs",
    does: "Every environment, cloud flow, app, connection and DLP policy, who owns them, and what is suspended or in error.",
    links: {
      powerplatform: f("The full inventory: flows, apps, connectors, owners, DLP breaks, suspended flows and broken connections."),
      dynamics: p("Dataverse environments exist here, but no Dynamics users or records."),
      copilot: n("Copilot Studio agents are not read from the environments yet."),
    } },
  { id: "usage", name: "Entra sign-in logs: Power Automate and Power Apps portals", via: "Microsoft Graph",
    does: "Who signed in to the Power Automate and Power Apps portals, and which sign-ins failed or were blocked.",
    links: {
      powerplatform: f("Portal sign-ins per person, and failed or blocked sign-ins with the Conditional Access reason."),
      renewal: p("Evidence that a person with a Power Platform licence actually used the portals."),
    } },
  { id: "powerbi", name: "Power BI admin: activity, workspaces, capacities", via: "Power BI admin API",
    does: "What people opened, built, refreshed or exported in Power BI and Fabric, and which capacities and workspaces exist.",
    links: {
      powerbi: f("Per-person activity, the reports and datasets they used, failed activity, capacities and workspaces."),
      renewal: p("Evidence that a person with a Power BI licence actually used it."),
    } },
  { id: "purview", name: "Purview audit log: what people did in each app", via: "Office 365 Management Activity API",
    does: "Every recorded action in Teams, Exchange, SharePoint, OneDrive, Copilot and more: who did what, when, and whether it failed or was blocked.",
    links: {
      m365: f("Activity in Teams, Exchange, Forms, Planner and the other Office apps."),
      sharepoint: f("Sites and OneDrive: who opened, changed, shared or deleted what."),
      copilot: f("Copilot interactions by app, and prompts or files it blocked or could not use."),
      powerplatform: p("Flows and apps people created, edited or ran. Failed or blocked attempts show only if Microsoft records them."),
      dynamics: p("Dynamics 365 record activity. Sign-ins come from the sign-in logs instead."),
      powerbi: n("Power BI activity is read from its own API, not the audit log."),
      visio: n("Visio desktop use is not written to the audit log."),
      project: p("Planner and Project for the web activity. Project desktop use is not recorded."),
      renewal: p("Evidence that a person in a workbook was active in Microsoft 365."),
    } },
  { id: "flowhistory", name: "Power Automate: failed runs for every flow", via: "Power Automate admin API",
    does: "Which cloud flows failed in the last 28 days, when they last failed and the error the service recorded, for every flow whether or not it is in a solution.",
    links: {
      powerplatform: f("Failed runs and the last failure on the Cloud flows page, the Failed flows insights and each person's Usage page."),
    } },
  { id: "dataverse", name: "Dataverse flow runs (experimental)", via: "Dataverse Web API",
    does: "How often each cloud flow in a solution ran in the last 7 days and how often it failed, with the latest error message.",
    links: {
      powerplatform: f("Run counts, failed runs and the latest error for flows in solutions."),
      dynamics: p("Flows that run against Dataverse tables."),
    } },
  { id: "capacity", name: "Power Platform admin: Dataverse storage by environment", via: "Power Platform admin APIs",
    does: "How much Dataverse database, file and log storage each environment uses, so the biggest consumers and likely overage are visible.",
    links: {
      powerplatform: f("Storage used by every environment. Tenant entitlements and per-table detail are only in the admin center."),
      dynamics: p("Dataverse environments show their storage; nothing about Dynamics users."),
    } },
  { id: "costmgmt", name: "Azure Cost Management: Power Platform and Copilot pay-as-you-go", via: "Azure Resource Manager",
    does: "What Power Platform and Copilot Studio pay-as-you-go plans cost in Azure each month. Prepaid licences and prepaid Copilot Credits are not in it.",
    links: {
      copilot: p("Copilot Studio pay-as-you-go cost and the credits it implies. Microsoft 365 Copilot licences and tokens are not billed here."),
      powerplatform: f("Pay-as-you-go cost of Power Apps, Power Automate, Power Pages and Dataverse overage."),
    } },
  { id: "datalake", name: "Data Lake history", via: "Azure Data Lake Storage",
    does: "Keeps trend history in your own storage so charts can go back further than the last sync.",
    links: {},
  },
];

const NONE_DEFAULT = (src, prod) => `${src.id === "datalake" ? "Trend history only" : "Nothing from this source"} relates to ${prod.name}.`;
export const linkOf = (src, prodId) => src.links[prodId] || n(NONE_DEFAULT(src, PRODUCTS.find((x) => x.id === prodId)));

// How old data is, as a colour: loads run once a day, so the scale is 24 hours, green at 0 shading to red at 24 or more.
export const hoursSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : null);
export const freshClass = (hrs) => (hrs == null ? "f-none" : "f" + Math.min(24, Math.max(0, Math.floor(hrs))));

export function moduleState(ctx, id) {
  const m = ctx.status.modules.find((x) => x.id === id);
  if (!m || !m.enabled) return { id, enabled: false, loaded: false, cls: "f-off", text: "switched off", hours: null };
  const hrs = hoursSince(m.lastSync), running = m.state === "running" || !!m.progress;
  if (m.state === "error") return { id, enabled: true, loaded: false, error: true, cls: "f-err", text: "error", hours: hrs, mod: m };
  if (!m.lastSync) return { id, enabled: true, loaded: false, running, cls: "f-none", text: running ? "loading now" : "not loaded yet", hours: null, mod: m };
  return { id, enabled: true, loaded: true, running, cls: freshClass(hrs), text: fmt.ago(m.lastSync), hours: hrs, mod: m };
}

// Is a product fully loaded, and how stale is its stalest source? Only sources that feed the product itself count.
export function productFeed(ctx, pid) {
  const needs = SOURCES.filter((s) => s.links[pid]?.[0] === "full").map((s) => ({ src: s, ...moduleState(ctx, s.id) })).filter((x) => x.enabled);
  if (!needs.length) return null;
  const loaded = needs.filter((x) => x.loaded);
  const full = loaded.length === needs.length;
  const stalest = loaded.length ? Math.max(...loaded.map((x) => x.hours)) : null;
  const err = needs.some((x) => x.error);
  return { needs, loaded: loaded.length, full, stalest, cls: err && !full ? "f-err" : full ? freshClass(stalest) : loaded.length ? freshClass(stalest) : "f-none", err };
}

const PULL_OF = { copilot: "copilot", sharepoint: "sharepoint" };
export function pullLine(ctx, pid) {
  const src = PULL_OF[pid];
  if (!src) return null;
  const pl = ctx.status.pulls?.[src];
  if (pl?.state === "queued") return "Deep read queued: it starts when the running sync or read finishes";
  if (pl?.progress) return pl.progress.total ? `Deep read running: ${fmt.n(pl.progress.done)} of ${fmt.n(pl.progress.total)} blobs` : `Deep read starting: ${fmt.n(pl.progress.done)} blobs listed so far`;
  if (pl?.state === "error") return `Deep read failed: ${pl.detail}`;
  if (pl?.at) return `Deep read ${fmt.ago(pl.at)}: ${fmt.n(pl.events)} events over ${pl.days} days${pl.truncated ? " (stopped at the blob limit)" : ""}`;
  return "Deep read not run: counts are from the all-products sample";
}

export function legend() {
  return h("div", { class: "fresh-legend" },
    h("div", { class: "lg-head" }, h("b", { text: "How fresh is the data?" }), h("span", { class: "muted", text: " Each product takes the colour of its stalest source." })),
    h("div", { class: "lg-bar" }, Array.from({ length: 25 }, (_, i) => h("span", { class: "lg-seg f" + i, title: i === 24 ? "24 h or more" : `${i}-${i + 1} h` }))),
    h("div", { class: "lg-ticks muted" }, ["just loaded", "6 h", "12 h", "18 h", "24 h +"].map((t) => h("span", { text: t }))),
    h("div", { class: "muted lg-note", text: "The full sync runs once a day at 1:00 AM Eastern, so the scale spans 24 hours: data turns gradually redder as it ages, and is fully red only when a day has passed without a load." }));
}

// The strip on a product card: one segment per source that feeds it, coloured by age.
export function feedStrip(ctx, pid) {
  const feed = productFeed(ctx, pid);
  if (!feed) return null;
  const word = feed.full ? "Fully loaded" : feed.err ? "A source has an error" : feed.loaded ? `Loading: ${feed.loaded} of ${feed.needs.length} sources in` : "Not loaded yet";
  const age = feed.stalest == null ? "" : "stalest source " + fmt.ago(new Date(Date.now() - feed.stalest * 36e5).toISOString());
  const pull = pullLine(ctx, pid);
  return h("div", { class: "feed " + feed.cls, title: feed.needs.map((x) => `${x.src.id}: ${x.text}`).join("\n") },
    h("div", { class: "feed-row" }, h("span", { class: "fdot" }), h("b", { text: word }), h("span", { class: "muted", text: age })),
    h("div", { class: "segs" }, feed.needs.map((x) => h("span", { class: "seg " + x.cls, title: `${x.src.id}: ${x.text}` }))),
    pull ? h("div", { class: "muted feed-pull", text: pull }) : null);
}

const LEVEL_WORD = { full: "feeds", partial: "adds context", none: "nothing" };
const LEVEL_TITLE = { full: "Feeds it", partial: "Adds context", none: "Does nothing for it" };

// A source card: what it helps identify and which products it does and does not reach.
export function sourceCard(ctx, src, onOpen) {
  const st = moduleState(ctx, src.id);
  const by = (lvl) => PRODUCTS.filter((x) => linkOf(src, x.id)[0] === lvl);
  const none = by("none");
  return h("div", { class: "card srccard " + st.cls, tabindex: "0", role: "button", "aria-label": `${src.name}: show which products it feeds`, onclick: onOpen, onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen()) },
    h("div", { class: "src-head" }, h("span", { class: "fdot" }), h("b", { text: src.name }), h("span", { class: "muted src-age", text: st.text })),
    h("p", { class: "src-does", text: src.does }),
    h("div", { class: "src-links" }, by("full").map((x) => h("span", { class: "lk full", title: linkOf(src, x.id)[1], text: x.name })), by("partial").map((x) => h("span", { class: "lk partial", title: linkOf(src, x.id)[1], text: x.name })),
      none.length ? h("span", { class: "lk none", title: none.map((x) => x.name).join(", "), text: `nothing for ${none.length}` }) : null),
    h("div", { class: "muted src-zoom", text: "Click to see the connections" }));
}

// The zoomed view: the source in the middle of its connections, or a product in the middle of the sources that feed it.
export function openZoom(ctx, kind, id) {
  const lastFocus = document.activeElement;
  const isSource = kind === "source";
  const src = isSource ? SOURCES.find((x) => x.id === id) : null;
  const prod = isSource ? null : PRODUCTS.find((x) => x.id === id);
  const others = (isSource ? PRODUCTS : SOURCES).map((o) => {
    const [level, text] = isSource ? linkOf(src, o.id) : linkOf(o, prod.id);
    return { id: o.id, name: o.name, level, text, state: isSource ? null : moduleState(ctx, o.id) };
  }).sort((a, b) => ["full", "partial", "none"].indexOf(a.level) - ["full", "partial", "none"].indexOf(b.level));
  const st = isSource ? moduleState(ctx, id) : productFeed(ctx, id);
  const centreName = isSource ? src.name : prod.name;

  const W = 760, rowH = 50, nodeH = 40, top = 14, H = Math.max(others.length * rowH + top * 2, 190), cy = H / 2, cx0 = 24, cw = 236, ox = 520, ow = 216;
  const diagram = svg("svg", { class: "zoom-svg", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${centreName}: connections` });
  others.forEach((o, i) => {
    const y = top + i * rowH + nodeH / 2;
    diagram.append(svg("path", { class: `lk-line lk-${o.level}${isSource ? "" : " rev"}`, d: `M${cx0 + cw},${cy} C${(cx0 + cw + ox) / 2},${cy} ${(cx0 + cw + ox) / 2},${y} ${ox},${y}` }));
    if (o.level === "none") diagram.append(svg("text", { class: "lk-x", x: (cx0 + cw + ox) / 2, y: (cy + y) / 2 + 4, "text-anchor": "middle" }, "\u2715"));
  });
  const [titleA, titleB] = centreName.includes(": ") ? [centreName.split(": ")[0], centreName.split(": ").slice(1).join(": ")] : [centreName, ""];
  const clip = (s, k) => (s.length > k ? s.slice(0, k - 1) + "\u2026" : s);
  diagram.append(...[svg("rect", { class: "node centre " + (st?.cls || "f-none"), x: cx0, y: cy - 40, width: cw, height: 80, rx: 12 }),
    svg("text", { class: "node-t", x: cx0 + cw / 2, y: cy - 14, "text-anchor": "middle" }, clip(titleA, 28)),
    titleB ? svg("text", { class: "node-s", x: cx0 + cw / 2, y: cy + 3, "text-anchor": "middle" }, clip(titleB, 36)) : null,
    svg("text", { class: "node-s", x: cx0 + cw / 2, y: cy + 26, "text-anchor": "middle" }, isSource ? (st.enabled ? st.text : "switched off") : (st ? (st.full ? "fully loaded" : "not fully loaded") : "no source"))].filter(Boolean));
  others.forEach((o, i) => {
    const y = top + i * rowH;
    diagram.append(svg("rect", { class: `node other n-${o.level}`, x: ox, y, width: ow, height: nodeH, rx: 9 }),
      svg("text", { class: "node-t", x: ox + 12, y: y + 17 }, o.name.length > 24 ? o.name.slice(0, 23) + "\u2026" : o.name),
      svg("text", { class: "node-s", x: ox + 12, y: y + 32 }, LEVEL_WORD[o.level] + (o.state && o.state.enabled ? `, ${o.state.text}` : o.state && !o.state.enabled ? ", switched off" : "")));
  });

  const groups = ["full", "partial", "none"].map((lvl) => [lvl, others.filter((o) => o.level === lvl)]).filter(([, l]) => l.length);
  const detail = groups.map(([lvl, list]) => h("div", { class: "zg" }, h("h4", { class: "zg-" + lvl, text: isSource ? LEVEL_TITLE[lvl] : { full: "Feeds this product", partial: "Adds context", none: "Does nothing for this product" }[lvl] }),
    h("ul", {}, list.map((o) => h("li", {}, h("b", { text: o.name }), h("span", { text: " " + o.text }))))));

  const actions = [];
  if (isSource && st.enabled && ctx.status.mode === "live") {
    actions.push(h("button", { class: "btn", type: "button", disabled: !!ctx.manualOff(), title: ctx.manualOff(), onclick: () => { ctx.sync(id); close(); } }, icon("refresh"), "Sync this source"));
    if (id === "purview") for (const k of Object.keys(PULL_OF)) actions.push(h("button", { class: "btn", type: "button", disabled: !!ctx.manualOff(), title: ctx.manualOff(), onclick: () => { ctx.pull(k); close(); } }, icon("download"), `Deep read: ${k === "copilot" ? "Copilot" : "SharePoint"} only`));
  }
  const closeBtn = h("button", { class: "btn sm zoom-close", type: "button", "aria-label": "Close", onclick: () => close() }, icon("close"));
  const panel = h("div", { class: "zoom-panel", role: "dialog", "aria-modal": "true", "aria-label": centreName },
    h("div", { class: "zoom-head" }, h("div", {}, h("h2", { text: centreName }), h("p", { class: "muted", text: isSource ? src.does : `Sources that feed ${prod.name}, and the ones that tell you nothing about it.` })), closeBtn),
    isSource ? h("p", { class: "muted", text: `Read through ${src.via}.${st.mod?.lastSync ? ` Last synced ${fmt.dt(st.mod.lastSync)}.` : ""}` }) : null,
    diagram, h("div", { class: "zoom-detail" }, detail), actions.length ? h("div", { class: "toolbar" }, actions) : null);
  const backdrop = h("div", { class: "zoom-backdrop", onclick: (e) => e.target === backdrop && close() }, panel);
  const onKey = (e) => e.key === "Escape" && close();
  function close() { backdrop.remove(); document.removeEventListener("keydown", onKey); lastFocus?.focus?.(); }
  document.addEventListener("keydown", onKey);
  document.body.append(backdrop);
  closeBtn.focus();
}

// A table of every source against every product: the whole picture in one place.
export function matrix(ctx) {
  const sym = { full: ["\u25CF", "feeds"], partial: ["\u25D0", "adds context"], none: ["\u2013", "nothing"] };
  return h("div", { class: "tablewrap" }, h("table", { class: "dt matrix" },
    h("thead", {}, h("tr", {}, h("th", { text: "Source" }), PRODUCTS.map((x) => h("th", { title: x.note, text: x.name })))),
    h("tbody", {}, SOURCES.map((s) => h("tr", { class: "click", onclick: () => openZoom(ctx, "source", s.id) },
      h("td", {}, h("span", { class: "fdot " + moduleState(ctx, s.id).cls }), " ", s.id),
      PRODUCTS.map((x) => { const [lvl, t] = linkOf(s, x.id); return h("td", { class: "mx " + lvl, title: `${s.id} ${sym[lvl][1]} ${x.name}: ${t}`, text: sym[lvl][0] }); }))))),
    h("caption", { class: "muted", text: "\u25CF feeds the product, \u25D0 adds context only, \u2013 tells you nothing about it. Click a row to zoom in." }));
}
