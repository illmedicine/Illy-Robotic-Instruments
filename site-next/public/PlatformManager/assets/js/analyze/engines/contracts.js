/* =============================================================================
 * engines/contracts.js — contract term review against your organization's environment.
 *
 * The engine is deterministic and explainable: every finding carries the exact
 * text it was derived from and the rule that fired. It reads the agreement the
 * way a contracts analyst would — what is present, what is missing, what is
 * risky, and what it means given your organization's profile — and produces specific asks.
 *
 * It does not replace Legal review. It prepares the questions Legal and
 * Procurement should be asking.
 * ========================================================================== */

import { TERMS } from "../data/terms.js";
import { CLAUSES, REDLINES } from "../data/redlines.js";
import { toNum, parseLocalDate } from "../core.js";
import { orgContext } from "../org.js";
import { analyzePricing, pricingFindings, PRICING_SCOPES, precedentWhy, why } from "./pricing.js";
import { evidenceFor } from "../data/peers.js";

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20, thirty: 30, sixty: 60, ninety: 90 };
const numOf = (s) => {
  const v = String(s).toLowerCase().trim();
  return NUM_WORDS[v] ?? toNum(v, NaN);
};

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
// Matches "90 days", "ninety (90) days" and "(90) calendar days"; the number is capture group 1.
const DAYS = "(?:\\(\\s*)?(\\d{1,3})\\s*\\)?\\s*(?:calendar |business )?days?";
const DATE_RE = new RegExp(
  `(${MONTHS})[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}`,
  "gi"
);

/* -----------------------------------------------------------------------------
 * Text helpers
 * -------------------------------------------------------------------------- */
