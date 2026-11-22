/* =============================================================================
 * engines/pbi.js — Power BI licensing and usage analysis for a P-SKU → Fabric move.
 *
 * Input is the export bundle produced by assets/scripts/Export-PowerBIFabricData.ps1
 * (run in Azure Cloud Shell by a Fabric / Entra administrator):
 *
 *   users.csv                     licensed users and their licences (Microsoft Graph)
 *   skus.csv                      purchased vs assigned licences
 *   pbi-capacities.csv            Premium / Fabric capacities
 *   pbi-workspaces.csv            workspaces with capacity, region and migration-risk flags
 *   pbi-activity.csv              per user, per capacity: views and creates over the activity window
 *   pbi-workspace-activity.csv    per workspace: events over the activity window
 *   export-info.json              when/how the export was produced, and any warnings
 *
 * It answers: who really views, who really creates, who already holds a Pro-capable
 * licence, which standalone Pro/PPU licences would not be needed after the move, which
 * workspaces are dormant, and what the migration will need to handle.
 * ========================================================================== */

import { parseTable, pickKey, toNum } from "../core.js";
import { unitPrice } from "../org.js";
import { productById, entitles } from "../data/products.js";
import { parseUserAssignments } from "./waste.js";

const truthy = (v) => /^(1|true|yes|y|x)$/i.test(String(v ?? "").trim());
const lc = (s) => String(s ?? "").trim().toLowerCase();
export const SHARED = "(shared)";

/* ---------------------------------------------------------------------------
 * Bundle handling
 * ------------------------------------------------------------------------ */

/** Maps file names from the export (or loosely-named uploads) onto their roles. */
export function classifyFiles(named) {
  const out = {};
  for (const [name, text] of Object.entries(named)) {
    const n = lc(name);
    let role = null;
    if (n.endsWith(".json")) role = /info|export|meta/.test(n) ? "info" : null;
    else if (/workspace.*activity|activity.*workspace/.test(n)) role = "wsActivity";
    else if (/activity/.test(n)) role = "activity";
    else if (/workspace/.test(n)) role = "workspaces";
    else if (/capacit/.test(n)) role = "capacities";
    else if (/^skus?\b|^skus?[-_.]/.test(n)) role = "skus";
    else if (/^users?\b|^users?[-_.]|assignment/.test(n)) role = "users";
    if (role && !(role in out)) out[role] = text;
  }
  return out;
}

export function parseCapacities(text) {
  const t = parseTable(text);
  const kName = pickKey(t.keys, ["name", "display_name", "capacity_name", "capacity"]);
  if (!kName) throw new Error(`pbi-capacities: no capacity name column. Columns present: ${t.headers.join(", ")}`);
  const kId = pickKey(t.keys, ["id", "capacity_id"]);
  const kSku = pickKey(t.keys, ["sku"]);
  const kRegion = pickKey(t.keys, ["region", "location"]);
  const kState = pickKey(t.keys, ["state", "status"]);
  const kAdm = pickKey(t.keys, ["admin_count", "admins"]);
  return t.rows.filter((r) => r[kName]).map((r) => {
    const sku = String(kSku ? r[kSku] : "").trim().toUpperCase();
    return { id: kId ? r[kId] : "", name: r[kName], sku, region: kRegion ? r[kRegion] : "", state: kState ? r[kState] : "", adminCount: kAdm ? toNum(r[kAdm]) : 0,
      isP: /^P[1-5]$/.test(sku), isF: /^F\d+$/.test(sku) };
  });
}

export function parseWorkspaces(text) {
  const t = parseTable(text);
  const kName = pickKey(t.keys, ["workspace_name", "workspace", "name"]);
  if (!kName) throw new Error(`pbi-workspaces: no workspace column. Columns present: ${t.headers.join(", ")}`);
  const kId = pickKey(t.keys, ["workspace_id", "id"]);
  const kType = pickKey(t.keys, ["type"]);
  const kState = pickKey(t.keys, ["state"]);
  const kCap = pickKey(t.keys, ["capacity", "capacity_name"]);
  const kReg = pickKey(t.keys, ["region"]);
  const kFab = pickKey(t.keys, ["has_fabric_items", "fabric_items", "fabric"]);
  const kLarge = pickKey(t.keys, ["large_model", "large"]);
  const kGw = pickKey(t.keys, ["gateway"]);
  const fabricKnown = Boolean(kFab) && t.rows.some((x) => String(x[kFab] ?? "").trim() !== "");
  return t.rows.filter((r) => r[kName]).map((r) => ({
    id: kId ? lc(r[kId]) : "", name: r[kName], type: kType ? r[kType] : "Workspace", state: kState ? r[kState] : "Active",
    capacity: kCap ? r[kCap] : "", region: kReg ? r[kReg] : "",
    fabric: kFab ? truthy(r[kFab]) : false, fabricKnown,
    large: kLarge ? truthy(r[kLarge]) : false, gateway: kGw ? truthy(r[kGw]) : false,
  }));
}

