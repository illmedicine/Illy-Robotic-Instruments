/* =============================================================================
 * engines/fabric.js — Power BI Premium → Microsoft Fabric capacity planner.
 *
 * Pricing is the published Azure Microsoft Fabric pay-as-you-go and reservation
 * schedule (US, USD). Everything is overridable through the Workspace rate card
 * (fabricDiscountPct) and per-run inputs. Sizing is driven by MEASURED
 * utilisation — the engine refuses to present name-based mapping as a sizing
 * answer.
 * ========================================================================== */

import { toNum, clamp, parseTable, pickKey, parseLocalDate } from "../core.js";
import { getRates, unitPrice, inChangeFreeze, nextSafeWindow } from "../org.js";
import { productById } from "../data/products.js";

/** Published Fabric capacity schedule: CU count → monthly USD. */
export const F_SKUS = [
  { sku: "F2", cu: 2, payg: 262.8, reserved: 156.334 },
  { sku: "F4", cu: 4, payg: 525.6, reserved: 312.667 },
  { sku: "F8", cu: 8, payg: 1051.2, reserved: 625.334 },
  { sku: "F16", cu: 16, payg: 2102.4, reserved: 1250.667 },
  { sku: "F32", cu: 32, payg: 4204.8, reserved: 2501.334 },
  { sku: "F64", cu: 64, payg: 8409.6, reserved: 5002.667 },
  { sku: "F128", cu: 128, payg: 16819.2, reserved: 10005.334 },
  { sku: "F256", cu: 256, payg: 33638.4, reserved: 20010.667 },
  { sku: "F512", cu: 512, payg: 67276.8, reserved: 40021.334 },
  { sku: "F1024", cu: 1024, payg: 134553.6, reserved: 80042.667 },
  { sku: "F2048", cu: 2048, payg: 269107.2, reserved: 160085.334 },
];

export const FABRIC = {
  paygPerCuHourUsd: 0.18,
  hoursPerMonth: 730,
  freeViewerThresholdCu: 64,
  /** Headroom target: size so peak lands at this share of capacity. */
  targetUtilisation: 0.8,
  onelakeHotPerGbUsd: 0.023,
  /** Microsoft's own statement: reservation saves up to ~40.5–41% vs PAYG. */
  reservedSavingsNote: "~41% vs pay-as-you-go",
  verify: true,
};

/** Power BI Premium per-capacity equivalence (P → F) and indicative P-SKU list prices. */
export const P_SKUS = {
  P1: { f: 64, monthlyUsd: 4995 },
  P2: { f: 128, monthlyUsd: 9995 },
  P3: { f: 256, monthlyUsd: 19995 },
  P4: { f: 512, monthlyUsd: 39990 },
  P5: { f: 1024, monthlyUsd: 79980 },
};

const bySku = (sku) => F_SKUS.find((s) => s.sku === sku);
const byCu = (cu) => F_SKUS.find((s) => s.cu === cu);
const nextSize = (cu) => F_SKUS.find((s) => s.cu >= cu) ?? F_SKUS[F_SKUS.length - 1];
const prevSize = (cu) => [...F_SKUS].reverse().find((s) => s.cu <= cu) ?? F_SKUS[0];

/** Apply your organization's negotiated Fabric discount (if any) to a published price. */
function applyDiscount(monthly) {
  const d = clamp(toNum(getRates().fabricDiscountPct, 0) / 100, 0, 0.9);
  return monthly * (1 - d);
}

/* -----------------------------------------------------------------------------
 * Upload parsers
 * -------------------------------------------------------------------------- */

/**
 * Parse a Fabric Capacity Metrics export (CSV). Accepts CU utilisation either as
 * a 0–100 percentage or a 0–1 ratio, with or without a capacity column.
 */
