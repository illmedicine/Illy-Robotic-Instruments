import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { appName, skuName } from "./names.js";
import { caret, summaryBlock } from "./productview.js";

const WORKBOOK_COLS = ["Licence", "License", "Product", "Decision", "Stage (saved vs final)", "Stage", "Annual cost", "Days since use", "Decided by", "Last saved (local)", "Times saved"];
const RESTART = "The running server does not have people lookup yet: restart it to turn it on.";
const personHref = (upn) => "#person/" + encodeURIComponent(upn);

function when(t) {
  return t ? h("span", { title: fmt.dt(t), text: fmt.ago(t) }) : h("span", { class: "muted", text: "no trace" });
}

function usageTable(p) {
  if (!p.usage.length) return h("div", { class: "empty", text: "No usage traces for this person in the data collected so far." });
  return h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, ["Product", "Application", "Last seen", "Events", "Source"].map((c) => h("th", { class: c === "Events" ? "num" : "", text: c })))),
    h("tbody", {}, p.usage.map((u) => h("tr", {}, h("td", { text: u.product }), h("td", { text: appName(u.app) }), h("td", {}, when(u.last)),
      h("td", { class: "num", text: fmt.n(u.count) }), h("td", { class: "muted", text: u.source })))));
}

function missingSources(p) {
  const s = p.sources, gaps = [];
  if (!s.usage) gaps.push("Power Platform portal sign-ins");
  if (!s.audit) gaps.push("the Purview audit log (Teams, Exchange, SharePoint, OneDrive, Copilot...)");
  if (!s.powerbi) gaps.push("Power BI activity");
  if (!s.dynamics) gaps.push("Dynamics 365 sign-ins");
  return gaps;
}

function renewalBody(p) {
  if (!p.workbook.length) return h("div", { class: "empty", text: "No rows for this person in the uploaded renewal workbooks." });
  return h("div", {}, p.workbook.map((r) => {
    const cols = Object.keys(r.values).filter((c) => WORKBOOK_COLS.includes(c) && r.values[c] !== "");
    const shown = cols.length ? cols : Object.keys(r.values).filter((c) => r.values[c] !== "").slice(0, 6);
    return h("div", { class: "subcard" }, h("div", { class: "muted", text: `${r.datasetName} / ${r.sheet}` }),
      h("dl", { class: "kv" }, shown.flatMap((c) => [h("dt", { text: c }), h("dd", { text: String(r.values[c]) })])));
  }));
}

const PRODUCT_ORDER = ["powerplatform", "powerbi", "dynamics", "sharepoint", "copilot"];
const RESTART_PRODUCTS = "The running server does not have the per-product lookup yet: restart it to turn it on.";

// One collapsible section per product, summarised here; each links to the full, product-specific activity. Only the overview lookup spans every product.
function productsCard(p, withRenewal = true) {
  const body = h("div", {}, h("div", { class: "empty", text: "Loading product activity..." }));
  const card = h("div", { class: "card" }, h("h3", { text: "Activity by product" }),
    h("p", { class: "muted", text: "What this person built, ran, opened or changed in each product, and anything that went wrong. Open a section for its summary, or follow the link in it for every detail." }), body);
  const renewal = withRenewal ? caret("Renewal", p.workbook.length, "rows in the uploaded renewal workbooks", renewalBody(p), false) : null;
  api.personProducts(p.upn).then((res) => {
    const sections = PRODUCT_ORDER.filter((k) => res.products[k]).map((k) => {
      const s = res.products[k];
      const help = [s.problemCount ? `${s.problemCount} thing${s.problemCount === 1 ? "" : "s"} went wrong` : "nothing flagged", s.last ? `last seen ${fmt.ago(s.last)}` : "no activity seen"].join(", ");
      return caret(s.title, null, help, summaryBlock(s, p.upn), s.problemCount > 0);
    });
    body.replaceChildren(...[...sections, renewal].filter(Boolean));
  }).catch((e) => body.replaceChildren(...[h("div", { class: "muted", text: e.status === 404 ? RESTART_PRODUCTS : e.message }), renewal].filter(Boolean)));
  return card;
}