export function parseActivity(text) {
  const t = parseTable(text);
  const kUser = pickKey(t.keys, ["user", "user_id", "upn", "email"]);
  if (!kUser) throw new Error(`pbi-activity: no user column. Columns present: ${t.headers.join(", ")}`);
  const kCap = pickKey(t.keys, ["capacity", "capacity_name"]);
  const kViews = pickKey(t.keys, ["views"]);
  const kCreates = pickKey(t.keys, ["creates", "created"]);
  const kDays = pickKey(t.keys, ["active_days"]);
  const kLast = pickKey(t.keys, ["last_activity", "last"]);
  return t.rows.filter((r) => r[kUser]).map((r) => ({
    user: lc(r[kUser]), capacity: String(kCap ? r[kCap] : "").trim() || SHARED,
    views: kViews ? toNum(r[kViews]) : 0, creates: kCreates ? toNum(r[kCreates]) : 0,
    activeDays: kDays ? toNum(r[kDays]) : 0, last: kLast ? r[kLast] : "",
  }));
}

export function parseWorkspaceActivity(text) {
  const t = parseTable(text);
  const kName = pickKey(t.keys, ["workspace_name", "workspace", "name"]);
  const kId = pickKey(t.keys, ["workspace_id", "id"]);
  if (!kName && !kId) throw new Error(`pbi-workspace-activity: no workspace column. Columns present: ${t.headers.join(", ")}`);
  const kCap = pickKey(t.keys, ["capacity"]);
  const kEv = pickKey(t.keys, ["events"]);
  const kViews = pickKey(t.keys, ["views"]);
  const kUsers = pickKey(t.keys, ["users"]);
  const kLast = pickKey(t.keys, ["last_activity", "last"]);
  return t.rows.map((r) => ({
    id: kId ? lc(r[kId]) : "", name: kName ? r[kName] : "", capacity: kCap ? r[kCap] : "",
    events: kEv ? toNum(r[kEv]) : 0, views: kViews ? toNum(r[kViews]) : 0, users: kUsers ? toNum(r[kUsers]) : 0, last: kLast ? r[kLast] : "",
  }));
}

/** Parses every recognised file; problems with one file are reported, not fatal, unless it is essential. */
export function parseBundle(named) {
  const f = classifyFiles(named);
  const issues = [];
  const out = { present: Object.keys(f), issues };
  const attempt = (key, fn) => {
    if (!(key in f)) return;
    try { out[key] = fn(f[key]); } catch (e) { issues.push(e.message); }
  };
  attempt("users", parseUserAssignments);
  attempt("capacities", parseCapacities);
  attempt("workspaces", parseWorkspaces);
  attempt("activity", parseActivity);
  attempt("wsActivity", parseWorkspaceActivity);
  if (f.info) { try { out.info = JSON.parse(f.info.replace(/^\uFEFF/, "")); } catch { issues.push("export-info.json is not valid JSON."); } }
  if (!out.capacities?.length) issues.push("No capacities were found. The export needs pbi-capacities.csv.");
  return out;
}

/* ---------------------------------------------------------------------------
 * Licence classification
 * ------------------------------------------------------------------------ */
export function proStatus(u) {
  const ids = new Set(u.licences.map((l) => l.productId).filter(Boolean));
  // A suite such as E5 includes Pro at no extra cost. PPU also includes Pro, but is a separately paid licence.
  const viaSuite = [...ids].some((id) => id !== "power-bi-pro" && id !== "power-bi-ppu" && entitles(id, "power-bi-pro"));
  const pro = ids.has("power-bi-pro");
  const ppu = ids.has("power-bi-ppu");
  return { capable: viaSuite || pro || ppu, viaSuite, standalonePro: pro && !viaSuite, ppu };
}

const price = (id) => unitPrice(id, productById(id)?.listPriceUsd ?? 0).price;

/* ---------------------------------------------------------------------------
 * Analysis
 * ------------------------------------------------------------------------ */