export function parseCapacityMetrics(text) {
  const t = parseTable(text);
  if (!t.rows.length) throw new Error("The file has no data rows.");

  const kUtil = pickKey(t.keys, [
    "cu_utilization", "utilization_percent", "utilization", "utilisation", "cu_percent", "cu_pct", "cu",
  ]);
  if (!kUtil) {
    throw new Error(
      "No utilisation column found. Expected a column such as 'Utilization %' or 'CU %'. " +
        `Columns present: ${t.headers.join(", ")}`
    );
  }
  const kCap = pickKey(t.keys, ["capacity_name", "capacity", "capacity_id"]);
  const kTime = pickKey(t.keys, ["timestamp", "datetime", "date_time", "time", "date", "start"]);

  const values = [];
  const perCap = new Map();
  for (const r of t.rows) {
    const raw = toNum(r[kUtil], NaN);
    if (!Number.isFinite(raw) || raw < 0) continue;
    values.push(raw);
    const cap = kCap ? r[kCap] || "(unnamed)" : "(all)";
    if (!perCap.has(cap)) perCap.set(cap, []);
    perCap.get(cap).push(raw);
  }
  if (!values.length) throw new Error("No numeric utilisation values were found in the file.");

  // Values <= 1.5 are treated as ratios (0–1); anything larger as percentages.
  const asPct = (v) => (Math.max(...values) <= 1.5 ? v * 100 : v);
  const stats = (arr) => {
    const s = arr.map(asPct).sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
    return {
      samples: s.length,
      avg: s.reduce((a, b) => a + b, 0) / s.length,
      p50: q(0.5),
      p95: q(0.95),
      p99: q(0.99),
      peak: s[s.length - 1],
      overThreshold: s.filter((v) => v > 100).length / s.length,
    };
  };

  return {
    column: kUtil,
    timeColumn: kTime,
    overall: stats(values),
    capacities: [...perCap.entries()]
      .map(([name, arr]) => ({ name, ...stats(arr) }))
      .sort((a, b) => b.peak - a.peak),
  };
}

/**
 * Parse a workspace inventory export. Recognised columns (any subset):
 * workspace name, capacity, region, has Fabric items, large model, gateway.
 */