// A caret section: the summary line is always visible, the body opens and closes.
const TIER_PILL = { access: ["Grants access", "warn"], small: ["Outlying", "risk"], shared: ["Shared", "info"], default: ["Default", "ok"], unknown: ["Not sized", ""] };

function groupTable(rows) {
  return h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, ["Group", "People in it", "Type", "Source", "Membership"].map((c) => h("th", { class: c === "People in it" ? "num" : "", text: c })))),
    h("tbody", {}, rows.map((x) => h("tr", {},
      h("td", { title: x.description || x.mail || "" }, h("b", { text: x.name }), x.mail ? h("div", { class: "muted", text: x.mail }) : null,
        x.flags.length ? h("div", { class: "flags" }, x.flags.map((f) => h("span", { class: "pill " + (/^(Assigns|Grants|Name)/.test(f) ? "warn" : ""), text: f }))) : null),
      h("td", { class: "num" }, x.size == null ? h("span", { class: "muted", text: "unknown" }) : h("span", { title: x.pct == null ? "" : `${x.pct}% of all users` }, fmt.n(x.size), x.pct == null ? null : h("div", { class: "muted", text: `${x.pct}%` }))),
      h("td", { text: x.kind + (x.dynamic ? " (dynamic)" : "") }),
      h("td", {}, x.source.startsWith("Active") ? pill("Active Directory", "info") : h("span", { class: "muted", text: x.source })),
      h("td", { text: x.direct ? "Direct" : "Nested" })))));
}

function groupsCard(g) {
  if (!g) return null;
  if (!g.available) return h("div", { class: "card" }, h("h3", { text: "Groups" }), h("p", { class: "muted", text: g.reason || "Group membership is not available." }));
  if (!g.categories) { // a server older than this page: list the groups unsorted
    g = { ...g, items: g.items.map((i) => ({ ...i, tier: "unknown", flags: [], size: null, pct: null })), notes: ["Restart the service to see how widely each group is held and who has the same access."],
      categories: [{ key: "unknown", title: "Groups", open: true, help: "", count: g.items.length }] };
  }
  const body = h("div"), openState = {};
  const cats = g.categories.filter((c) => c.count);
  const draw = (q) => {
    const shown = cats.map((c) => [c, g.items.filter((x) => x.tier === c.key && (!q || `${x.name} ${x.kind} ${x.source} ${x.flags.join(" ")}`.toLowerCase().includes(q)))]).filter(([, rows]) => rows.length);
    body.replaceChildren(...(shown.length ? shown.map(([c, rows]) => caret(c.title, rows.length, c.help, groupTable(rows), q ? true : openState[c.key] ?? c.open,
      (o) => { if (!q) openState[c.key] = o; })) : [h("div", { class: "empty", text: "No groups match." })]));
  };
  draw("");
  const summary = cats.map((c) => h("span", { class: "pill " + (TIER_PILL[c.key][1]), text: `${fmt.n(c.count)} ${TIER_PILL[c.key][0].toLowerCase()}` }));
  return h("div", { class: "card" },
    h("h3", {}, `Groups (${fmt.n(g.total)}, ${fmt.n(g.adSynced)} from Active Directory)`, h("span", { class: "sub chips-inline" }, summary)),
    h("p", { class: "muted", text: `Default groups are held by ${g.thresholds?.defaultPct ?? 50}% or more of all ${g.totalUsers ? fmt.n(g.totalUsers) + " " : ""}users. Outlying and access-granting groups are the ones that set a person apart.` }),
    g.total > 8 ? h("input", { class: "input", type: "search", placeholder: "Filter groups...", "aria-label": "Filter groups", style: { marginBottom: "10px" }, oninput: (e) => draw(e.target.value.trim().toLowerCase()) }) : null,
    body, g.truncated ? h("p", { class: "muted", text: "Only the first 500 groups are shown." }) : null,
    (g.notes || []).map((n) => h("p", { class: "muted", text: n })),
    h("p", { class: "muted", text: "Nested means the person belongs through another group." }));
}