export function defaultCapacity(caps, activity = []) {
  const busy = new Map();
  for (const a of activity) busy.set(lc(a.capacity), (busy.get(lc(a.capacity)) ?? 0) + a.views + a.creates);
  return [...caps].sort((a, b) => Number(b.isP) - Number(a.isP) || (busy.get(lc(b.name)) ?? 0) - (busy.get(lc(a.name)) ?? 0))[0] ?? null;
}

/**
 * @param {object} b parseBundle() result
 * @param {object} [opts]
 * @param {string} [opts.capacityName] capacity being migrated (defaults to the busiest Premium capacity)
 */
export function analyzePowerBI(b, opts = {}) {
  const caps = b.capacities ?? [];
  const target = (opts.capacityName && caps.find((c) => lc(c.name) === lc(opts.capacityName))) || defaultCapacity(caps, b.activity);
  if (!target) throw new Error("No capacity found in the export.");

  const proUsd = price("power-bi-pro");
  const ppuUsd = price("power-bi-ppu");
  const warnings = [];
  const info = b.info ?? {};
  const days = toNum(info.activityDays, 0);
  const hasActivity = Boolean(b.activity?.length);
  const hasUsers = Boolean(b.users?.users?.length);
  const T = lc(target.name);

  /* licences */
  const byUpn = new Map();
  const lic = { licensed: 0, capable: 0, viaSuite: 0, standalonePro: 0, ppu: 0 };
  for (const u of b.users?.users ?? []) {
    byUpn.set(lc(u.upn), u);
    if (!u.licences.length) continue;
    lic.licensed++;
    const s = proStatus(u);
    u._pro = s;
    if (s.capable) lic.capable++;
    if (s.viaSuite) lic.viaSuite++;
    if (s.standalonePro) lic.standalonePro++;
    if (s.ppu) lic.ppu++;
  }

  /* activity per user */
  const act = new Map();
  for (const r of b.activity ?? []) {
    const a = act.get(r.user) ?? { target: { views: 0, creates: 0 }, shared: { views: 0, creates: 0 }, other: { views: 0, creates: 0 } };
    const slot = lc(r.capacity) === T ? a.target : r.capacity === SHARED ? a.shared : a.other;
    slot.views += r.views;
    slot.creates += r.creates;
    act.set(r.user, a);
  }

  const creators = [], viewers = [];
  for (const [upn, a] of act) {
    if (a.target.creates > 0) creators.push(upn);
    else if (a.target.views > 0) viewers.push(upn);
  }
  const holds = (upn) => byUpn.get(upn)?._pro?.capable === true;
  const unmatched = [...act.keys()].filter((u) => !byUpn.has(u));
  const creatorsWithPro = creators.filter(holds).length;
  const viewersWithPro = viewers.filter(holds).length;
  const creatorsWithoutPro = creators.filter((u) => !holds(u));

  /* standalone Pro / PPU that would not be needed after the move */
  const cleanup = [];
  if (hasUsers) {
    for (const u of b.users.users) {
      const s = u._pro;
      if (!s || !(s.standalonePro || s.ppu)) continue;
      const a = act.get(lc(u.upn));
      const product = s.ppu ? "Power BI Premium Per User" : "Power BI Pro";
      const annualUsd = (s.ppu ? ppuUsd : proUsd) * 12;
      let reason = null;
      let viewerOnly = false;
      if (!u.enabled) reason = "Disabled account";
      else if (hasActivity && !a) reason = `No Power BI activity in ${days || "the"} days`;
      else if (a && a.target.views > 0 && a.shared.views === 0 && a.other.views === 0 && a.target.creates + a.shared.creates + a.other.creates === 0) {
        reason = "Views only content on the Premium capacity (viewing needs no Pro there or on F64+)";
        viewerOnly = true;
      }
      if (reason) cleanup.push({ upn: u.upn, product, reason, annualUsd, viewerOnly });
    }
  }
  const cleanupBy = {};
  for (const c of cleanup) cleanupBy[c.reason.split(" (")[0]] = (cleanupBy[c.reason.split(" (")[0]] ?? 0) + 1;

  /* workspaces on the target capacity */
  const ws = (b.workspaces ?? []).filter((w) => lc(w.capacity) === T && w.state !== "Deleted" && !/personal/i.test(w.type));
  const active = new Set((b.wsActivity ?? []).filter((w) => w.events > 0).map((w) => w.id).filter(Boolean));
  const activeByName = new Set((b.wsActivity ?? []).filter((w) => w.events > 0).map((w) => lc(w.name)));
  const wsKnown = Boolean(b.wsActivity?.length);
  const isActive = (w) => active.has(w.id) || activeByName.has(lc(w.name));
  const dormant = wsKnown ? ws.filter((w) => !isActive(w)) : [];
  const live = wsKnown ? ws.filter(isActive) : ws;

  const capacities = caps.map((c) => ({ ...c, workspaces: (b.workspaces ?? []).filter((w) => lc(w.capacity) === lc(c.name)).length }));
  const regions = [...new Set(caps.filter((c) => c.isP).map((c) => c.region).filter(Boolean))];

  if (!hasUsers) warnings.push("users.csv was not found, so licence holdings are unknown. Pro counts below assume nobody holds a Pro-capable licence.");
  if (!hasActivity) warnings.push("pbi-activity.csv was not found, so real viewers and creators cannot be counted. Enter them manually.");
  if (hasActivity && days && days < 28) warnings.push(`Only ${days} days of activity were exported. Occasional users (month-end, quarterly) may be missed.`);
  if (unmatched.length) warnings.push(`${unmatched.length} active user(s) are not in users.csv (external, guest or renamed accounts). They are treated as holding no Pro licence.`);
  for (const w of info.warnings ?? []) warnings.push(String(w));
  if (!target.isP) warnings.push(`${target.name} is a ${target.sku || "non-Premium"} capacity, not a Premium P-SKU. The P → F comparison applies to P1–P5.`);

  const pl = {
    premiumSku: target.isP ? target.sku : null,
    viewers: viewers.length, creators: creators.length, creatorsWithPro, viewersWithPro,
    proHeld: creatorsWithPro + viewersWithPro,
    workspaces: live.length, largeModels: live.filter((w) => w.large).length,
    gatewayDependent: live.filter((w) => w.gateway).length, withFabricItems: live.filter((w) => w.fabric).length,
  };

  return {
    target, window: { days, from: info.activityFrom ?? "", to: info.activityTo ?? "", generatedAt: info.generatedAt ?? "" },
    licences: lic, hasActivity, hasUsers,
    usage: { viewers: viewers.length, creators: creators.length, creatorsWithPro, viewersWithPro, unmatched: unmatched.length,
      creatorsWithoutPro: creatorsWithoutPro.map((upn) => ({ upn, name: byUpn.get(upn)?.name ?? "", known: byUpn.has(upn) })) },
    cleanup: { items: cleanup, byReason: cleanupBy, annualUsd: cleanup.reduce((a, c) => a + c.annualUsd, 0),
      alwaysUsd: cleanup.filter((c) => !c.viewerOnly).reduce((a, c) => a + c.annualUsd, 0),
      f64Usd: cleanup.filter((c) => c.viewerOnly).reduce((a, c) => a + c.annualUsd, 0), proUsd, ppuUsd },
    workspaces: { onCapacity: ws.length, active: live.length, dormant: dormant.length, dormantKnown: wsKnown, dormantSample: dormant.slice(0, 15).map((w) => w.name),
      fabric: pl.withFabricItems, large: pl.largeModels, gateway: pl.gatewayDependent, fabricKnown: ws.some((w) => w.fabricKnown) },
    capacities, regions, planInputs: pl, warnings,
  };
}