export function parseWorkspaceInventory(text) {
  const t = parseTable(text);
  if (!t.rows.length) throw new Error("The file has no data rows.");

  const kName = pickKey(t.keys, ["workspace_name", "workspace", "name"]);
  if (!kName) throw new Error(`No workspace name column found. Columns present: ${t.headers.join(", ")}`);
  const kRegion = pickKey(t.keys, ["region", "location", "geo"]);
  const kCap = pickKey(t.keys, ["capacity_name", "capacity", "sku"]);
  const kFabric = pickKey(t.keys, ["fabric_items", "has_fabric", "fabric", "lakehouse", "items_fabric"]);
  const kLarge = pickKey(t.keys, ["large_model", "large_dataset", "large", "large_format"]);
  const kGw = pickKey(t.keys, ["gateway", "on_prem", "onprem"]);

  const truthy = (v) => /^(1|true|yes|y|x)$/i.test(String(v ?? "").trim());
  const rows = t.rows.filter((r) => String(r[kName] ?? "").trim());

  const regions = new Map();
  for (const r of rows) {
    const reg = kRegion ? String(r[kRegion] || "unknown").trim() : "unknown";
    regions.set(reg, (regions.get(reg) ?? 0) + 1);
  }
  const homeRegion = [...regions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

  return {
    workspaces: rows.length,
    largeModels: kLarge ? rows.filter((r) => truthy(r[kLarge])).length : 0,
    gatewayDependent: kGw ? rows.filter((r) => truthy(r[kGw])).length : 0,
    withFabricItems: kFabric ? rows.filter((r) => truthy(r[kFabric])).length : 0,
    crossRegion: kRegion ? rows.filter((r) => (r[kRegion] || "unknown") !== homeRegion).length : 0,
    homeRegion,
    regions: [...regions.entries()].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
    capacities: kCap ? [...new Set(rows.map((r) => r[kCap]).filter(Boolean))] : [],
    detected: { name: kName, region: kRegion, capacity: kCap, fabric: kFabric, large: kLarge, gateway: kGw },
  };
}

/* -----------------------------------------------------------------------------
 * Planner
 * -------------------------------------------------------------------------- */

/**
 * @param {object} i
 * @param {"P1"|"P2"|"P3"|"P4"|"P5"} i.premiumSku
 * @param {number} i.peakUtilisationPct   measured peak CU utilisation of the P-SKU (0–100)
 * @param {number} i.viewers              report consumers
 * @param {number} i.creators             authors / publishers
 * @param {number} i.proHeld              Pro-capable licences already held (e.g. via E5)
 * @param {number} [i.creatorsWithPro]    creators who hold a Pro-capable licence (exact count, e.g. from tenant data)
 * @param {number} [i.viewersWithPro]     viewers who hold a Pro-capable licence (exact count)
 * @param {number} i.growthPctPerYear
 * @param {number} i.termYears
 * @param {number} [i.currentAnnualCostUsd] overrides the P-SKU planning price
 * @param {number} [i.overlapDays]
 * @param {number} [i.burstSharePct]      share of hours burst capacity runs (hybrid scenario)
 * @param {number} [i.onelakeGb]
 */
export function planFabric(i) {
  const p = P_SKUS[i.premiumSku];
  if (!p) throw new Error(`Unknown Premium SKU "${i.premiumSku}".`);

  const years = clamp(toNum(i.termYears, 3), 1, 5);
  const g = clamp(toNum(i.growthPctPerYear, 20), 0, 200) / 100;
  const peak = clamp(toNum(i.peakUtilisationPct, 70), 1, 150) / 100;
  const viewers = Math.max(0, toNum(i.viewers));
  const creators = Math.max(0, toNum(i.creators));
  const proHeld = Math.max(0, toNum(i.proHeld));
  const burst = clamp(toNum(i.burstSharePct, 25), 0, 100) / 100;
  const gb = Math.max(0, toNum(i.onelakeGb));

  const equiv = p.f;
  const needNow = (equiv * peak) / FABRIC.targetUtilisation;
  const needEnd = needNow * Math.pow(1 + g, Math.max(0, years - 1));

  const proPrice = unitPrice("power-bi-pro", productById("power-bi-pro")?.listPriceUsd ?? 14).price;

  // Exact counts win; otherwise the licences held are assumed to cover creators first, then viewers.
  const creatorsHold = Number.isFinite(i.creatorsWithPro) ? clamp(i.creatorsWithPro, 0, creators) : Math.min(creators, proHeld);
  const viewersHold = Number.isFinite(i.viewersWithPro) ? clamp(i.viewersWithPro, 0, viewers) : Math.min(viewers, Math.max(0, proHeld - creatorsHold));
  const creatorsNeed = creators - creatorsHold;
  const proNeeded = (cu) => creatorsNeed + (cu >= FABRIC.freeViewerThresholdCu ? 0 : Math.max(0, viewers - viewersHold));

  const currentAnnual = toNum(i.currentAnnualCostUsd, 0) > 0 ? toNum(i.currentAnnualCostUsd) : p.monthlyUsd * 12;
  // Creators need Pro under Premium too, so 'today' must carry that cost or the comparison flatters the move.
  const beforeProUsd = creatorsNeed * proPrice * 12;
  const beforeTotal = currentAnnual + beforeProUsd;
  const storage = gb * FABRIC.onelakeHotPerGbUsd * 12;

  const scenario = (id, label, sku, note, extra = {}) => {
    const s = sku;
    // Licensing follows the size that is always running; burst capacity does not grant free-viewer rights.
    const licensingCu = extra.licensingCu ?? s.cu;
    const payg = applyDiscount(s.payg) * 12;
    const reserved = applyDiscount(s.reserved) * 12;
    const proCount = proNeeded(licensingCu);
    const pro = proCount * proPrice * 12;
    const base = extra.annualCapacityUsd ?? reserved;
    const total = base + pro + storage;
    return {
      id, label, fSku: s.sku, cu: s.cu,
      freeViewers: licensingCu >= FABRIC.freeViewerThresholdCu,
      proLicencesNeeded: proCount,
      annualPaygUsd: Math.round(payg),
      annualReservedUsd: Math.round(reserved),
      annualProUsd: Math.round(pro),
      annualStorageUsd: Math.round(storage),
      annualTotalUsd: Math.round(total),
      termTotalUsd: Math.round(total * years),
      vsCurrentUsd: Math.round(beforeTotal - total),
      note,
      ...extra,
    };
  };

  const likeForLike = scenario(
    "equivalent", `Like-for-like (${i.premiumSku} → ${bySku(`F${equiv}`).sku})`, bySku(`F${equiv}`),
    "Name-based mapping. Safe on capability, but not evidence of correct size."
  );
  const rightSized = scenario(
    "rightsized", "Right-sized for measured peak", nextSize(needNow),
    `Sized so measured peak (${Math.round(peak * 100)}%) lands at ${Math.round(FABRIC.targetUtilisation * 100)}% of capacity.`
  );
  const growth = scenario(
    "growth", `Right-sized with ${years}-year growth`, nextSize(needEnd),
    `Includes ${Math.round(g * 100)}%/yr growth. Do not reserve this whole size on day one — reserve the baseline and burst on pay-as-you-go.`
  );

  const baselineSku = prevSize(needNow);
  const peakSku = nextSize(needEnd);
  const burstCu = Math.max(0, peakSku.cu - baselineSku.cu);
  const burstAnnual = applyDiscount(burstCu * FABRIC.paygPerCuHourUsd * FABRIC.hoursPerMonth) * 12 * burst;
  const hybridCapacity = applyDiscount(baselineSku.reserved) * 12 + burstAnnual;
  const hybrid = scenario(
    "hybrid", `Reserve ${baselineSku.sku} + burst to ${peakSku.sku}`, peakSku,
    `Reserve the stable ${baselineSku.sku} baseline; run the extra ${burstCu} CU on pay-as-you-go for about ${Math.round(burst * 100)}% of hours.` +
      (baselineSku.cu < FABRIC.freeViewerThresholdCu ? ` Viewers need Pro because the always-on size is below F64.` : ""),
    { annualCapacityUsd: hybridCapacity, reservedBaseline: baselineSku.sku, burstCu, licensingCu: baselineSku.cu }
  );

  const scenarios = [likeForLike, rightSized, growth, hybrid];

  // Sub-F64 alternative: only coherent when the workload actually fits below 64 CU.
  const below = prevSize(FABRIC.freeViewerThresholdCu - 1);
  if (needNow <= below.cu) {
    scenarios.push(
      scenario(
        "below-f64", `Below F64 + Pro for viewers (${below.sku})`, below,
        "Viable because measured demand fits. Every viewer then needs a Pro licence."
      )
    );
  }

  // Viewer break-even: viewers above which F64 (free viewers) beats a sub-F64 SKU + Pro for everyone.
  const f64Year = applyDiscount(bySku("F64").reserved) * 12;
  const subYear = applyDiscount(below.reserved) * 12;
  const proYear = proPrice * 12;
  const breakEvenViewers = Math.max(0, Math.ceil((f64Year - subYear) / proYear)) + proHeld;

  const best = [...scenarios].sort((a, b) => a.annualTotalUsd - b.annualTotalUsd)[0];

  const warnings = [];
  const findings = [];
  if (peak < 0.45 && equiv >= 64)
    findings.push({
      level: "save",
      text: `Measured peak is only ${Math.round(peak * 100)}% of ${i.premiumSku}. Like-for-like would buy capacity you do not use — the right-sized scenario is ${rightSized.fSku}.`,
    });
  if (peak > 0.9)
    warnings.push(`Measured peak is ${Math.round(peak * 100)}% of ${i.premiumSku}: the current capacity is already stretched. Do not downsize; consider headroom above like-for-like.`);
  if (proHeld >= viewers + creators && viewers + creators > 0)
    findings.push({
      level: "info",
      text: "Pro licences are already held for everyone, so the F64 free-viewer benefit is worth little to you — decide on compute need alone.",
    });
  if (equiv >= 64 && viewers > 0 && viewers < 120)
    warnings.push("Few viewers for an F64+ capacity: confirm it is justified by compute, not by viewer licensing.");
  if (creators > 0 && creatorsNeed > 0)
    warnings.push(`${creatorsNeed} creators lack Pro. Authors need Pro under Premium and on F64+.`);
  if (g > 0.35)
    warnings.push(`${Math.round(g * 100)}%/yr growth is aggressive. Reserve the baseline only and re-size at the first anniversary.`);

  return {
    equivalentFSku: likeForLike.fSku,
    requiredCuNow: Math.round(needNow),
    requiredCuEndOfTerm: Math.round(needEnd),
    targetUtilisation: FABRIC.targetUtilisation,
    currentAnnualUsd: Math.round(currentAnnual),
    before: { capacityUsd: Math.round(currentAnnual), proUsd: Math.round(beforeProUsd), proCount: creatorsNeed, totalUsd: Math.round(beforeTotal) },
    scenarios,
    cheapestScenario: best.id,
    f64BreakEvenViewers: breakEvenViewers,
    proUnitUsd: proPrice,
    findings,
    warnings,
    caveat:
      "Modeled from the Azure published Fabric schedule and the inputs supplied, not a quote. " +
      "Confirm with the Fabric Capacity Metrics app and your Microsoft agreement before reserving.",
  };
}

/* -----------------------------------------------------------------------------
 * Capacity guardrails: workload isolation, thresholds, Direct Lake limits
 * -------------------------------------------------------------------------- */

/**
 * Direct Lake guardrails per SKU, from Microsoft Learn "Direct Lake overview" (checked Nov 2026).
 * modelGb null = unlimited. Re-check before quoting; Microsoft changes these.
 */
export const DIRECT_LAKE_GUARDRAILS = {
  F2: { files: 1000, rowGroups: 1000, rowsM: 300, modelGb: 10, memGb: 3 },
  F4: { files: 1000, rowGroups: 1000, rowsM: 300, modelGb: 10, memGb: 3 },
  F8: { files: 1000, rowGroups: 1000, rowsM: 300, modelGb: 10, memGb: 3 },
  F16: { files: 1000, rowGroups: 1000, rowsM: 300, modelGb: 20, memGb: 5 },
  F32: { files: 1000, rowGroups: 1000, rowsM: 300, modelGb: 40, memGb: 10 },
  F64: { files: 5000, rowGroups: 5000, rowsM: 1500, modelGb: null, memGb: 25 },
  F128: { files: 5000, rowGroups: 5000, rowsM: 3000, modelGb: null, memGb: 50 },
  F256: { files: 5000, rowGroups: 5000, rowsM: 6000, modelGb: null, memGb: 100 },
  F512: { files: 10000, rowGroups: 10000, rowsM: 12000, modelGb: null, memGb: 200 },
  F1024: { files: 10000, rowGroups: 10000, rowsM: 24000, modelGb: null, memGb: 400 },
  F2048: { files: 10000, rowGroups: 10000, rowsM: 24000, modelGb: null, memGb: 400 },
};

/** Planning heuristics (not Microsoft rules): background share of CU at which separation is advised. */
export const ISOLATION_RULE = { separateAtPct: 30, considerAtPct: 15 };
const DEV_CAPACITY = { sku: "F4", hoursPerMonth: 176 };

/**
 * Compares one shared capacity with production reporting, engineering (ETL / Spark / Dataflows)
 * and dev/test on separate capacities. Engineering and dev/test are priced pay-as-you-go for the
 * hours they run, because a paused capacity does not bill.
 */
export function planIsolation(plan, { backgroundSharePct = 0, etlHoursPerDay = 12, viewers = 0 } = {}) {
  const need = plan.requiredCuNow;
  const sharePct = clamp(toNum(backgroundSharePct, 0), 0, 90);
  const hours = clamp(toNum(etlHoursPerDay, 12), 1, 24);
  const shared = nextSize(need);
  const sharedAnnual = Math.round(applyDiscount(shared.reserved) * 12);
  const base = { known: sharePct > 0, sharePct, hours, shared: { sku: shared.sku, annualUsd: sharedAnnual } };
  if (!sharePct) return { ...base, recommendation: "unknown" };

  const share = sharePct / 100;
  let prod = nextSize(need * (1 - share));
  let prodNote = "";
  if (toNum(viewers) >= plan.f64BreakEvenViewers && prod.cu < FABRIC.freeViewerThresholdCu) {
    prod = bySku("F64");
    prodNote = "Raised to F64 so report viewers do not each need a Pro licence.";
  }
  const etl = nextSize(Math.max(2, need * share));
  const dev = bySku(DEV_CAPACITY.sku);
  const prodAnnual = Math.round(applyDiscount(prod.reserved) * 12);
  const etlAnnual = Math.round(applyDiscount(etl.payg) * 12 * (hours / 24));
  const devAnnual = Math.round(applyDiscount(dev.payg) * 12 * (DEV_CAPACITY.hoursPerMonth / 730));
  const splitAnnual = prodAnnual + etlAnnual + devAnnual;

  const recommendation = sharePct >= ISOLATION_RULE.separateAtPct ? "separate" : sharePct >= ISOLATION_RULE.considerAtPct ? "consider" : "shared";
  return {
    ...base,
    recommendation,
    split: {
      prod: { sku: prod.sku, annualUsd: prodAnnual, note: prodNote },
      etl: { sku: etl.sku, annualUsd: etlAnnual, hours },
      dev: { sku: dev.sku, annualUsd: devAnnual, hoursPerMonth: DEV_CAPACITY.hoursPerMonth },
      annualUsd: splitAnnual,
    },
    extraUsd: splitAnnual - sharedAnnual,
    provisionedCu: { shared: shared.cu, split: prod.cu + etl.cu + dev.cu },
  };
}

/** Alert and action ladder for a capacity of `cu` CUs. The first rungs are proposals; the last three are Microsoft's throttle stages. */
export function capacityLadder(cu) {
  const at = (p) => Math.round(((cu * p) / 100) * 10) / 10;
  return [
    { id: "watch", usage: "70% of CU, sustained for an hour", cu: at(70), source: "proposed", action: "Review the top items in the Capacity Metrics app. Reschedule or move the heaviest background job." },
    { id: "act", usage: "80% peak (the sizing target) on three days in a week", cu: at(80), source: "proposed", action: "Raise a scale-up or workload-move request. Freeze new production items on this capacity until it is decided." },
    { id: "delay", usage: "Smoothed use has consumed the next 10 minutes of capacity", cu: at(100), source: "microsoft", action: "Throttling begins: new interactive operations are delayed 20 seconds. Scale up temporarily or stop the offending job." },
    { id: "reject", usage: "Smoothed use has consumed the next 60 minutes", cu: at(100), source: "microsoft", action: "New interactive operations (report views, queries) are rejected. Background jobs still start." },
    { id: "stop", usage: "Smoothed use has consumed the next 24 hours", cu: at(100), source: "microsoft", action: "All new requests, interactive and background, are rejected until the overage is paid off." },
    { id: "down", usage: "Peak below 50% for 14 days", cu: at(50), source: "proposed", action: "Size down at the next review. Reserve only the stable baseline." },
  ];
}

/** A single job should not take more than `pct` of a day's CU-hours without sign-off. */
export function jobBudget(cu, pct = 5) {
  const dailyCuHours = cu * 24;
  return { pct, dailyCuHours, singleJobCuHours: Math.round(dailyCuHours * (pct / 100) * 10) / 10 };
}

/* -----------------------------------------------------------------------------
 * Migration risk + timeline
 * -------------------------------------------------------------------------- */

/**
 * Estimates migration effort from inventory facts. The weights are a transparent
 * planning heuristic, not a Microsoft rule, and are returned so they can be audited.
 */
export const MIGRATION_WEIGHTS = {
  base: 10,
  perWorkspace: 0.4,
  perLargeModel: 3,
  perGatewayDependency: 1.5,
  perCrossRegion: 2,
  perFabricItemWorkspace: 0.8,
};

export function estimateMigration(m, overlapDays) {
  const w = MIGRATION_WEIGHTS;
  const days = Math.round(
    w.base +
      toNum(m.workspaces) * w.perWorkspace +
      toNum(m.largeModels) * w.perLargeModel +
      toNum(m.gatewayDependent) * w.perGatewayDependency +
      toNum(m.crossRegion) * w.perCrossRegion +
      toNum(m.withFabricItems) * w.perFabricItemWorkspace
  );
  const od = overlapDays == null || overlapDays === "" ? null : toNum(overlapDays, NaN);
  let risk = "unknown";
  if (od != null && Number.isFinite(od)) risk = days > od ? "high" : days > od * 0.7 ? "medium" : "low";
  return { estimatedDays: days, overlapDays: od != null && Number.isFinite(od) ? od : null, risk, weights: w };
}

/**
 * Builds a dated migration runbook working backwards from the renewal date and
 * pushing any step that lands in your organization's change freeze to the next safe day.
 */
export function buildMigrationPlan({ renewalDate, estimatedDays }) {
  const steps = [
    { id: "baseline", name: "Baseline & inventory", days: 10, detail: "Export Capacity Metrics and the workspace inventory; confirm peak and P95 utilisation; list large models, gateways and cross-region workspaces." },
    { id: "cleanup", name: "Clean up dead content", days: 10, detail: "Archive unused reports and workspaces so they are not carried into new capacity." },
    { id: "provision", name: "Provision F-SKU in a US region", days: 3, detail: "Create the Fabric capacity (pay-as-you-go first), match admins, set notifications and any delegated tenant settings that were overridden on the P-SKU." },
    { id: "pilot", name: "Pilot workspace + rollback test", days: 7, detail: "Reassign one representative workspace, rerun cancelled jobs, validate refresh timing and Direct Lake / large-model behaviour, rehearse rollback." },
    { id: "wave", name: "Production waves", days: Math.max(5, Math.round((estimatedDays ?? 20) * 0.5)), detail: "Reassign workspaces in waves outside business-critical windows. Active jobs are cancelled on reassignment — schedule accordingly." },
    { id: "reserve", name: "Reserve the proven baseline", days: 2, detail: "Only after the pilot and first waves confirm real utilisation, purchase the reservation for the stable baseline." },
    { id: "retire", name: "Validate and retire P-SKU", days: 5, detail: "Confirm every workspace is reassigned and healthy, then delete the old Premium capacity." },
  ];

  const total = steps.reduce((a, s) => a + s.days, 0);
  const end = renewalDate ? parseLocalDate(renewalDate) : null;
  if (!end || Number.isNaN(end.getTime())) return { steps, totalDays: total, start: null, end: null, freezeConflicts: [] };

  // Back-schedule so the plan finishes at least 14 days before the renewal date.
  const finish = new Date(end);
  finish.setDate(finish.getDate() - 14);
  const start = new Date(finish);
  start.setDate(start.getDate() - total);

  const out = [];
  const conflicts = [];
  let cursor = new Date(start);
  for (const s of steps) {
    let from = new Date(cursor);
    if (s.id === "provision" || s.id === "pilot" || s.id === "wave" || s.id === "retire") {
      if (inChangeFreeze(from) || inChangeFreeze(new Date(from.getTime() + s.days * 86400000))) {
        conflicts.push({ step: s.name, wouldStart: new Date(from), movedTo: nextSafeWindow(from) });
        from = nextSafeWindow(from);
      }
    }
    const to = new Date(from);
    to.setDate(to.getDate() + s.days);
    out.push({ ...s, from, to });
    cursor = new Date(to);
  }

  return {
    steps: out,
    totalDays: total,
    start: out[0].from,
    end: out[out.length - 1].to,
    renewal: end,
    pastRenewal: out[out.length - 1].to > end,
    freezeConflicts: conflicts,
  };
}
