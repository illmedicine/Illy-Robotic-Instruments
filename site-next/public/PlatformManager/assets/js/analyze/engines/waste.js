/* =============================================================================
 * engines/waste.js — licence waste analysis from tenant exports.
 *
 * Two upload shapes are supported:
 *   1. SKU summary  — one row per SKU: purchased, assigned, optional active.
 *   2. User assignments — one row per user with their licences, status and last
 *      sign-in. Enables inactive, disabled-account, duplicate-stack and
 *      persona-mismatch findings that a SKU summary cannot show.
 *
 * Priced at your organization's contracted rates where loaded, else planning defaults.
 * User-level rows are processed in memory; only aggregates are ever persisted.
 * ========================================================================== */

import { toNum, parseTable, pickKey } from "../core.js";
import { unitPrice } from "../org.js";
import { productById, productBySku, matchProduct, entitles } from "../data/products.js";

/* -----------------------------------------------------------------------------
 * Pricing
 * -------------------------------------------------------------------------- */
function priceOf(productId, override) {
  if (Number.isFinite(override) && override > 0) return { price: override, source: "uploaded" };
  const p = productById(productId);
  return p ? unitPrice(productId, p.listPriceUsd) : { price: 0, source: "unpriced" };
}

function resolveProduct({ sku, name }) {
  return (sku && productBySku(sku)) || (name && matchProduct(name)) || null;
}

/* -----------------------------------------------------------------------------
 * 1. SKU summary
 * -------------------------------------------------------------------------- */
export function parseSkuSummary(text) {
  const t = parseTable(text);
  if (!t.rows.length) throw new Error("The file has no data rows.");

  const kSku = pickKey(t.keys, ["sku_part_number", "skupartnumber", "sku_part", "part_number", "sku"]);
  const kName = pickKey(t.keys, ["product_name", "friendly_name", "display_name", "license_name", "licence_name", "product", "name"]);
  const kBought = pickKey(t.keys, ["purchased", "enabled", "total", "prepaid", "quantity", "available_units", "licenses", "licences"]);
  const kUsed = pickKey(t.keys, ["assigned", "consumed_units", "consumed", "used", "in_use"]);
  const kActive = pickKey(t.keys, ["active_users", "active", "used_last_30", "active_30"]);
  const kPrice = pickKey(t.keys, ["unit_price", "price_per_user", "price", "cost_per_user"]);

  const missing = [];
  if (!kSku && !kName) missing.push("a SKU or product name column");
  if (!kBought) missing.push("a purchased/enabled quantity column");
  if (!kUsed) missing.push("an assigned/consumed quantity column");
  if (missing.length) {
    throw new Error(`Missing ${missing.join(", ")}. Columns present: ${t.headers.join(", ")}`);
  }

  const lines = [];
  const skipped = [];
  for (const r of t.rows) {
    const sku = kSku ? r[kSku] : "";
    const name = kName ? r[kName] : "";
    if (!sku && !name) continue;
    const purchased = toNum(r[kBought], NaN);
    const assigned = toNum(r[kUsed], NaN);
    if (!Number.isFinite(purchased) || !Number.isFinite(assigned)) {
      skipped.push(sku || name);
      continue;
    }
    // Trial / unlimited placeholders appear as enormous counts in tenant exports.
    if (purchased >= 1_000_000) {
      skipped.push(`${sku || name} (placeholder quantity)`);
      continue;
    }
    lines.push({
      sku, name,
      purchased, assigned,
      active: kActive && r[kActive] !== "" ? toNum(r[kActive], NaN) : null,
      unitPrice: kPrice ? toNum(r[kPrice], NaN) : NaN,
    });
  }
  return { lines, skipped, detected: { sku: kSku, name: kName, purchased: kBought, assigned: kUsed, active: kActive, price: kPrice } };
}