function insightsCard(g) {
  if (!g?.available || !g.insights?.length) return null;
  return h("div", { class: "card" }, h("h3", { text: "What stands out" }),
    h("ul", { class: "insight-list" }, g.insights.map((i) => h("li", {}, i.kind ? pill({ risk: "Review", warn: "Note", info: "Info" }[i.kind] || "Info", i.kind) : null, h("span", { text: i.text })))));
}

function peerTable(rows) {
  return h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, ["Person", "Department", "Shares", "Lacks"].map((c) => h("th", { class: c === "Shares" ? "num" : "", text: c })))),
    h("tbody", {}, rows.map((r) => h("tr", {},
      h("td", {}, r.upn ? h("a", { href: personHref(r.upn), text: r.name }) : r.name, r.enabled ? null : pill("Disabled", "risk"), r.upn ? h("div", { class: "muted", text: r.upn }) : null),
      h("td", { text: r.dept }), h("td", { class: "num", text: `${r.shared} of ${r.of}` }), h("td", { class: "muted", text: r.missing.join(", ") })))));
}

function peersCard(g) {
  const pr = g?.available ? g.peers : null;
  if (!pr || !pr.compared) return null;
  if (pr.hidden) {
    return h("div", { class: "card" }, h("h3", { text: "People with the same or close access" }),
      h("p", { class: "muted", text: `Compared on the ${pr.compared} groups that are not defaults: ${fmt.n(pr.exactTotal)} ${pr.exactTotal === 1 ? "person holds" : "people hold"} all of them, and ${fmt.n(pr.closeTotal)} ${pr.closeTotal === 1 ? "holds" : "hold"} ${g.thresholds?.closePct ?? 75}% or more. Who they are is shown only to administrators.` }));
  }
  const more = (shown, total) => (total > shown ? h("p", { class: "muted", text: `Showing ${shown} of ${fmt.n(total)}.` }) : null);
  return h("div", { class: "card" }, h("h3", { text: "People with the same or close access" }),
    h("p", { class: "muted", text: `Compared on the ${pr.compared} groups that are not defaults: who holds all of them, and who holds ${g.thresholds?.closePct ?? 75}% or more.` }),
    caret("Same access", pr.exactTotal, "Hold every one of those groups.", pr.exact.length ? [peerTable(pr.exact), more(pr.exact.length, pr.exactTotal)] : h("div", { class: "empty", text: "No one else holds all of them." }), pr.exactTotal > 0),
    caret("Close", pr.closeTotal, `Hold ${g.thresholds?.closePct ?? 75}% or more, but not all.`, pr.close.length ? [peerTable(pr.close), more(pr.close.length, pr.closeTotal)] : h("div", { class: "empty", text: "No one is close." }), false),
    pr.skipped.length ? h("p", { class: "muted", text: `Not compared because their members were not read (too large or unreadable): ${pr.skipped.join(", ")}.` }) : null);
}

function identity(p) {
  const si = p.signIn || {};
  const rows = [
    ["User", p.upn], ["Email", p.mail && p.mail.toLowerCase() !== p.upn.toLowerCase() ? p.mail : ""], ["Department", p.dept], ["Title", p.title],
    ["Account", pill(p.enabled ? "Enabled" : "Disabled", p.enabled ? "ok" : "risk")], ["Type", p.guest ? "Guest" : ""],
    ["Last sign-in (any app)", when(si.last)], ["Interactive", si.interactive ? when(si.interactive) : ""], ["Non-interactive", si.nonInteractive ? when(si.nonInteractive) : ""],
    ["Power Platform licence", p.powerPlatform ? `${p.powerPlatform.tier}: ${p.powerPlatform.plans.join(", ")}` : ""],
  ].filter(([, v]) => v !== "" && v != null);
  return h("div", { class: "card" }, h("h3", { text: "Account" }), h("dl", { class: "kv" }, rows.flatMap(([k, v]) => [h("dt", { text: k }), h("dd", {}, v)])));
}

