/* =============================================================================
 * engines/decisions.js — financial analysis of renewal decision exports.
 *
 * Consumes exports from a renewal launcher or licence export
 * (per-account keep / remove / change decisions) and prices them, so the
 * commitment being locked in for the term is visible in dollars. The per-account
 * decision logic stays in those tools; this module only measures its outcome.
 * ========================================================================== */

import { toNum, parseTable, pickKey, normaliseHeader } from "../core.js";
import { getRates, unitPrice } from "../org.js";
import { productById, matchProduct, productBySku } from "../data/products.js";

/** Stable key for custom (non-catalogue) licence names. */
export const slug = (s) => `custom:${normaliseHeader(s)}`;

function priceFor(licence) {
  const custom = getRates().unitPrices?.[slug(licence)];
  if (Number.isFinite(custom) && custom > 0) return { id: slug(licence), name: licence, price: custom, source: "contracted" };
  const prod = productBySku(licence) ?? matchProduct(licence);
  if (prod) {
    const r = unitPrice(prod.id, prod.listPriceUsd);
    return { id: prod.id, name: prod.name, price: r.price, source: r.source };
  }
  return { id: slug(licence), name: licence || "(no licence stated)", price: 0, source: "unpriced" };
}

export function normaliseDecision(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v || /^(pending|outstanding|undecided|unknown|tbd|todo|open|n\/a|none|-)$/.test(v)) return "outstanding";
  if (/remove|drop|revoke|cancel|terminate|decommission|disable|retire/.test(v)) return "remove";
  if (/change|downgrade|convert|swap|move to|replace|reduce to|f3|e3|g3/.test(v)) return "change";
  if (/keep|retain|renew|maintain|approve|save/.test(v)) return "keep";
  return "outstanding";
}

export function parseDecisions(text) {
  const t = parseTable(text);
  if (!t.rows.length) throw new Error("The file has no data rows.");

  const kDec = pickKey(t.keys, ["decision", "disposition", "recommendation", "action", "outcome", "status"]);
  if (!kDec) throw new Error(`No decision column found (expected e.g. Decision, Disposition or Action). Columns present: ${t.headers.join(", ")}`);

  const kLic = pickKey(t.keys, ["current_assignment", "license", "licence", "sku", "assignment", "product"]);
  const kLob = pickKey(t.keys, ["lob", "line_of_business", "business_unit", "department", "division"]);
  const kTenant = pickKey(t.keys, ["tenant", "tenant_name", "environment", "cloud"]);
  const kUser = pickKey(t.keys, ["user_principal_name", "upn", "email", "account", "name"]);
  const kBy = pickKey(t.keys, ["decided_by", "reviewer", "reviewed_by", "owner", "manager"]);
  const kWhen = pickKey(t.keys, ["decided_at", "decision_date", "updated", "timestamp", "date"]);
  const kTarget = pickKey(t.keys, ["target", "new_license", "new_licence", "change_to", "recommended_license"]);

  const records = t.rows
    .map((r) => ({
      user: kUser ? r[kUser] : "",
      licence: kLic ? r[kLic] : "",
      lob: kLob ? r[kLob] || "(none)" : "(all)",
      tenant: kTenant ? r[kTenant] || "(unspecified)" : "(unspecified)",
      decision: normaliseDecision(r[kDec]),
      rawDecision: r[kDec],
      by: kBy ? r[kBy] : "",
      when: kWhen && r[kWhen] ? new Date(r[kWhen]) : null,
      target: kTarget ? r[kTarget] : "",
    }))
    .filter((r) => r.user || r.licence);

  if (!records.length) throw new Error("No usable decision rows were found.");
  return {
    records,
    detected: { decision: kDec, licence: kLic, lob: kLob, tenant: kTenant, user: kUser, by: kBy, when: kWhen, target: kTarget },
  };
}

/**
 * @param {object[]} records parsed decisions
 * @param {object} opts
 * @param {number} opts.termYears            commitment term the quantities lock in for
 * @param {"renew"|"drop"} opts.outstandingAssumption  what happens to undecided accounts at the deadline
 */