export function analyzeSkuLines(lines) {
  const rows = lines.map((l) => {
    const prod = resolveProduct(l);
    const pr = priceOf(prod?.id, l.unitPrice);
    const unassigned = Math.max(0, l.purchased - l.assigned);
    const active = Number.isFinite(l.active) ? l.active : null;
    const inactive = active != null ? Math.max(0, Math.min(l.assigned, l.assigned - active)) : 0;
    const wasted = unassigned + inactive;
    return {
      productId: prod?.id ?? null,
      name: prod?.name ?? l.name ?? l.sku,
      sku: l.sku,
      matched: Boolean(prod),
      purchased: l.purchased,
      assigned: l.assigned,
      active,
      unassigned,
      inactive,
      wasted,
      unitPrice: pr.price,
      priceSource: pr.source,
      annualCost: l.purchased * pr.price * 12,
      annualWaste: wasted * pr.price * 12,
      wastePct: l.purchased ? wasted / l.purchased : 0,
    };
  });

  const totalCost = rows.reduce((a, r) => a + r.annualCost, 0);
  const totalWaste = rows.reduce((a, r) => a + r.annualWaste, 0);

  return {
    rows: rows.sort((a, b) => b.annualWaste - a.annualWaste),
    totalAnnualCost: totalCost,
    totalAnnualWaste: totalWaste,
    wastePct: totalCost ? totalWaste / totalCost : 0,
    duplicates: duplicateCoverage(rows),
    unmatched: rows.filter((r) => !r.matched).map((r) => r.name),
    unpriced: rows.filter((r) => r.matched && r.unitPrice === 0).map((r) => r.name),
    contractedShare: rows.length ? rows.filter((r) => r.priceSource === "contracted" || r.priceSource === "uploaded").length / rows.length : 0,
  };
}

/** SKU-level overlap: a held SKU that a held suite already includes. */
function duplicateCoverage(rows) {
  const held = new Map(rows.filter((r) => r.productId).map((r) => [r.productId, r]));
  const out = [];
  for (const [id, row] of held) {
    for (const [holderId, holder] of held) {
      if (holderId === id || !entitles(holderId, id)) continue;
      const overlapSeats = Math.min(row.assigned, holder.assigned);
      if (overlapSeats <= 0) continue;
      out.push({
        product: row.name,
        coveredBy: holder.name,
        seatsAtRisk: overlapSeats,
        annualUsd: overlapSeats * row.unitPrice * 12,
        note: "Upper bound: assumes the same users hold both. Confirm with a per-user export.",
      });
    }
  }
  return out.sort((a, b) => b.annualUsd - a.annualUsd);
}

/* -----------------------------------------------------------------------------
 * 2. User assignments
 * -------------------------------------------------------------------------- */
export const DEFAULT_FRONTLINE_KEYWORDS = [
  "mailroom", "mail clerk", "print", "fulfillment", "fulfilment", "facilities", "custodian",
  "courier", "driver", "security officer", "receptionist", "data entry", "claims intake",
  "scanning", "scanner", "warehouse", "cafeteria", "groundskeeper", "maintenance",
];