function licences(p) {
  return h("div", { class: "card" }, h("h3", { text: `Licences (${p.licences.length})` }),
    p.licences.length ? h("span", { class: "chips" }, p.licences.map((l) => h("span", { class: "pill", title: l, text: skuName(l) }))) : h("span", { class: "muted", text: "None assigned" }));
}

// The cards that make up one person's profile. People who are not administrators see only their own, with other people counted and never named.
export function personBody(p, { renewal = true } = {}) {
  const gaps = missingSources(p);
  return [
    h("div", { class: "grid g-2" }, identity(p), licences(p)),
    insightsCard(p.groups), groupsCard(p.groups), peersCard(p.groups),
    h("div", { class: "card" }, h("h3", { text: "Last usage per application" }), usageTable(p),
      gaps.length ? h("p", { class: "muted", text: `Not collected yet: ${gaps.join("; ")}. A missing trace there is not proof of no use.` }) : null,
      h("p", { class: "muted", text: "Traces only cover the period each source was collected for (see Data sources)." })),
    productsCard(p, renewal),
  ].filter(Boolean);
}

// The person page: licences, groups sorted by how widely they are held, people with the same access, and the last trace per application.
export async function page() {
  const upn = decodeURIComponent(location.hash.split("/")[1] || "");
  const root = h("div", { class: "person-page" }, personSearch());
  if (!upn) return root;
  let p;
  try {
    p = await api.personProfile(upn);
  } catch (e) {
    root.append(h("div", { class: "banner error" }, e.status === 404 && /not found/i.test(e.message) ? RESTART : e.message));
    return root;
  }
  root.append(pageHead(p.name || p.upn, [p.title, p.dept].filter(Boolean).join(", ") || p.upn,
    h("button", { class: "btn", type: "button", onclick: () => history.back() }, "Back")), ...personBody(p));
  return root;
}

export function openPerson(upn) {
  location.hash = personHref(upn).slice(1);
}

// A search box: type a name or address, pick a person, and onPick opens the view that fits where the box sits.
export function finder(title, help, onPick) {
  const out = h("div", { class: "person-results" });
  let timer = 0, token = 0;
  const input = h("input", { class: "input", type: "search", placeholder: "Find a person by name or email...", "aria-label": "Find a person",
    oninput: () => { clearTimeout(timer); timer = setTimeout(run, 250); },
    onkeydown: (e) => { if (e.key === "Enter") { clearTimeout(timer); run(true); } } });

  async function run(openFirst) {
    const q = input.value.trim();
    const mine = ++token;
    if (q.length < 2) return out.replaceChildren();
    let res;
    try {
      res = await api.peopleSearch(q);
    } catch (e) {
      if (mine === token) out.replaceChildren(h("div", { class: "muted", text: e.status === 404 ? RESTART : e.message }));
      return;
    }
    if (mine !== token) return;
    const list = res.results;
    if (!list.length) return out.replaceChildren(h("div", { class: "muted", text: "No one matches." }));
    if (openFirst && list.length === 1) return onPick(list[0].upn);
    out.replaceChildren(...list.map((u) => h("button", { type: "button", class: "person-hit", onclick: () => onPick(u.upn) },
      h("b", { text: u.name || u.upn }), h("span", { class: "muted", text: ` ${u.upn}${u.dept ? " - " + u.dept : ""}` }), u.enabled ? null : pill("Disabled", "risk"))));
  }
  return h("div", { class: "card personbox" }, h("h3", { text: title }), h("p", { class: "muted", text: help }), input, out);
}

// Across every product: licences, groups, the last trace per application and a summary of each product.
export const personSearch = () => finder("Find a person", "Their licences, groups and the last trace of use in each Microsoft application this tool can see, then a section for each product.", openPerson);