export function splitSentences(text) {
  return text
    .split(/(?<=[.;:!?])\s+(?=[A-Z(\d"“])|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 12);
}

const clip = (s, n = 320) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function findSentences(sentences, re, limit = 3) {
  const hits = [];
  for (const s of sentences) {
    if (re.test(s)) {
      hits.push(clip(s));
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

function parseDate(s) {
  const d = new Date(String(s).replace(/(\d)(st|nd|rd|th)/i, "$1"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/* -----------------------------------------------------------------------------
 * Fact extraction
 * -------------------------------------------------------------------------- */
export function extractFacts(text, sentences = splitSentences(text)) {
  const facts = {};

  // --- Term length ---
  for (const s of sentences) {
    if (!/\b(term|period|duration|agreement)\b/i.test(s)) continue;
    const m = s.match(/\b(one|two|three|four|five|six|twelve|thirty[- ]?six|\d{1,2})\s*(?:\(\s*\d+\s*\)\s*)?[- ]?(year|month)s?\b/i);
    if (!m) continue;
    let n = numOf(m[1].replace(/[- ]/g, "")) || numOf(m[1]);
    if (/thirty[- ]?six/i.test(m[1])) n = 36;
    if (!Number.isFinite(n)) continue;
    const months = /year/i.test(m[2]) ? n * 12 : n;
    if (months >= 6 && months <= 120) {
      facts.termMonths = { value: months, evidence: clip(s) };
      break;
    }
  }

  // --- Key dates ---
  const dateRoles = [
    ["effectiveDate", /(effective|commenc|start|begin)/i],
    ["expirationDate", /(expir|terminat|end(s)?\b|conclu|through|until)/i],
    ["renewalDate", /(renew)/i],
  ];
  for (const s of sentences) {
    const dates = [...s.matchAll(DATE_RE)];
    if (!dates.length) continue;
    for (const [key, ctx] of dateRoles) {
      if (facts[key]) continue;
      for (const dm of dates) {
        const before = s.slice(Math.max(0, dm.index - 70), dm.index);
        if (ctx.test(before)) {
          const d = parseDate(dm[0]);
          if (d) { facts[key] = { value: d, evidence: clip(s) }; break; }
        }
      }
    }
  }

  // --- Notice periods ---
  const notices = [];
  for (const s of sentences) {
    const m = s.match(new RegExp(`${DAYS}['’]?\\s*(?:prior |advance )?(?:written )?notice|notice[^.]{0,60}?${DAYS}`, "i"));
    if (m) {
      const days = toNum(m[1] ?? m[2], NaN);
      if (days > 0 && days <= 365) notices.push({ days, evidence: clip(s), renewalRelated: /renew|non-?renew|expir/i.test(s) });
    }
  }
  if (notices.length) facts.notices = notices.slice(0, 4);

  // --- Auto-renewal ---
  const auto = findSentences(sentences, /auto(?:matic(?:ally)?)?[- ]?renew|renew(?:s|ed)? automatically|evergreen/i, 2);
  if (auto.length) facts.autoRenew = { evidence: auto };

  // --- Money ---
  const money = [];
  for (const s of sentences) {
    for (const m of s.matchAll(/\$\s?([\d,]+(?:\.\d+)?)(?:\s*(million|billion|m|k|thousand))?/gi)) {
      let v = toNum(m[1], NaN);
      const unit = (m[2] ?? "").toLowerCase();
      if (unit === "million" || unit === "m") v *= 1e6;
      else if (unit === "billion") v *= 1e9;
      else if (unit === "thousand" || unit === "k") v *= 1e3;
      if (Number.isFinite(v) && v >= 1000) money.push({ value: v, evidence: clip(s) });
    }
  }
  if (money.length) {
    facts.amounts = money.slice(0, 12);
    const commit = money.find((x) => /commit|minimum|consumption|MACC|annual (spend|fee)|total (contract|value)/i.test(x.evidence));
    if (commit) facts.commitment = commit;
  }

  // --- Percentages ---
  const pcts = [];
  for (const s of sentences) {
    for (const m of s.matchAll(/(\d{1,2}(?:\.\d+)?)\s?%/g)) {
      const v = toNum(m[1], NaN);
      if (v > 0 && v <= 100) {
        const kind = /discount/i.test(s) ? "discount" : /(increase|escalat|uplift|cap)/i.test(s) ? "increase-cap" : /reduc|true[- ]?down|decreas/i.test(s) ? "reduction-limit" : "other";
        if (kind !== "other") pcts.push({ value: v, kind, evidence: clip(s) });
      }
    }
  }
  if (pcts.length) facts.percentages = pcts.slice(0, 8);

  // --- EDE hours ---
  for (const s of sentences) {
    if (!/(designated engineer|\bEDE\b|proactive)/i.test(s)) continue;
    const m = s.match(/([\d,]{2,6})\s*(?:annual\s+|proactive\s+)?hours/i);
    if (m) { facts.edeHours = { value: toNum(m[1]), evidence: clip(s) }; break; }
  }

  // --- Migration overlap ---
  for (const s of sentences) {
    if (!/(overlap|transition|migration)\s+(period|window)|both\s+(licen[cs]es|capacit)/i.test(s)) continue;
    const m = s.match(new RegExp(DAYS, "i"));
    if (m) { facts.overlapDays = { value: toNum(m[1], NaN), evidence: clip(s) }; break; }
  }

  // --- MACC ---
  for (const s of sentences) {
    if (!/(azure consumption commitment|\bMACC\b|monetary commitment)/i.test(s)) continue;
    const m = s.match(/\$\s?([\d,]+(?:\.\d+)?)(?:\s*(million|m|k|thousand))?/i);
    if (m) {
      let v = toNum(m[1], NaN);
      const unit = (m[2] ?? "").toLowerCase();
      if (unit === "million" || unit === "m") v *= 1e6;
      else if (unit === "thousand" || unit === "k") v *= 1e3;
      if (Number.isFinite(v)) { facts.macc = { value: v, evidence: clip(s) }; break; }
    }
  }

  // --- Liability cap ---
  const cap = findSentences(sentences, /(limit(ed|ation)? of liability|liability[^.]{0,60}(limited|shall not exceed|capped)|aggregate liability)/i, 2);
  if (cap.length) facts.liabilityCap = { evidence: cap };

  return facts;
}

/* -----------------------------------------------------------------------------
 * Term detection
 * -------------------------------------------------------------------------- */
export function detectTerms(text, sentences = splitSentences(text)) {
  return TERMS.map((t) => {
    const evidence = [];
    for (const re of t.patterns ?? []) {
      for (const s of sentences) {
        if (re.test(s) && !evidence.includes(clip(s))) evidence.push(clip(s));
        if (evidence.length >= 3) break;
      }
      if (evidence.length >= 3) break;
    }
    return { id: t.id, term: t.term, category: t.category, expected: t.expected, present: evidence.length > 0, evidence };
  });
}

/* -----------------------------------------------------------------------------
 * Risk rules
 * -------------------------------------------------------------------------- */
const RISK_RULES = [
  {
    id: "unilateral-change",
    level: "high",
    title: "Vendor may change prices or terms unilaterally",
    re: /(reserve[s]? the right|may|right)\s+(?:at any time\s+)?to\s+(modify|change|update|amend|revise)\s+(?:the\s+)?(price|pricing|fees|terms|product terms)/i,
    why: "If pricing or terms can change during the term, any quantity commitment is exposed to terms you did not agree.",
    ask: "Fix pricing for the full term and require written, signed amendment for any change that affects your organization.",
    termId: "price-protection",
  },
  {
    id: "then-current",
    level: "med",
    title: "Pricing tied to 'then-current' or list price",
    re: /(then[- ]current|prevailing|current list)\s+(price|pricing|rate)/i,
    why: "Pricing indexed to a moving list price means renewal and mid-term additions are not locked at contracted rates.",
    ask: "Agree contracted unit prices for all SKUs your organization may add, not only the day-one list.",
    termId: "price-protection",
  },
  {
    id: "audit-by-vendor",
    level: "med",
    title: "Vendor licence-compliance audit / verification rights",
    re: /(verif(?:y|ication)|audit)[^.]{0,80}(compliance|licen[cs]e|use)/i,
    why: "Vendor verification rights can lead to true-up claims on a poorly documented estate. Records must be defensible.",
    ask: "Define the audit process, notice period, scope limits and confidentiality. Keep an entitlement register ready (this tool's Workspace helps).",
    termId: "audit-rights",
  },
  {
    id: "no-convenience-exit",
    level: "med",
    title: "No termination-for-convenience language found",
    test: (text) => /terminat/i.test(text) && !/for convenience/i.test(text),
    why: "Without a convenience exit, shelfware and unwanted subscriptions run to the end of the term.",
    ask: "Negotiate termination or reduction rights on non-core subscriptions (Copilot, add-ons, premium suites).",
    termId: "termination",
  },
  {
    id: "shortfall-billed",
    level: "med",
    title: "Commitment shortfall is billed",
    re: /(shortfall|unused|unconsumed)[^.]{0,80}(invoice|bill|charg|pay|forfeit)/i,
    why: "An unmet commitment converts directly into cost. An oversized commitment is a forecasting loss.",
    ask: "Seek shortfall carry-forward or term extension and size the commitment to a defensible P50 forecast.",
    termId: "macc",
  },
  {
    id: "true-up-uncapped",
    level: "med",
    title: "True-up pricing not pre-agreed",
    test: (text) => /true[- ]?up/i.test(text) && !/true[- ]?up[^.]{0,120}(price|rate|contracted)/i.test(text),
    why: "If true-up unit prices are not fixed, growth is billed at whatever rate applies at the time.",
    ask: "Pre-agree the unit price for true-up quantities at the contracted rate.",
    termId: "true-up",
  },
];

/* -----------------------------------------------------------------------------
 * Environment cross-checks (the part that makes this organization-specific)
 * -------------------------------------------------------------------------- */
const daysBetween = (a, b) => Math.round((a.getTime() - b.getTime()) / 86400000);

function environmentChecks(facts, detected, ctx) {
  const p = ctx.profile;
  const present = (id) => detected.find((d) => d.id === id)?.present;
  const out = [];
  const add = (f) => out.push({ scope: "environment", ...f });

  // Regulated organisation: BAA and residency are threshold requirements.
  if (ctx.regulated && !present("baa")) {
    add({
      id: "env-baa", level: "high", termId: "baa",
      title: "No HIPAA / Business Associate language found",
      text: "Your organization holds PHI in Microsoft workloads, but this document contains no reference to a BAA or HIPAA.",
      ask: "Confirm the Microsoft HIPAA BAA applies to every in-scope service, and that scope changes are notified in writing. Do not add new PHI-touching services without confirmation.",
    });
  }
  if (ctx.usOnly && !present("data-residency")) {
    add({
      id: "env-residency", level: "high", termId: "data-residency",
      title: "No data-residency commitment found",
      text: "Your organization requires US-only data residency; the document does not state where data is stored or processed.",
      ask: "Obtain an explicit US-region commitment for data at rest and for AI / cross-region processing features, including Fabric capacity and Copilot.",
    });
  }
  if (ctx.has("hitrust") && !present("audit-rights")) {
    add({
      id: "env-audit", level: "med", termId: "audit-rights",
      title: "No audit / compliance evidence rights found",
      text: "HITRUST assessment needs vendor control evidence. The document does not guarantee access to audit reports.",
      ask: "Secure annual SOC 2 Type II / ISO 27001 delivery and Service Trust Portal access for your compliance staff.",
    });
  }
  if (ctx.federal) {
    add({
      id: "env-gov-contracts", level: "med", termId: "data-residency",
      title: "Federal Employee Program workloads",
      text: "Government or regulated-programme data can carry additional contractual and hosting obligations that a commercial-cloud agreement may not satisfy.",
      ask: "Confirm which tenants hold that data, which environment they must be hosted in, and that this agreement's terms are the correct vehicle for them.",
    });
  }

  // Dates & term vs profile.
  const exp = facts.expirationDate?.value;
  if (exp && p.renewalDate) {
    const prof = parseLocalDate(p.renewalDate);
    const diff = Math.abs(daysBetween(exp, prof));
    if (diff > 30) {
      add({
        id: "env-renewal-mismatch", level: "med",
        title: "Expiry date differs from the renewal date in the Workspace",
        text: `The agreement states ${exp.toLocaleDateString("en-US")}; the Workspace has ${prof.toLocaleDateString("en-US")} (${diff} days apart).`,
        ask: "Confirm the controlling date. A wrong renewal date compresses or wastes the negotiation window.",
        evidence: [facts.expirationDate.evidence],
      });
    }
  }
  if (facts.termMonths && p.termYears && Math.abs(facts.termMonths.value - p.termYears * 12) >= 6) {
    add({
      id: "env-term-mismatch", level: "low",
      title: "Term length differs from the Workspace",
      text: `Agreement term reads as ${facts.termMonths.value} months; Workspace term is ${p.termYears * 12} months.`,
      ask: "Align the Workspace so term-total calculations use the real term.",
      evidence: [facts.termMonths.evidence],
    });
  }

  // Notice windows vs renewal timing.
  const renewalNotice = (facts.notices ?? []).find((n) => n.renewalRelated);
  const daysToRenewal = ctx.daysToRenewal;
  if (renewalNotice && daysToRenewal != null && daysToRenewal >= 0) {
    if (daysToRenewal <= renewalNotice.days) {
      add({
        id: "env-notice-passed", level: "high",
        title: "Renewal notice window may already have closed",
        text: `The agreement requires ${renewalNotice.days} days' notice; the renewal is ${daysToRenewal} days away.`,
        ask: "Ask Legal immediately whether notice is still effective, and request a written extension or bridge term.",
        evidence: [renewalNotice.evidence],
      });
    } else if (daysToRenewal - renewalNotice.days <= 60) {
      add({
        id: "env-notice-soon", level: "med",
        title: "Renewal notice deadline is approaching",
        text: `Notice is due ${daysToRenewal - renewalNotice.days} days from now (${renewalNotice.days}-day requirement).`,
        ask: "Diarise the notice date and decide non-renewal or renegotiation before it.",
        evidence: [renewalNotice.evidence],
      });
    }
  }
  if (facts.autoRenew && !renewalNotice) {
    add({
      id: "env-autorenew-nonotice", level: "med",
      title: "Auto-renewal found without a clear notice period",
      text: "The document renews automatically but no notice period was identified.",
      ask: "Identify the exact notice mechanism and date in writing; silent auto-renewal can lock your organization into another term.",
      evidence: facts.autoRenew.evidence,
    });
  }

  // MACC shortfall risk.
  const maccCommit = facts.macc?.value ?? p.maccAnnualCommit;
  if (p.maccAnnualConsumed > 0 && maccCommit > 0) {
    const ratio = p.maccAnnualConsumed / (p.maccAnnualCommit > 0 ? p.maccAnnualCommit : maccCommit);
    if (ratio < 0.85 && p.maccAnnualCommit > 0) {
      add({
        id: "env-macc-shortfall", level: "high", termId: "macc",
        title: "Azure commitment is running behind",
        text: `Consumed is ${(ratio * 100).toFixed(0)}% of the annual commitment (${p.maccAnnualConsumed.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} of ${p.maccAnnualCommit.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}).`,
        ask: "Move eligible spend onto Azure (Fabric capacity and Marketplace offers can count), seek carry-forward, and avoid growing the commitment at renewal.",
      });
    }
  }

  // EDE utilisation.
  const edeUtil = p.edeUtilizationPct;
  if (facts.edeHours && edeUtil != null && edeUtil < 70) {
    add({
      id: "env-ede-under", level: "med", termId: "ede",
      title: `EDE hours under-used (${edeUtil}%)`,
      text: `The agreement buys ${facts.edeHours.value.toLocaleString("en-US")} EDE hours; your organization has used about ${edeUtil}%.`,
      ask: "Cut the allocation to the demonstrated need or convert unused hours to other proactive credits.",
      evidence: [facts.edeHours.evidence],
    });
  }

  // Overlap sizing for Fabric migration.
  if (facts.overlapDays) {
    const d = facts.overlapDays.value;
    add({
      id: "env-overlap", level: d < 60 ? "med" : "low", termId: "migration-overlap",
      title: `Migration overlap of ${d} days found`,
      text: `Compare against the migration estimate on the Fabric Planner.${ctx.changeFreeze ? " Note your organization's Q4 change freeze can consume part of this window." : ""}`,
      ask: "Get an extension right in writing and start Fabric capacity before the renewal date.",
      evidence: [facts.overlapDays.evidence],
    });
  }

  // Frontline-heavy workforce with no reduction rights.
  if (ctx.frontlineHeavy && !present("true-down")) {
    add({
      id: "env-frontline-reduction", level: "med", termId: "true-down",
      title: "No reduction rights, but a large frontline workforce",
      text: "Your organization's frontline and shift roles change seat needs year to year; without reduction rights, surplus seats are paid for the whole term.",
      ask: "Request annual reduction rights on suite SKUs and the ability to move seats between E3, E5 and F3.",
    });
  }

  return out;
}

/* -----------------------------------------------------------------------------
 * Public analysis
 * -------------------------------------------------------------------------- */
export function analyzeContract(text, { name = "Contract", hash = null } = {}) {
  const sentences = splitSentences(text);
  const ctx = orgContext();
  const facts = extractFacts(text, sentences);
  const detected = detectTerms(text, sentences);

  const findings = [];

  // 1. Expected terms missing.
  for (const d of detected) {
    if (!d.expected || d.present) continue;
    const t = TERMS.find((x) => x.id === d.id);
    findings.push({
      id: `missing-${d.id}`, scope: "gap", level: ["baa", "data-residency", "price-protection", "true-down"].includes(d.id) ? "high" : "med",
      termId: d.id,
      title: `Not found: ${t.term}`,
      text: `No language matching ${t.term.toLowerCase()} was detected. ${t.whyItMatters}`,
      ask: t.askFor[0],
      asks: t.askFor,
    });
  }

  // 2. Risk language.
  for (const r of RISK_RULES) {
    let hit = null;
    if (r.re) {
      const ev = findSentences(sentences, r.re, 2);
      if (ev.length) hit = ev;
    } else if (r.test?.(text)) hit = [];
    if (hit) findings.push({ id: r.id, scope: "risk", level: r.level, termId: r.termId, title: r.title, text: r.why, ask: r.ask, evidence: hit });
  }

  // 3. Environment-aware checks.
  findings.push(...environmentChecks(facts, detected, ctx));

  // 4. Terms present — good to know, with the lever to still pull.
  for (const d of detected.filter((x) => x.present && x.expected)) {
    const t = TERMS.find((x) => x.id === d.id);
    findings.push({
      id: `present-${d.id}`, scope: "present", level: "ok", termId: d.id,
      title: `Found: ${t.term}`,
      text: t.plain,
      ask: `Verify the detail: ${t.askFor[0]}`,
      evidence: d.evidence,
    });
  }

  const order = { high: 0, med: 1, low: 2, ok: 3 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  for (const f of findings) {
    const key = f.level === "ok" ? null : REDLINES[f.id];
    if (key) f.redlineKey = key;
  }

  const counts = { high: 0, med: 0, low: 0, ok: 0 };
  findings.forEach((f) => counts[f.level]++);
  const reviewed = detected.filter((d) => d.expected);
  const coverage = reviewed.length ? reviewed.filter((d) => d.present).length / reviewed.length : 0;

  const analysis = {
    name, hash,
    analyzedAt: new Date().toISOString(),
    words: text.split(/\s+/).filter(Boolean).length,
    sentences: sentences.length,
    facts, detected, findings, counts, coverage,
    posture: counts.high >= 3 ? "needs-attention" : counts.high >= 1 ? "caution" : "reasonable",
    pricing: analyzePricing(text, { name, termMonths: facts.termMonths?.value }),
    kind: "agreement",
  };
  const stated = detected.filter((d) => d.expected && d.present).length;
  if (analysis.pricing.lines.length) analysis.kind = stated <= 1 ? "pricing" : "agreement";
  if (analysis.kind === "pricing") reshapeForPriceSheet(analysis);
  if (analysis.pricing.lines.length) applyPricing(analysis, text);
  attachPrecedent(analysis.findings);
  return analysis;
}

/** Gives each term finding its written reasons: the text it rests on and what other public buyers agreed. */
export function attachPrecedent(findings) {
  for (const f of findings) {
    if (f.why || f.level === "ok" || PRICING_SCOPES.has(f.scope)) continue;
    const w = [];
    if (f.scope === "gap") w.push(why("document", "No sentence in the document matched the wording used to detect this term."));
    else if (f.scope === "environment") w.push(why("calculation", "This comes from your own requirements in the Workspace profile (regulated data, US-only residency, HITRUST and similar), checked against the document text, where no matching wording was found."));
    else if (f.evidence?.length) w.push(why("document", "The document says:", { quote: f.evidence[0] }));
    if (f.termId) for (const e of evidenceFor(f.termId).slice(0, 2)) w.push(precedentWhy(e.id));
    const filled = w.filter(Boolean);
    if (filled.length) f.why = filled;
  }
}

const ORDER = { high: 0, med: 1, low: 2, ok: 3 };
const COMPLIANCE_IDS = new Set(["env-baa", "env-residency", "env-audit", "env-gov-contracts", "env-frontline-reduction"]);
const PRICE_LINKED = new Set(["price-protection", "true-down", "true-up"]);

/** A price sheet is not an agreement: its missing clauses are things to secure, not defects in the document. */
function reshapeForPriceSheet(a) {
  a.findings = a.findings.filter((f) => !COMPLIANCE_IDS.has(f.id) && !(f.scope === "gap" && PRICE_LINKED.has(f.termId)));
  for (const f of a.findings) {
    if (f.scope !== "gap") continue;
    f.level = "low";
    delete f.redlineKey;
    f.title = f.title.replace("Not found:", "Not on a price sheet:");
  }
  a.findings.push({
    id: "compliance-in-agreement", scope: "gap", level: "low",
    title: "Compliance terms belong in the agreement, not the quote",
    text: "This document holds prices, not contract terms, so HIPAA / BAA, US data residency, audit evidence and programme hosting terms are not on it.",
    ask: "Confirm the agreement these prices will be bought under carries those terms. Review that agreement here as well.",
  });
  a.posture = "price-sheet";
  recount(a);
}

function recount(a) {
  a.findings.sort((x, y) => ORDER[x.level] - ORDER[y.level]);
  a.counts = { high: 0, med: 0, low: 0, ok: 0 };
  a.findings.forEach((f) => a.counts[f.level]++);
}

/** Replaces the price and term findings with ones recomputed from the current line items. Returns the priced review. */
export function applyPricing(analysis, text) {
  const { review, findings } = pricingFindings({ pricing: analysis.pricing, text, kind: analysis.kind, name: analysis.name });
  analysis.findings = [...analysis.findings.filter((f) => !PRICING_SCOPES.has(f.scope)), ...findings];
  recount(analysis);
  if (analysis.kind === "agreement") analysis.posture = analysis.counts.high >= 3 ? "needs-attention" : analysis.counts.high >= 1 ? "caution" : "reasonable";
  return review;
}

/**
 * One entry per proposed clause, highest-priority first. Several findings can point at the same clause
 * (for example a missing BAA and the PHI cross-check), so they are merged and list every reason.
 */
export function buildRedlines(analysis) {
  const rank = { high: 0, med: 1, low: 2 };
  const byKey = new Map();
  for (const f of analysis.findings) {
    if (!f.redlineKey || !CLAUSES[f.redlineKey]) continue;
    let r = byKey.get(f.redlineKey);
    if (!r) {
      r = { key: f.redlineKey, ...CLAUSES[f.redlineKey], level: f.level, reasons: [], original: null };
      byKey.set(f.redlineKey, r);
    }
    if (rank[f.level] < rank[r.level]) r.level = f.level;
    if (!r.reasons.includes(f.title)) r.reasons.push(f.title);
    if (!r.original && f.evidence?.[0]) r.original = f.evidence[0];
  }
  const out = [...byKey.values()];
  out.sort((a, b) => rank[a.level] - rank[b.level]);
  return out.map((r) => ({ ...r, kind: r.kind === "replace" && !r.original ? "insert" : r.kind }));
}

/** Role-specific framing: same findings, different emphasis. */
export function roleBrief(analysis, roleId) {
  const top = (n, filter = () => true) => analysis.findings.filter((f) => f.level !== "ok" && filter(f)).slice(0, n);
  const money = analysis.facts.commitment?.value;
  const fmt$ = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  switch (roleId) {
    case "cfo":
      return {
        heading: "Financial exposure",
        lead: money ? `The document references a commitment of ${fmt$(money)}.` : "No headline commitment amount could be identified in the text.",
        items: top(6, (f) => ["pricing", "Pricing", "Azure", "Rights"].includes(termCategory(f)) || /commit|shortfall|true|price|macc|ede/i.test(f.title)),
      };
    case "cio":
      return {
        heading: "Decisions and risk",
        lead: `${analysis.counts.high} high-priority and ${analysis.counts.med} medium-priority items. Posture: ${analysis.posture.replace("-", " ")}.`,
        items: top(5, (f) => f.level === "high" || f.scope === "environment"),
      };
    case "it":
      return {
        heading: "Operational and technical",
        lead: "Items that affect capacity, migration and the estate.",
        items: top(6, (f) => /overlap|capacity|migration|residency|fabric|ede|audit/i.test(f.title + f.text) || f.scope === "environment"),
      };
    default:
      return {
        heading: "Clauses to negotiate",
        lead: `${analysis.counts.high + analysis.counts.med} items to raise, ordered by priority.`,
        items: top(10),
      };
  }
}

function termCategory(f) {
  return TERMS.find((t) => t.id === f.termId)?.category ?? "";
}

/** Compare two analyses of the same agreement (e.g. draft v1 vs v2). */
export function compareAnalyses(a, b) {
  const termDiff = [];
  for (const d of b.detected) {
    const before = a.detected.find((x) => x.id === d.id);
    if (before && before.present !== d.present) {
      termDiff.push({ term: d.term, change: d.present ? "added" : "removed" });
    }
  }
  const sevA = a.findings.filter((f) => f.level === "high").map((f) => f.id);
  const sevB = b.findings.filter((f) => f.level === "high").map((f) => f.id);
  return {
    termDiff,
    resolvedHigh: sevA.filter((id) => !sevB.includes(id)),
    newHigh: sevB.filter((id) => !sevA.includes(id)),
    coverageChange: b.coverage - a.coverage,
  };
}
