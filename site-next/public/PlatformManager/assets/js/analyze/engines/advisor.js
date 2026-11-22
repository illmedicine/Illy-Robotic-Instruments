/* =============================================================================
 * engines/advisor.js — renewal position, levers and timeline for your organization.
 *
 * Every lever is tagged with the evidence behind it:
 *   measured  — derived from data uploaded to this workbench
 *   profile   — derived from the organisation profile
 *   benchmark — a planning assumption (illustrative, not a customer result)
 * Executives can therefore see how much of a savings range is evidence and how
 * much is assumption.
 * ========================================================================== */

import { store, toNum, clamp, parseLocalDate } from "../core.js";
import { orgContext, unitPrice, nextFiscalMilestones, inChangeFreeze } from "../org.js";
import { productById } from "../data/products.js";

/** Illustrative planning ranges. Replace with validated figures as they accrue. */
export const BENCHMARKS = {
  status: "illustrative",
  wasteShare: { low: 0.2, typical: 0.27, high: 0.35 },
  mixSaving: { low: 0.03, high: 0.09 },
  e5Scope: { low: 0.1, high: 0.25 },
  azure: { low: 0.02, high: 0.08 },
  supportIdle: { low: 0.04, high: 0.12 },
  supportUnder: { low: 0.12, high: 0.3 },
  note: "Planning assumptions for illustration. Not a guarantee; actual outcomes depend on your organization's estate and negotiation.",
};

/** Saved outputs from other modules, so the advisor uses evidence when it exists. */
export const results = {
  get: (k) => store.get(`result.${k}`, null),
  set: (k, v) => store.set(`result.${k}`, { ...v, savedAt: new Date().toISOString() }),
};