export function parseUserAssignments(text) {
  const t = parseTable(text);
  if (!t.rows.length) throw new Error("The file has no data rows.");

  const kUpn = pickKey(t.keys, ["user_principal_name", "userprincipalname", "upn", "user_id", "email", "mail", "username", "user"]);
  const kLic = pickKey(t.keys, ["licenses", "licences", "assigned_licenses", "assigned_licences", "sku_part_number", "skus", "license", "licence", "products"]);
  if (!kUpn) throw new Error(`No user identifier column found. Columns present: ${t.headers.join(", ")}`);
  if (!kLic) throw new Error(`No licences column found. Columns present: ${t.headers.join(", ")}`);

  const kName = pickKey(t.keys, ["display_name", "name"]);
  const kDept = pickKey(t.keys, ["department", "dept", "cost_center", "business_unit"]);
  const kTitle = pickKey(t.keys, ["job_title", "title", "role"]);
  const kEnabled = pickKey(t.keys, ["account_enabled", "enabled", "block_credential", "blocked", "sign_in_blocked"]);
  const kLast = pickKey(t.keys, ["last_sign_in", "last_signin", "last_login", "last_activity", "last_interactive", "last_successful"]);
  const kType = pickKey(t.keys, ["user_type", "usertype", "type"]);

  const enabledOf = (raw, key) => {
    const v = String(raw ?? "").trim().toLowerCase();
    if (!v) return true;
    const truthy = /^(1|true|yes|y|enabled)$/.test(v);
    const falsy = /^(0|false|no|n|disabled)$/.test(v);
    // "blocked"-style columns invert the meaning.
    if (/block/.test(key ?? "")) return !truthy;
    if (falsy) return false;
    return truthy || !falsy;
  };

  const users = [];
  for (const r of t.rows) {
    const upn = String(r[kUpn] ?? "").trim();
    if (!upn) continue;
    const licRaw = String(r[kLic] ?? "");
    const parts = licRaw.split(/[;|]|,(?!\s*\d)/).map((s) => s.trim()).filter(Boolean);
    const licences = parts.map((p) => {
      const prod = resolveProduct({ sku: p, name: p });
      return { raw: p, productId: prod?.id ?? null };
    });
    const lastRaw = kLast ? String(r[kLast] ?? "").trim() : "";
    const lastDate = lastRaw && !/^(never|none|null|n\/a|-)$/i.test(lastRaw) ? new Date(lastRaw) : null;

    users.push({
      upn,
      name: kName ? r[kName] : "",
      dept: kDept ? r[kDept] : "",
      title: kTitle ? r[kTitle] : "",
      enabled: kEnabled ? enabledOf(r[kEnabled], kEnabled) : true,
      lastSignIn: lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate : null,
      neverSignedIn: kLast ? !lastDate || Number.isNaN(lastDate.getTime()) : false,
      isGuest: kType ? /guest/i.test(r[kType]) : /#ext#/i.test(upn),
      licences,
    });
  }
  return {
    users,
    detected: { upn: kUpn, licences: kLic, dept: kDept, title: kTitle, enabled: kEnabled, lastSignIn: kLast, type: kType },
    hasActivity: Boolean(kLast),
    hasStatus: Boolean(kEnabled),
  };
}

/**
 * @param {object[]} users parsed users
 * @param {object} opts
 * @param {number} opts.inactiveDays   no sign-in within N days counts as inactive
 * @param {string[]} opts.frontlineKeywords title/department keywords for persona mismatch
 */