/* ---------------------------------------------------------------------------
 * Suggestions
 * ------------------------------------------------------------------------ */
const usd = (n) => Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (n) => Number(n).toLocaleString("en-US");

/**
 * @param {object} a analyzePowerBI() result
 * @param {object} plan planFabric() result
 * @param {object} mig estimateMigration() result
 * @param {{utilisationMeasured:boolean, renewalDate?:string}} ctx
 */
export function buildSuggestions(a, plan, mig, ctx = {}) {
  const out = [];
  const add = (level, title, text, ask) => out.push({ level, title, text, ask });
  const best = plan.scenarios.find((s) => s.id === plan.cheapestScenario);
  const like = plan.scenarios.find((s) => s.id === "equivalent");
  const u = a.usage;

  if (!ctx.utilisationMeasured)
    add("med", "Size from measured utilisation before choosing an F-SKU",
      `Sizing currently assumes a 70% peak. Upload the Capacity Metrics export for ${a.target.name}: it decides whether ${like.fSku} is needed or a smaller SKU is enough.`,
      "Do not reserve until measured peak and P95 are known.");

  if (a.hasActivity) {
    const be = plan.f64BreakEvenViewers;
    add("info", `Licensing path: ${u.viewers.toLocaleString("en-US")} real viewers in ${a.window.days || "the"} days`,
      u.viewers >= be
        ? `That is above the F64 break-even of about ${num(be)} viewers, so staying at F64+ (free viewers) is cheaper than a smaller F-SKU plus Pro for every viewer.`
        : `That is below the F64 break-even of about ${num(be)} viewers. If measured compute fits under F64, a smaller F-SKU plus Pro for viewers can cost less; otherwise stay at F64.`);
  }

  if (u.creatorsWithoutPro.length)
    add("high", `${num(u.creatorsWithoutPro.length)} creators publish to ${a.target.name} without a Pro-capable licence`,
      `Authors need Pro or Premium Per User both today and on F64+. Confirm each account's access route (for example a Premium Per User or a service account), then licence or restrict them before the move so publishing does not break on cutover. Priced at ${usd(a.cleanup.proUsd)} per user per month, closing the gap adds ${usd(u.creatorsWithoutPro.length * a.cleanup.proUsd * 12)}/yr.`,
      "Resolve before migration; the export lists the accounts.");

  if (a.cleanup.items.length)
    add("save", `${num(a.cleanup.items.length)} standalone Pro/PPU licences would not be needed`,
      `${Object.entries(a.cleanup.byReason).map(([k, v]) => `${num(v)} ${k.charAt(0).toLowerCase()}${k.slice(1)}`).join("; ")}. ${a.cleanup.f64Usd > 0 ? `About ${usd(a.cleanup.alwaysUsd)}/yr is removable whatever you choose, and a further ${usd(a.cleanup.f64Usd)}/yr only if you land on F64 or larger (viewers then need no Pro; below F64 they still do).` : `Removing them saves about ${usd(a.cleanup.alwaysUsd)}/yr.`} Licences included in Microsoft 365 E5 are not counted (they cost nothing extra). Keep Pro for anyone who also views content outside Premium capacity.`,
      "Remove at the next true-down or renewal, with reduction rights in the agreement.");

  if (a.workspaces.dormantKnown && a.workspaces.dormant > 0) {
    const pct = a.workspaces.onCapacity ? Math.round((a.workspaces.dormant / a.workspaces.onCapacity) * 100) : 0;
    add("save", `${num(a.workspaces.dormant)} of ${num(a.workspaces.onCapacity)} workspaces (${pct}%) had no activity`,
      `Archive or delete them before migrating. That removes them from the move (the effort estimate here already counts only the ${num(a.workspaces.active)} active workspaces) and from what you pay to run on Fabric. Confirm retention rules first: some may be compliance records.`);
  }

  const risks = [];
  if (a.workspaces.fabric) risks.push(`${num(a.workspaces.fabric)} contain Fabric items (cannot move across regions)`);
  if (a.workspaces.large) risks.push(`${num(a.workspaces.large)} use large semantic models (cannot move across regions)`);
  if (a.workspaces.gateway) risks.push(`${num(a.workspaces.gateway)} depend on an on-premises gateway (test refresh first)`);
  if (risks.length) add("med", "Migration risks in the active workspaces", `${risks.join("; ")}. Pilot these first and keep the new capacity in the same region as the old one.`);

  if (a.regions.length > 1)
    add("med", `Premium capacities in ${a.regions.length} regions: ${a.regions.join(", ")}`, "Create one F-SKU per region. A workspace with Fabric items cannot be reassigned to a capacity in another region. Your organization requires US regions only.");

  if (mig.risk === "high" || mig.risk === "unknown")
    add(mig.risk === "high" ? "high" : "med", mig.risk === "high" ? "Migration effort exceeds the overlap window" : "Overlap window not yet known",
      mig.risk === "high"
        ? `Estimated ${mig.estimatedDays} days of work against ${mig.overlapDays} days of overlap. Provision the F-SKU before the renewal date and ask for the overlap in writing, with an extension right.`
        : `The estimate is ${mig.estimatedDays} days of work. Find out exactly how many overlap days the agreement gives and get it in writing.`,
      "Written overlap length and extension right.");

  if (best && like && best.annualTotalUsd < like.annualTotalUsd)
    add("save", `${best.label} is about ${usd(like.annualTotalUsd - best.annualTotalUsd)}/yr cheaper than like-for-like`, `Reserve only the proven baseline and keep burst on pay-as-you-go. Buy the reservation after the pilot confirms real utilisation.`);

  add("info", "What this does not cover",
    "Utilisation comes from the Capacity Metrics export, not the activity data. Viewer and creator counts reflect only the exported window. Pro cost uses your contracted price where entered in Workspace, otherwise the published list price.");
  return out;
}