export function advise(override = {}) {
  const ctx = orgContext();
  const p = { ...ctx.profile, ...override };

  const waste = results.get("waste");
  const fabric = results.get("fabric");
  const decisions = results.get("decisions");

  const licence = Math.max(0, toNum(p.annualLicenceSpend));
  const azure = Math.max(0, toNum(p.annualAzureSpend));
  const support = Math.max(0, toNum(p.annualSupportSpend));
  const total = licence + azure + support;

  const levers = [];
  const push = (l) => levers.push({ evidence: "benchmark", asks: [], ...l });

  /* --- Right-size: measured waste if we have it --- */
  if (waste?.totalAnnualWaste > 0 && waste.totalAnnualCost > 0) {
    const share = waste.totalAnnualWaste / waste.totalAnnualCost;
    push({
      id: "rightsize", title: "Remove shelfware before renewal", evidence: "measured",
      why: `Uploaded tenant data shows ${(share * 100).toFixed(1)}% of licence cost (${fmtUsd(waste.totalAnnualWaste)}/yr) is unassigned or inactive. Remove it from the baseline — every discount then applies to a smaller number.`,
      lowUsd: Math.round(waste.totalAnnualWaste * 0.4), highUsd: Math.round(waste.totalAnnualWaste * 0.8),
      asks: ["Quantities set from the tenant-verified baseline", "Reduction rights on high-risk SKUs"],
    });
  } else if (licence) {
    const s = BENCHMARKS.wasteShare.typical;
    push({
      id: "rightsize", title: "Right-size before you renew",
      why: `No tenant data loaded yet. At a benchmark of ${(s * 100).toFixed(0)}%, roughly ${fmtUsd(licence * s)}/yr of licence spend may be unused. Upload a SKU or user export to replace this with evidence.`,
      lowUsd: Math.round(licence * s * 0.4), highUsd: Math.round(licence * s * 0.8),
      asks: ["Tenant-verified usage baseline"],
    });
  }

  /* --- Persona mix: frontline / clinical --- */
  const frontline = toNum(p.frontlineUsers);
  if (frontline > 0) {
    const e3 = unitPrice("m365-e3", productById("m365-e3").listPriceUsd).price;
    const f3 = unitPrice("m365-f3", productById("m365-f3").listPriceUsd).price;
    const per = Math.max(0, e3 - f3) * 12;
    push({
      id: "mix", title: "Move frontline roles to F3", evidence: "profile",
      why: `${frontline.toLocaleString("en-US")} frontline users are in the profile. If a share of them hold E3-class seats, each moved seat saves about ${fmtUsd(per)}/yr. Roles needing desktop apps or advanced security stay on E3/E5 — validate per role, using workload scenarios.`,
      lowUsd: Math.round(frontline * per * 0.2), highUsd: Math.round(frontline * per * 0.6),
      asks: ["Per-persona licence plan", "Right to move seats between E3, E5 and F3 at anniversary"],
    });
  } else if (licence) {
    push({
      id: "mix", title: "Optimise the SKU mix",
      why: "Move frontline staff to F3, scope E5 to users who need it, retire duplicate stacks (EMS/Windows/Intune under M365). Add the frontline headcount to the Workspace to replace this with a computed figure.",
      lowUsd: Math.round(licence * BENCHMARKS.mixSaving.low), highUsd: Math.round(licence * BENCHMARKS.mixSaving.high),
    });
  }

  /* --- User-level findings: duplicates, disabled, guests --- */
  if (waste?.users) {
    const u = waste.users;
    const dup = u.duplicates?.annual ?? 0;
    if (dup > 0) {
      push({
        id: "duplicates", title: "Retire duplicate stacks", evidence: "measured",
        why: `${(u.duplicates.count ?? 0).toLocaleString("en-US")} users hold a licence already included in another one they hold (e.g. Entra P1 / Intune / EMS under M365 E3/E5).`,
        lowUsd: Math.round(dup * 0.7), highUsd: Math.round(dup),
        asks: ["Group-based licensing clean-up before the quantity baseline is set"],
      });
    }
  }

  /* --- E5 scoping --- */
  if (licence) {
    push({
      id: "e5scope", title: "Scope E5 to the users who need it",
      why: ctx.hasThirdPartyEdr
        ? "A third-party EDR is the active control, so E5 security entitlements may be duplicated spend. Trade that duplication for pricing, or scope E5 to compliance and privileged populations."
        : "E5 across the whole workforce is rarely needed. Purview, PIM and advanced eDiscovery matter most for compliance, legal, privacy and privileged-access roles.",
      lowUsd: Math.round(licence * BENCHMARKS.e5Scope.low * 0.1), highUsd: Math.round(licence * BENCHMARKS.e5Scope.high * 0.2),
      asks: ["E3 baseline + E5 add-ons for named populations", "Step-up pricing over the term"],
    });
  }

  /* --- Fabric --- */
  if (fabric?.bestSavingUsd > 0) {
    push({
      id: "fabric", title: "Right-size Fabric capacity", evidence: "measured",
      why: `The Fabric Planner shows ${fmtUsd(fabric.bestSavingUsd)}/yr against current Premium cost for the ${fabric.bestLabel} scenario.`,
      lowUsd: Math.round(fabric.bestSavingUsd * 0.6), highUsd: Math.round(fabric.bestSavingUsd),
      asks: ["Overlap window of adequate length in writing", "Reserve baseline only; burst on pay-as-you-go"],
    });
  }

  /* --- Azure / MACC --- */
  if (azure) {
    const shortfall = p.maccAnnualCommit > 0 && p.maccAnnualConsumed > 0 && p.maccAnnualConsumed / p.maccAnnualCommit < 0.85;
    push({
      id: "azure", title: shortfall ? "Azure commitment is behind — fix before renewing" : "Azure commitment structure", evidence: shortfall ? "profile" : "benchmark",
      why: shortfall
        ? `Consumed is ${((p.maccAnnualConsumed / p.maccAnnualCommit) * 100).toFixed(0)}% of commit. Do not grow the commitment; move eligible spend (Fabric, Marketplace) onto Azure and seek carry-forward.`
        : `Size the MACC to a defensible forecast; claim Hybrid Benefit${ctx.onPremHeavy ? " (high value given your organization's on-premises Windows/SQL estate)" : ""}; confirm Marketplace eligibility.`,
      lowUsd: Math.round(azure * BENCHMARKS.azure.low), highUsd: Math.round(azure * BENCHMARKS.azure.high),
      asks: ["MACC shortfall protection", "Marketplace eligibility", "Hybrid Benefit entitlement review"],
    });
  }

  /* --- Support / EDE --- */
  if (support) {
    const util = p.edeUtilizationPct;
    const under = util != null && util < 70;
    const r = under ? BENCHMARKS.supportUnder : BENCHMARKS.supportIdle;
    push({
      id: "support", title: under ? `Support: EDE utilisation is only ${util}%` : "Support: itemise and benchmark", evidence: under ? "profile" : "benchmark",
      why: under
        ? `Your organization used ${util}% of ${p.edeHours || "its"} EDE hours. Resize the allocation or convert unused hours into proactive credits.`
        : "Unified Support is negotiable independently of licences — ask for itemised pricing and credit roll-over.",
      lowUsd: Math.round(support * r.low), highUsd: Math.round(support * r.high),
      asks: ["Hours-to-deliverables plan", "Unused-hour conversion", "Itemised tiers and credits"],
    });
  }

  /* --- Copilot discipline --- */
  push({
    id: "copilot", title: "Phase Copilot against adoption and data governance",
    why: ctx.regulated
      ? "Copilot reads whatever a user can already reach. For a PHI-holding organisation, clean up over-shared locations and label PHI before broad rollout, and obtain written AI data-handling commitments."
      : "Phase purchases against adoption milestones; ask for pilot pricing and reassignment rights.",
    lowUsd: 0, highUsd: 0, noPrice: true,
    asks: ["Reassignment rights", "Written AI data-use and residency commitments", "No large first-term Copilot quantity"],
  });

  /* --- Protections (contract quality, not a price lever) --- */
  push({
    id: "protect", title: "Lock price protection and flexibility",
    why: p.agreementType === "CSP"
      ? "Annual-billed CSP protects against monthly premiums; price an EA / MCA-E for comparison."
      : "Price protection and reduction rights are worth more than a headline discount if list prices change mid-term.",
    lowUsd: 0, highUsd: Math.round(licence * 0.04), evidence: "benchmark",
    asks: ["Protection on mid-term additions", "Co-terming at contracted unit prices", "Reduction rights tied to named SKUs"],
  });

  const lowTotal = levers.reduce((a, l) => a + (l.lowUsd || 0), 0);
  const highTotal = levers.reduce((a, l) => a + (l.highUsd || 0), 0);
  const measured = levers.filter((l) => l.evidence === "measured").reduce((a, l) => a + (l.highUsd || 0), 0);

  /* --- Leverage score --- */
  let leverage = 40;
  const notes = [];
  const bump = (n, why) => { leverage += n; notes.push({ delta: n, why }); };
  if (p.hasAlternative) bump(15, "A credible alternative is documented");
  if (total > 1_000_000) bump(10, "Spend above $1M");
  if (azure > 250_000) bump(8, "Azure spend above $250K");
  if (waste?.totalAnnualWaste > 0) bump(6, "Measured shelfware strengthens the right-sizing ask");
  const dl = ctx.daysToRenewal;
  if (dl != null) {
    if (dl > 180) bump(12, "More than 180 days to renewal");
    else if (dl < 60) bump(-15, "Fewer than 60 days to renewal");
  }
  const dd = ctx.daysToDeadline;
  if (dd != null && dd >= 0 && dd <= 7) bump(-12, `Response deadline in ${dd} day(s)`);
  leverage = clamp(leverage, 5, 95);

  /* --- Warnings --- */
  const warnings = [];
  if (dd != null && dd >= 0 && dd <= 14)
    warnings.push(`${dd} day(s) until the ${parseLocalDate(p.responseDeadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} response deadline. Decisions lock the next ${p.termYears || 3}-year commitment.`);
  if (dd != null && dd < 0) warnings.push("The response deadline has passed. Confirm in writing what Microsoft has recorded and whether amendments are still possible.");
  if (dl != null && dl >= 0 && dl < 60) warnings.push(`Only ${dl} days to renewal — leverage is reduced. Request a short extension or co-termed bridge.`);
  if (p.agreementType === "Unknown") warnings.push("Confirm the agreement type; many rights differ between EA, MCA-E and CSP.");
  if (!ctx.completeness.ready) warnings.push(`Workspace is ${ctx.completeness.score}% complete — missing: ${ctx.completeness.missing.join(", ")}. Figures use benchmarks where data is absent.`);
  if (ctx.staleGuests.length) warnings.push(`${ctx.staleGuests.length} guest tenant(s) are past their review date: ${ctx.staleGuests.map((t) => t.name).join(", ")}.`);
  if (decisions?.overall?.outstanding > 0) warnings.push(`${decisions.overall.outstanding.toLocaleString("en-US")} account decisions are still outstanding in the imported renewal export.`);

  /* --- Timeline --- */
  const milestones = nextFiscalMilestones().slice(0, 4);
  const timeline = [];
  if (dl != null) {
    timeline.push({ when: "T-270 → T-180", what: "Baseline usage from tenant data; classify users by persona; map duplicates." });
    timeline.push({ when: "T-180 → T-90", what: "Build as-is, right-sized and alternative scenarios; request itemised quotes." });
    timeline.push({ when: "T-90 → T-30", what: `Negotiate against a Microsoft quarter-end. Next: ${milestones[0]?.label ?? "—"}; strongest: FY end 30 Jun.` });
    timeline.push({ when: "T-30 → T-0", what: "Paper the terms: price protection, reduction rights, co-terming. Verbal promises do not count." });
  }
  const freeze = inChangeFreeze();

  return {
    ctx,
    leverageScore: leverage, leverageNotes: notes,
    daysToRenewal: dl, daysToDeadline: dd,
    totals: { licence, azure, support, total },
    levers: levers.map((l) => ({ ...l, lowUsd: l.lowUsd || 0, highUsd: l.highUsd || 0 })),
    savings: { low: lowTotal, high: highTotal, measuredHigh: measured, evidenceShare: highTotal ? measured / highTotal : 0 },
    savingsOfSpend: total ? { low: lowTotal / total, high: highTotal / total } : null,
    warnings, timeline, milestones, inChangeFreeze: freeze,
    termYears: p.termYears || 3,
    inputs: {
      usedWaste: Boolean(waste), usedFabric: Boolean(fabric), usedDecisions: Boolean(decisions),
    },
    caveat: "Modeled ranges from planning assumptions and the data supplied — not a quote or a guarantee. Validate against your organization's agreement.",
  };
}

function fmtUsd(n) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