export function analyzeUsers(users, opts = {}) {
  const inactiveDays = Math.max(1, toNum(opts.inactiveDays, 90));
  const keywords = (opts.frontlineKeywords?.length ? opts.frontlineKeywords : DEFAULT_FRONTLINE_KEYWORDS).map((k) => k.toLowerCase());
  const cutoff = Date.now() - inactiveDays * 86400000;

  const monthly = (u) =>
    u.licences.reduce((a, l) => a + (l.productId ? priceOf(l.productId).price : 0), 0);

  const disabled = [];
  const inactive = [];
  const guests = [];
  const dupes = [];
  const mismatch = [];
  const suiteClass = new Set(["m365-e3", "m365-e5", "o365-e3", "o365-e5"]);
  const f3 = priceOf("m365-f3").price;
  const flagged = [];
  const flag = (u, issue, annual, detail = "") =>
    flagged.push({ upn: u.upn, name: u.name, department: u.dept, title: u.title, issue, annualUsd: Math.round(annual), detail });

  for (const u of users) {
    const cost = monthly(u);
    if (!u.licences.length) continue;

    if (!u.enabled) {
      disabled.push({ u, annual: cost * 12 });
      flag(u, "Disabled account holds licences", cost * 12);
    }

    if (u.enabled && opts.checkActivity !== false) {
      const stale = u.neverSignedIn || (u.lastSignIn && u.lastSignIn.getTime() < cutoff);
      if (stale) {
        inactive.push({ u, annual: cost * 12 });
        flag(u, `No sign-in for ${inactiveDays}+ days`, cost * 12, u.neverSignedIn ? "never signed in" : u.lastSignIn.toISOString().slice(0, 10));
      }
    }

    if (u.isGuest) {
      guests.push({ u, annual: cost * 12 });
      flag(u, "Guest account holds paid licences", cost * 12);
    }

    // Duplicate stacks: any held product already entitled by another held product.
    const ids = [...new Set(u.licences.map((l) => l.productId).filter(Boolean))];
    for (const covered of ids) {
      const holder = ids.find((h) => h !== covered && entitles(h, covered));
      if (holder) {
        const price = priceOf(covered).price;
        dupes.push({ u, covered, holder, annual: price * 12 });
        flag(u, "Duplicate entitlement", price * 12, `${productById(covered)?.name} is included in ${productById(holder)?.name}`);
      }
    }

    // Persona mismatch: suite-class licence on a frontline-looking role.
    const hay = `${u.title} ${u.dept}`.toLowerCase();
    if (u.enabled && keywords.some((k) => k && hay.includes(k))) {
      const suite = ids.find((id) => suiteClass.has(id));
      if (suite) {
        const saving = Math.max(0, priceOf(suite).price - f3) * 12;
        if (saving > 0) {
          mismatch.push({ u, suite, annual: saving });
          flag(u, "Suite licence on a frontline-type role", saving, `${productById(suite)?.name} — candidate for F3; validate need first`);
        }
      }
    }
  }

  const sum = (arr) => arr.reduce((a, x) => a + x.annual, 0);

  // Group helpers for the UI.
  const dupeByPair = new Map();
  for (const d of dupes) {
    const key = `${d.covered}|${d.holder}`;
    const cur = dupeByPair.get(key) ?? { covered: d.covered, holder: d.holder, users: 0, annual: 0 };
    cur.users++;
    cur.annual += d.annual;
    dupeByPair.set(key, cur);
  }

  const licensed = users.filter((u) => u.licences.length).length;
  const spend = users.reduce((a, u) => a + monthly(u) * 12, 0);

  return {
    totalUsers: users.length,
    flagged,
    licensedUsers: licensed,
    annualSpend: spend,
    inactiveDays,
    disabled: { count: disabled.length, annual: sum(disabled), sample: disabled.slice(0, 25).map((d) => d.u) },
    inactive: { count: inactive.length, annual: sum(inactive), sample: inactive.slice(0, 25).map((d) => d.u) },
    guests: { count: guests.length, annual: sum(guests), sample: guests.slice(0, 25).map((d) => d.u) },
    duplicates: {
      count: dupes.length,
      annual: sum(dupes),
      pairs: [...dupeByPair.values()].sort((a, b) => b.annual - a.annual),
    },
    mismatch: {
      count: mismatch.length,
      annual: sum(mismatch),
      f3Price: f3,
      sample: mismatch.slice(0, 25).map((d) => d.u),
    },
    // Findings overlap (e.g. a disabled user can also be inactive), so the combined
    // figure is reported as a range rather than a simple sum.
    combined: {
      low: Math.max(sum(disabled), sum(inactive), sum(dupes), sum(mismatch)),
      high: sum(disabled) + sum(inactive) + sum(dupes) + sum(mismatch),
    },
    overlapNote:
      "Findings can overlap (a disabled account may also be inactive). The low figure is the largest single finding; the high figure sums all and is an upper bound.",
  };
}

/* -----------------------------------------------------------------------------
 * Roll-up across tenants
 * -------------------------------------------------------------------------- */
/**
 * @param {{tenant:object, sku?:object}[]} results
 * Guest tenants are reported but only included in your organization's total when the
 * tenant record has includeInRollup set.
 */
export function rollup(results) {
  const included = results.filter((r) => r.sku && r.tenant.includeInRollup !== false);
  return {
    tenants: results.length,
    included: included.length,
    totalAnnualCost: included.reduce((a, r) => a + r.sku.totalAnnualCost, 0),
    totalAnnualWaste: included.reduce((a, r) => a + r.sku.totalAnnualWaste, 0),
    byTenant: results
      .filter((r) => r.sku)
      .map((r) => ({
        id: r.tenant.id,
        name: r.tenant.name,
        kind: r.tenant.kind,
        inRollup: r.tenant.includeInRollup !== false,
        annualCost: r.sku.totalAnnualCost,
        annualWaste: r.sku.totalAnnualWaste,
        wastePct: r.sku.wastePct,
      })),
  };
}