export function analyzeDecisions(records, opts = {}) {
  const termYears = Math.max(1, toNum(opts.termYears, 3));
  const assume = opts.outstandingAssumption === "drop" ? "drop" : "renew";

  const tally = () => ({ keep: 0, remove: 0, change: 0, outstanding: 0, total: 0 });
  const overall = tally();
  const byLob = new Map();
  const byTenant = new Map();
  const byLicence = new Map();
  const reviewers = new Map();

  let keepAnnual = 0;
  let removeAnnual = 0;
  let outstandingAnnual = 0;
  let changeAnnual = 0;
  const unpriced = new Map();

  for (const r of records) {
    const pr = priceFor(r.licence);
    const annual = pr.price * 12;
    if (pr.source === "unpriced") unpriced.set(pr.name, (unpriced.get(pr.name) ?? 0) + 1);

    overall[r.decision]++;
    overall.total++;

    for (const [map, key] of [[byLob, r.lob], [byTenant, r.tenant]]) {
      if (!map.has(key)) map.set(key, tally());
      const c = map.get(key);
      c[r.decision]++;
      c.total++;
    }

    const lic = byLicence.get(pr.name) ?? { name: pr.name, unit: pr.price, source: pr.source, ...tally(), keepAnnual: 0, removeAnnual: 0, outstandingAnnual: 0 };
    lic[r.decision]++;
    lic.total++;
    if (r.decision === "keep") lic.keepAnnual += annual;
    if (r.decision === "remove") lic.removeAnnual += annual;
    if (r.decision === "outstanding") lic.outstandingAnnual += annual;
    byLicence.set(pr.name, lic);

    if (r.decision === "keep") keepAnnual += annual;
    else if (r.decision === "remove") removeAnnual += annual;
    else if (r.decision === "change") changeAnnual += annual;
    else outstandingAnnual += annual;

    if (r.by) reviewers.set(r.by, (reviewers.get(r.by) ?? 0) + 1);
  }

  const decided = overall.total - overall.outstanding;
  const committedAnnual = keepAnnual + (assume === "renew" ? outstandingAnnual : 0);
  const rows = (map) =>
    [...map.entries()]
      .map(([name, c]) => ({ name, ...c, completion: c.total ? (c.total - c.outstanding) / c.total : 0 }))
      .sort((a, b) => b.outstanding - a.outstanding || b.total - a.total);

  return {
    overall: { ...overall, decided, completion: overall.total ? decided / overall.total : 0 },
    byLob: rows(byLob),
    byTenant: rows(byTenant),
    byLicence: [...byLicence.values()].sort((a, b) => b.outstandingAnnual - a.outstandingAnnual || b.keepAnnual - a.keepAnnual),
    reviewers: [...reviewers.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    money: {
      keepAnnual,
      removeAnnual,
      changeAnnual,
      outstandingAnnual,
      committedAnnual,
      committedTerm: committedAnnual * termYears,
      /** Spend that locks in for the full term if nothing more is decided. */
      outstandingTermExposure: outstandingAnnual * termYears,
      avoidedAnnual: removeAnnual,
      avoidedTerm: removeAnnual * termYears,
    },
    assumption: assume,
    termYears,
    unpriced: [...unpriced.entries()].map(([name, count]) => ({ name, count })),
    caveat:
      "Priced at contracted unit prices where loaded in the Workspace rate card, otherwise planning defaults. " +
      "Unpriced licences contribute $0 — add their contracted price to include them. 'Change' decisions are not priced " +
      "because the target licence price is not known from the export.",
  };
}

/** Plain-language read-out of what the deadline position means, for execs. */
export function deadlineBrief(result, daysLeft) {
  const o = result.overall;
  const m = result.money;
  const lines = [];

  if (daysLeft != null) {
    if (daysLeft < 0) lines.push({ level: "high", text: `The response deadline passed ${Math.abs(daysLeft)} day(s) ago. Confirm in writing what Microsoft has recorded.` });
    else if (daysLeft <= 7) lines.push({ level: "high", text: `${daysLeft} day(s) to the response deadline.` });
  }
  if (o.outstanding > 0) {
    const unknown = m.outstandingAnnual === 0 && result.unpriced.length > 0;
    const money = unknown
      ? `Their cost is unknown because ${result.unpriced.map((u) => u.name).join(", ")} has no price loaded — add it in Workspace → Rate card.`
      : `If they default to renew, ${m.outstandingAnnual.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/yr is locked in for ${result.termYears} years.`;
    lines.push({
      level: daysLeft != null && daysLeft <= 7 ? "high" : "med",
      text: `${o.outstanding.toLocaleString("en-US")} of ${o.total.toLocaleString("en-US")} licence decisions are still outstanding (${((1 - o.completion) * 100).toFixed(1)}%). ${money}`,
    });
  }
  const worstLob = result.byLob.find((l) => l.outstanding > 0);
  if (worstLob) lines.push({ level: "med", text: `Largest outstanding backlog: ${worstLob.name} (${worstLob.outstanding.toLocaleString("en-US")} accounts).` });
  const zero = result.byLob.filter((l) => l.total > 0 && l.total === l.outstanding);
  if (zero.length) lines.push({ level: "high", text: `${zero.length} line(s) of business have made no decisions: ${zero.map((z) => z.name).join(", ")}.` });
  if (result.unpriced.length) lines.push({ level: "low", text: `${result.unpriced.length} licence type(s) are unpriced, so dollar figures understate the commitment.` });
  return lines;
}

/** Re-exported for callers that want to display a catalogue product by id. */
export { productById };
