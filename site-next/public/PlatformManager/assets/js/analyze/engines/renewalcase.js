/* =============================================================================
 * engines/renewalcase.js — one renewal, several documents.
 *
 * A renewal arrives as separate pieces: a price sheet from a reseller, a quote from Microsoft,
 * the contract language. Each is reviewed on its own by contracts.js and pricing.js; this
 * file puts them together so that
 *   - a term found in any document counts as found,
 *   - prices are read against the terms they will actually be bought under, and
 *   - the result can be exported as one negotiating brief.
 * ========================================================================== */

import { TERMS } from "../data/terms.js";
import { CLAUSES, REDLINES, REDLINE_NOTE } from "../data/redlines.js";
import { getProfile, orgContext } from "../org.js";
import { parseLocalDate } from "../core.js";
import { buildRedlines, attachPrecedent } from "./contracts.js";
import { priceLines, compareOffers, channelOf, usd, PRICING_SCOPES, why, precedentWhy, tenantKindOf, TENANT_KINDS } from "./pricing.js";
import { advisorBand, advisorTier, PEER_EVIDENCE, PEER_SOURCES, PEER_CLAIMS_CHECKED } from "../data/peers.js";

export const ROLE_OPTIONS = [["pricing", "Pricing / quote"], ["contract", "Contract language"], ["both", "Both"]];
export const defaultRole = (a) => (a.pricing?.lines?.length ? (a.kind === "pricing" ? "pricing" : "both") : "contract");
export const roleOf = (d) => d.role ?? defaultRole(d.analysis);

const RANK = { high: 0, med: 1, low: 2, ok: 3 };
const HIGH_TERMS = new Set(["baa", "data-residency", "price-protection", "true-down"]);
const PRICE_TERMS = new Set(["price-protection", "true-down", "true-up", "co-term"]);
const VARIABLE = new Set(["copilot-m365", "teams-phone", "teams-premium", "power-bi-pro", "m365-e5"]);

const fmtDate = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "");
const daysFrom = (d) => Math.round((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);

function mergeFacts(docs) {
  const facts = {};
  for (const d of docs) {
    for (const [k, v] of Object.entries(d.analysis.facts ?? {})) {
      if (facts[k] == null) facts[k] = v;
      else if (Array.isArray(v) && Array.isArray(facts[k])) facts[k] = [...facts[k], ...v];
    }
  }
  return facts;
}

/** Quarter ends Microsoft sales teams are measured on, after `from`. */
function nextQuarterEnds(from, n = 2) {
  const out = [];
  let y = from.getFullYear();
  for (let i = 0; out.length < n && i < 8; i++) {
    for (const m of [2, 5, 8, 11]) {
      const d = new Date(y, m + 1, 0);
      if (d >= from && out.length < n) out.push(d);
    }
    y++;
  }
  return out;
}

/** A, B, ... Z, AA, AB for the nth uploaded document (1 based). */
export function exhibitId(n) {
  let s = "";
  for (let k = Math.max(1, n); k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
  return `Exhibit ${s}`;
}

export const TENANT_SCOPES = [["all", "All tenants"], ["home", "Main tenant only"], ["gov", "Government cloud only"], ["other", "Separate tenants only"]];
export const MAIN_TENANT = "(main tenant, none named)";

/**
 * `scope` limits prices, insights and findings to one kind of tenant; every tenant still appears in `tenantRows`
 * so purchasing and finance see the whole contract. `kinds` overrides how a tenant name is classified.
 */
export function buildCase(docs, { scope = "all", kinds = {} } = {}) {
  const exOf = (d) => d.exhibit ?? exhibitId(docs.indexOf(d) + 1);
  const used = docs.filter((d) => d.included !== false);
  const pricingDocs = used.filter((d) => roleOf(d) !== "contract" && d.analysis.pricing?.lines?.length);
  const contractDocs = used.filter((d) => roleOf(d) !== "pricing");
  const agreementDocs = contractDocs.filter((d) => d.analysis.kind !== "pricing");
  const haveAgreement = agreementDocs.length > 0;
  const facts = mergeFacts(contractDocs.length ? contractDocs : used);
  const ctx = orgContext();
  const profile = getProfile();
  const ctext = contractDocs.map((d) => d.text ?? "").join("\n");

  /* ---- terms across every document ---- */
  const termRows = TERMS.map((t) => {
    const hits = used.map((d) => ({ d, det: d.analysis.detected.find((x) => x.id === t.id) })).filter((x) => x.det?.present);
    const present = hits.length > 0;
    const redlineKey = REDLINES[`missing-${t.id}`] ?? null;
    return {
      id: t.id, term: t.term, category: t.category, expected: t.expected, present,
      status: present ? "In the documents" : t.expected ? (haveAgreement ? "Missing" : "Not yet seen") : "Not found",
      where: [...new Set(hits.map((h) => h.d.analysis.name))],
      evidence: hits[0]?.det.evidence ?? [],
      asks: t.askFor, lever: t.lever,
      clause: redlineKey ? CLAUSES[redlineKey]?.clause ?? "" : "",
      fallback: redlineKey ? CLAUSES[redlineKey]?.fallback ?? "" : "",
    };
  }).filter((r) => r.present || r.expected);
  const has = (id) => termRows.find((r) => r.id === id)?.present === true;

  /* ---- prices across every offer ---- */
  const classed = (d) => d.analysis.pricing.lines.map((l) => { const tenantKind = tenantKindOf(l.tenant, kinds); return { ...l, tenantKind, gov: l.gov || tenantKind === "gov" || undefined }; });
  const offers = pricingDocs.map((d) => ({ id: d.id, exhibit: exOf(d), name: d.analysis.name, vendorId: d.analysis.pricing.vendorId, review: priceLines(classed(d).filter((l) => scope === "all" || l.tenantKind === scope), d.analysis.pricing.termMonths), doc: d }));
  const tenantMap = new Map();
  for (const d of pricingDocs) {
    for (const r of priceLines(classed(d), d.analysis.pricing.termMonths).rows) {
      if (r.alt) continue;
      const key = r.tenant ?? "";
      const t = tenantMap.get(key) ?? { tenant: key || MAIN_TENANT, key, kind: tenantKindOf(key, kinds), lines: 0, seatsBy: {}, annualBy: {}, products: new Set() };
      t.lines++;
      t.seatsBy[d.id] = (t.seatsBy[d.id] ?? 0) + r.qty;
      t.annualBy[d.id] = (t.annualBy[d.id] ?? 0) + r.annual;
      t.products.add(r.name);
      tenantMap.set(key, t);
    }
  }
  const tenantRows = [...tenantMap.values()].map((t) => ({ tenant: t.tenant, key: t.key, kind: t.kind, kindLabel: TENANT_KINDS.find((k) => k[0] === t.kind)?.[1] ?? t.kind, lines: t.lines, licences: Math.max(0, ...Object.values(t.seatsBy)), annualBy: t.annualBy, products: [...t.products] }))
    .sort((a, b) => (a.kind === "home" ? -1 : 0) - (b.kind === "home" ? -1 : 0) || Math.max(0, ...Object.values(b.annualBy)) - Math.max(0, ...Object.values(a.annualBy)));
  const compare = compareOffers(offers.map((o) => ({ id: o.id, name: o.exhibit, rows: o.review.rows })));
  const refRows = compare.rows.map((r) => {
    const ref = r.ref ?? {};
    const target = ref.target ?? null, stretch = ref.stretch ?? null, ceiling = ref.ceiling ?? null;
    const buy = target != null ? Math.min(r.best, target) : r.best;
    return { ...r, target, stretch, ceiling, current: ref.current ?? null, list: ref.list ?? null, gap: Math.max(0, r.best - (target ?? r.best)) * r.qty * 12, buyAtTarget: buy * r.qty * 12 };
  });
  const sum = (f) => refRows.reduce((a, r) => a + f(r), 0);
  const position = {
    offers: offers.length,
    quotedBest: sum((r) => r.best * r.qty * 12),
    atTarget: sum((r) => r.buyAtTarget),
    atStretch: sum((r) => (r.stretch != null ? Math.min(r.best, r.stretch) : r.best) * r.qty * 12),
    ceiling: sum((r) => (r.ceiling != null ? Math.max(r.ceiling, 0) : r.best) * r.qty * 12),
    gap: sum((r) => r.gap),
    bestOfSave: Math.max(0, ...Object.values(compare.totals).map((t) => t.save), 0),
  };

  /* ---- how your organization compares with other organisations of its size ---- */
  const peerSeats = offers[0]?.review.seats || profile.licensedUsers || 0;
  const peerSeatSource = offers[0]?.review.seatSource ?? "licensed users in the Workspace profile";
  const peerRows = refRows.filter((r) => r.list).map((r) => {
    const band = advisorBand(r.productId, peerSeats);
    const quoteDiscount = (1 - r.best / r.list) * 100;
    const currentDiscount = r.current != null ? (1 - r.current / r.list) * 100 : null;
    const row = { productId: r.productId, name: r.name, qty: r.qty, list: r.list, current: r.current, currentDiscount, best: r.best, quoteDiscount, band, position: null, currentPosition: null };
    if (band) {
      row.bestPrice = r.list * (1 - band.high / 100);
      row.worstPrice = r.list * (1 - band.low / 100);
      row.midPrice = r.list * (1 - (band.low + band.high) / 200);
      const pos = (d) => (d < band.low - 0.05 ? "below" : d > band.high + 0.05 ? "above" : "within");
      row.position = pos(quoteDiscount);
      if (currentDiscount != null) row.currentPosition = pos(currentDiscount);
      row.gapNow = r.current != null ? Math.max(0, r.current - row.midPrice) * 12 * r.qty : null;
      row.gapQuote = Math.max(0, r.best - row.midPrice) * 12 * r.qty;
    }
    return row;
  });

  /* ---- findings ---- */
  const findings = [];
  const multi = pricingDocs.length > 1;

  for (const r of termRows.filter((x) => !x.present && x.expected)) {
    const priceLinked = PRICE_TERMS.has(r.id);
    findings.push({
      id: `missing-${r.id}`, scope: "gap", termId: r.id, redlineKey: REDLINES[`missing-${r.id}`],
      level: haveAgreement ? (HIGH_TERMS.has(r.id) ? "high" : "med") : priceLinked ? "med" : "low",
      title: haveAgreement ? `Not found in any document: ${r.term}` : `To secure: ${r.term}`,
      text: TERMS.find((t) => t.id === r.id)?.whyItMatters ?? "", ask: r.asks[0], asks: r.asks,
    });
  }
  if (pricingDocs.length && !haveAgreement) {
    findings.push({
      id: "case-no-agreement", scope: "case", level: "med",
      title: "No contract language has been uploaded yet",
      text: "Prices are only as good as the terms they are bought under. Until the agreement or order form is added, every term below is unconfirmed.",
      ask: "Upload the agreement, enrolment or order form for this renewal, set to Contract language, and review it with the prices.",
    });
  }
  for (const d of agreementDocs) {
    for (const f of d.analysis.findings) {
      if (f.scope === "risk" || (f.scope === "environment" && f.id !== "env-frontline-reduction" && !(f.termId && has(f.termId)))) findings.push({ ...f, source: d.analysis.name });
    }
  }
  for (const r of termRows.filter((x) => x.present && x.expected)) {
    findings.push({ id: `present-${r.id}`, scope: "present", level: "ok", termId: r.id, title: `Found: ${r.term}`, text: TERMS.find((t) => t.id === r.id)?.plain ?? "", ask: `Verify the detail: ${r.asks[0]}`, evidence: r.evidence, source: r.where.join(", ") });
  }
  for (const d of pricingDocs) {
    for (const f of d.analysis.findings) {
      if (!PRICING_SCOPES.has(f.scope) || f.scope === "terms") continue;
      if (f.id === "pr-no-terms" && haveAgreement) continue;
      if (f.id === "pr-channel-direct" && pricingDocs.length > 1) continue;
      findings.push({ ...f, title: multi ? `${d.analysis.name}: ${f.title}` : f.title, source: d.analysis.name });
    }
  }

  /* ---- what only shows up when the documents are read together ---- */
  const add = (f) => findings.push({ scope: "case", ...f });
  const allRows = offers.flatMap((o) => o.review.rows.filter((r) => !r.alt));
  const contractTerm = facts.termMonths?.value ?? null;

  if (contractTerm) {
    const quoted = [...new Set(allRows.map((r) => r.termMonths).filter(Boolean))].filter((t) => t !== contractTerm);
    if (quoted.length) {
      add({
        id: "case-term-mismatch", level: "med", termId: "price-protection", redlineKey: "price-lock",
        title: "The quoted term is not the agreement's term",
        text: `The agreement runs ${contractTerm} months; the quote has lines for ${quoted.sort((a, b) => a - b).join(" and ")} months. A price quoted for a shorter term can be repriced inside the agreement's term.`,
        ask: "Confirm each quoted price applies for the agreement's full term, and attach the price sheet to the agreement as an exhibit.",
        evidence: [facts.termMonths.evidence],
      });
    }
  }

  if (pricingDocs.length && haveAgreement) {
    const loose = agreementDocs.some((d) => d.analysis.findings.some((f) => f.id === "unilateral-change" || f.id === "then-current"));
    if (loose) {
      add({
        id: "case-price-not-locked", level: "high", termId: "price-protection", redlineKey: "price-lock",
        title: "The quoted prices are not locked by the agreement",
        text: "The agreement lets pricing follow the then-current price or be changed by the vendor, while the quote shows fixed prices. The quote is an offer, not a term of the agreement.",
        ask: "Write the quoted unit prices into the agreement, or attach the price sheet as an exhibit that cannot be changed without a signed amendment, and cover seats added later at the same prices.",
        evidence: agreementDocs.flatMap((d) => d.analysis.findings.filter((f) => f.id === "unilateral-change" || f.id === "then-current").flatMap((f) => f.evidence ?? [])).slice(0, 2),
      });
    } else if (has("price-protection")) {
      add({
        id: "case-price-locked", level: "ok", scope: "present", termId: "price-protection",
        title: "Price protection is in the agreement",
        text: "The agreement has price-protection language. It protects the quoted prices only if they are the prices in the agreement.",
        ask: "Check that the price sheet is attached to the agreement, and that it covers every product your organization may add.",
      });
    }
  }

  const variableRows = allRows.filter((r) => VARIABLE.has(r.productId));
  const cheaperLonger = allRows.length && offers.some((o) => o.review.rows.some((r) => r.optionOf != null));
  if (pricingDocs.length && haveAgreement && !has("true-down") && (variableRows.length || cheaperLonger || ctx.frontlineHeavy)) {
    add({
      id: "case-true-down", level: "high", termId: "true-down", redlineKey: "true-down",
      title: "These prices have no reduction rights behind them",
      text: `${variableRows.length ? `${[...new Set(variableRows.map((r) => r.name))].join(", ")} are the seats most likely to be over-bought. ` : ""}${cheaperLonger ? "The sheet offers a lower price for a longer commitment. " : ""}Without reduction rights, a quantity committed at these prices is paid for the whole term.`,
      ask: "Make the quoted quantities a ceiling, not a commitment: ask for annual reduction rights on these products and for the ability to move seats between suites.",
      why: [
        why("document", "No reduction or true-down wording was found in any uploaded document."),
        why("calculation", `${variableRows.length ? `Seats on lines most likely to change: ${[...new Set(variableRows.map((r) => `${r.name} (${r.qty.toLocaleString("en-US")})`))].join(", ")}, ${usd(variableRows.reduce((a, r) => a + r.annual, 0), 0)} a year. ` : ""}Without reduction rights, every seat committed is paid for all ${contractTerm ?? 36} months, so a 10% over-buy on these lines costs about ${usd(variableRows.reduce((a, r) => a + r.annual, 0) * 0.1 * ((contractTerm ?? 36) / 12), 0)} over the term.`),
        why("precedent", "ITAA lists \"Limited flexibility to reduce below original commitment\" as a risk of Enterprise Agreements, so reduction rights have to be written in.", { source: PEER_SOURCES.itaa.label, url: PEER_SOURCES.itaa.url, verified: "secondary" }),
      ],
    });
  }

  const stated = (facts.commitment?.value ?? facts.macc?.value) || null;
  if (stated && allRows.length) {
    const months = contractTerm ?? offers[0]?.doc.analysis.pricing.termMonths ?? 12;
    const annual = position.quotedBest, term = annual * months / 12;
    const off = (a) => Math.abs(stated - a) / stated;
    if (off(annual) > 0.05 && off(term) > 0.05) {
      add({
        id: "case-commitment", level: "med",
        title: "The commitment in the agreement does not match the quote",
        text: `The agreement states ${usd(stated, 0)}. The quote comes to ${usd(annual, 0)} a year, ${usd(term, 0)} over ${months} months.`,
        ask: "Reconcile the two before signing. Ask which seats and prices the stated amount is built from, and have it itemised.",
        evidence: [facts.commitment?.evidence ?? facts.macc?.evidence].filter(Boolean),
      });
    }
  }

  const contractDisc = (facts.percentages ?? []).find((p) => p.kind === "discount");
  const sheetDisc = allRows.map((r) => r.sheetDiscountPct).filter((v) => v != null);
  if (contractDisc && sheetDisc.length) {
    const avg = sheetDisc.reduce((a, v) => a + v, 0) / sheetDisc.length;
    if (Math.abs(avg - contractDisc.value) >= 1) {
      add({
        id: "case-discount", level: "med", termId: "price-levels",
        title: "The discount in the agreement differs from the quote",
        text: `The agreement refers to a ${contractDisc.value}% discount; the quote lines average ${avg.toFixed(1)}%.`,
        ask: "Ask which discount applies and where it is written. The quote should show the discount the agreement promises, line by line.",
        evidence: [contractDisc.evidence],
      });
    }
  }

  if (/(?:billed|invoice[sd]?|payment)[^.]{0,60}\bannual(?:ly)?\b/i.test(ctext) && allRows.some((r) => r.billing === "monthly")) {
    add({
      id: "case-billing", level: "med",
      title: "The agreement bills annually; the quote bills monthly",
      text: "Prices quoted for monthly billing are normally higher than annual ones, so it is unclear which price applies.",
      ask: "Confirm the billing basis and ask for the annual-billing price on the seats that are stable.",
    });
  }

  if (offers.length > 1 && position.bestOfSave > 0) {
    add({
      id: "case-offers", level: "med", termId: "price-protection",
      title: `Matching the best price on every line saves up to ${usd(position.bestOfSave, 0)} a year`,
      text: offers.map((o) => `${o.exhibit} (${o.name}, ${channelOf(o.vendorId).label}): ${usd(compare.totals[o.id]?.total, 0)} a year on ${compare.totals[o.id]?.lines} lines`).join("; ") + ".",
      ask: "Send each vendor the best price seen for every line and ask them to match or beat it. Use the lower of the two as the basis for the final price.",
    });
  } else if (offers.length === 1) {
    add({
      id: "case-single-offer", level: "low",
      title: "There is one offer on the table",
      text: `Only ${offers[0].exhibit} (${offers[0].name}) has been uploaded. A price cannot be called the best price without a second one.`,
      ask: "Upload the other channel's quote, from Microsoft direct or a reseller, for the same products and quantities.",
    });
  }

  /* ---- timeline ---- */
  const behind = peerRows.filter((r) => r.band && r.currentPosition === "below" && r.gapNow > 0);
  if (behind.length) {
    const total = behind.reduce((a, r) => a + r.gapNow, 0);
    const tier = advisorTier(peerSeats);
    add({
      id: "case-peer-gap", level: total >= 100000 ? "high" : "med", value: total, termId: "price-levels",
      title: "Your organization's current rates are below what other organisations of its size report",
      text: behind.map((r) => `${r.name}: Your organization pays ${usd(r.current)} (${r.currentDiscount.toFixed(1)}% off list); organisations with ${r.band.tier.label} report ${r.band.low}% to ${r.band.high}% off, or ${usd(r.bestPrice)} to ${usd(r.worstPrice)}.`).join(" "),
      ask: `Open at the best end of the range for each product and ask Microsoft and the reseller to show the list price and the discount applied on every line. Moving to the middle of the range is worth ${usd(total, 0)} a year on these lines.`,
      why: [
        ...behind.map((r) => why("calculation", `${r.name}: (${usd(r.current)} - ${usd(r.midPrice)}) x 12 x ${r.qty.toLocaleString("en-US")} seats = ${usd(r.gapNow, 0)} a year. Current price is the rate-card figure from the renewal export; list is ${usd(r.list)}.`)),
        why("benchmark", `Discount ranges for ${tier.label} come from the Redress Compliance benchmark of 142 buyer-side renewals (January 2024 to April 2026). The firm sells negotiation services and the contracts are not public, so use the range to frame the ask, not as a price Microsoft has agreed.`, { source: PEER_SOURCES.redress.label, url: PEER_SOURCES.redress.url, verified: "secondary" }),
        why("calculation", `Size band is ${tier.id} (${tier.label}), taken from ${peerSeatSource}. Check the seat count in the Workspace: a different count can move your organization into another band.`),
        why("precedent", "Since 1 November 2025 Microsoft no longer gives automatic volume discounts on EA online services, so a discount below the range is a negotiating outcome, not a rule. If your organization's rate card is out of date this finding is wrong; confirm the current prices first.", { source: PEER_SOURCES.itaa.label, url: PEER_SOURCES.itaa.url, verified: "secondary" }),
        precedentWhy("ea-levels-dealiq"),
        precedentWhy("list-2026"),
      ],
    });
  }

  /* ---- timeline ---- */
  const timeline = [];
  const expiry = facts.expirationDate?.value ?? (profile.renewalDate ? parseLocalDate(profile.renewalDate) : null);
  const noticeDays = (facts.notices ?? []).find((n) => n.renewalRelated)?.days ?? null;
  if (profile.responseDeadline) {
    const d = parseLocalDate(profile.responseDeadline);
    if (!Number.isNaN(d.getTime())) timeline.push({ label: "Decisions due to Microsoft", date: d });
  }
  const valid = ctext.length || used.length ? used.map((d) => d.text ?? "").join("\n").match(/(?:valid|expires?|good)\s+(?:through|until|on|by)\s+([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i) : null;
  if (valid) {
    const d = new Date(valid[1]);
    if (!Number.isNaN(d.getTime())) timeline.push({ label: "Quote price expires", date: d });
  }
  if (noticeDays && expiry && !Number.isNaN(expiry.getTime())) timeline.push({ label: `Renewal notice due (${noticeDays} days before expiry)`, date: new Date(expiry.getTime() - noticeDays * 86400000) });
  if (expiry && !Number.isNaN(expiry.getTime())) timeline.push({ label: "Agreement expires", date: expiry });
  for (const q of nextQuarterEnds(new Date())) timeline.push({ label: "Microsoft quarter end", date: q, lever: true });
  timeline.sort((a, b) => a.date - b.date);
  for (const t of timeline) { t.days = daysFrom(t.date); t.text = fmtDate(t.date); }
  const notice = timeline.find((t) => t.label.startsWith("Renewal notice"));
  if (notice && notice.days < 0) {
    add({ id: "case-notice-passed", level: "high", termId: "termination", redlineKey: "notice-exception", title: "The renewal notice date has passed", text: `Notice was due ${notice.text}.`, ask: "Ask Legal whether notice is still effective, and request a written bridge term at current prices." });
  } else if (notice && notice.days <= 90) {
    add({ id: "case-notice-soon", level: "med", title: `Renewal notice is due in ${notice.days} days`, text: `Notice is due ${notice.text}.`, ask: "Decide before this date whether to renew, renegotiate or give notice." });
  }

  attachPrecedent(findings);
  const SCOPE = { case: 0, price: 1, pricing: 1, risk: 2, gap: 3, environment: 4 };
  findings.sort((a, b) => RANK[a.level] - RANK[b.level] || (SCOPE[a.scope] ?? 5) - (SCOPE[b.scope] ?? 5) || (b.value ?? 0) - (a.value ?? 0));
  const counts = { high: 0, med: 0, low: 0, ok: 0 };
  findings.forEach((f) => { counts[f.level] = (counts[f.level] ?? 0) + 1; });
  const redlines = buildRedlines({ findings });
  const priorities = findings.filter((f) => f.level === "high" || f.level === "med").slice(0, 10);

  return {
    docs: used.map((d) => ({ id: d.id, exhibit: exOf(d), name: d.analysis.name, role: roleOf(d), kind: d.analysis.kind, vendorId: d.analysis.pricing?.vendorId, lines: d.analysis.pricing?.lines?.length ?? 0 })),
    haveAgreement, facts, termRows, offers, compare, refRows, position, findings, counts, redlines, priorities, timeline, scope, kinds, tenantRows,
    peerRows, peerSeats, peerSeatSource, peerTier: advisorTier(peerSeats),
    termsSecured: termRows.filter((r) => r.present && r.expected).length, termsExpected: termRows.filter((r) => r.expected).length,
  };
}

/* -----------------------------------------------------------------------------
 * Export
 * -------------------------------------------------------------------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function priceRowsForExport(c) {
  return c.refRows.map((r) => {
    const row = { product: r.name, seats: r.qty };
    for (const o of c.offers) row[`${o.exhibit} per user per month`] = r.prices[o.id] != null ? Number(r.prices[o.id].toFixed(2)) : "";
    return {
      ...row,
      best_quoted: Number(r.best.toFixed(2)), current_contract: r.current != null ? Number(r.current.toFixed(2)) : "", list: r.list != null ? Number(r.list.toFixed(2)) : "",
      annual_gap_to_target: Math.round(r.gap),
    };
  });
}

export function tenantRowsForExport(c) {
  return c.tenantRows.map((t) => {
    const row = { tenant: t.tenant, type: t.kindLabel, lines: t.lines, licences: t.licences };
    for (const o of c.offers) row[`${o.exhibit} per year`] = t.annualBy[o.id] ? Math.round(t.annualBy[o.id]) : "";
    row.products = t.products.join("; ");
    return row;
  });
}

export function termRowsForExport(c) {
  return c.termRows.map((r) => ({
    term: r.term, category: r.category, status: r.status, found_in: r.where.join("; "), source_text: r.evidence[0] ?? "",
    ask: r.asks.join(" | "), proposed_language: r.clause, fallback: r.fallback,
  }));
}

export function briefHtml(c) {
  const profile = getProfile();
  const whyText = (f) => (f.why ?? []).map((w) => `${w.basis}: ${w.text}${w.quote ? ` "${w.quote.slice(0, 220)}"` : ""}${w.source ? ` [${w.source}]` : ""}`).join(" | ");
  const F = "font-family:Calibri,Arial,sans-serif";
  const p = (s, x = "") => `<p style="${F};font-size:11pt;margin:4px 0 8px;${x}">${s}</p>`;
  const h2 = (s) => `<h2 style="${F};font-size:14pt;margin:26px 0 6px;border-bottom:1px solid #999">${esc(s)}</h2>`;
  const th = (s) => `<th style="${F};font-size:9.5pt;text-align:left;background:#eef2f6;border:1px solid #bbb;padding:4px 6px">${esc(s)}</th>`;
  const td = (s, num) => `<td style="${F};font-size:9.5pt;border:1px solid #ccc;padding:4px 6px;vertical-align:top;${num ? "text-align:right" : ""}">${esc(s)}</td>`;
  const table = (heads, rows, numFrom = 99) => `<table style="border-collapse:collapse;width:100%"><tr>${heads.map(th).join("")}</tr>${rows.map((r) => `<tr>${r.map((v, i) => td(v, i >= numFrom)).join("")}</tr>`).join("")}</table>`;
  const pos = c.position;
  const $ = (n) => (Number.isFinite(n) ? usd(n, 0) : "-");

  const stance = pos.quotedBest > 0
    ? `Open at ${$(pos.atStretch)} a year, aim for ${$(pos.atTarget)}, and do not go above ${$(pos.ceiling)}. The best price quoted today is ${$(pos.quotedBest)}, which is ${$(pos.gap)} above target.`
    : "No prices have been read from the documents yet.";

  const parts = [];
  parts.push(`<h1 style="${F};font-size:20pt;margin:0">Renewal negotiation brief</h1>`);
  parts.push(p(`<b>${esc(profile.orgName)}</b>${profile.agreementNumber ? ` &middot; Agreement ${esc(profile.agreementNumber)}` : ""}<br>Prepared ${esc(new Date().toLocaleString("en-US"))}${profile.analyst ? ` by ${esc(profile.analyst)}` : ""}`));
  parts.push(h2("Documents reviewed"));
  parts.push(table(["Exhibit", "Document", "Used as", "Source", "Price lines"], c.docs.map((d) => [d.exhibit, d.name, ROLE_OPTIONS.find((r) => r[0] === d.role)?.[1] ?? d.role, d.lines ? channelOf(d.vendorId).label : "", d.lines || ""])));
  parts.push(h2("Recommended position"));
  parts.push(p(esc(stance), "font-weight:bold"));
  parts.push(table(["Measure", "Per year"], [["Best price quoted for the lines read", $(pos.quotedBest)], ["Target (size-band benchmark or current contract, whichever is lower)", $(pos.atTarget)], ["Opening position", $(pos.atStretch)], ["Walk-away ceiling (what your organization pays now, else list)", $(pos.ceiling)], ["Gap from best quote to target", $(pos.gap)]], 1));
  parts.push(p(`Terms secured: ${c.termsSecured} of ${c.termsExpected} expected. Items to raise: ${c.counts.high} high, ${c.counts.med} medium.`));

  parts.push(h2("What to raise first"));
  parts.push(c.priorities.length
    ? table(["Priority", "Item", "Ask", "Why", "Source"], c.priorities.map((f) => [f.level, f.title, f.ask ?? "", whyText(f), f.source ?? ""]))
    : p("Nothing needing attention."));

  parts.push(h2("Price positions"));
  if (c.tenantRows.length > 1 || c.tenantRows.some((t) => t.key)) {
    parts.push(p("Spend by tenant. Every tenant on the quotes is shown. Government-cloud and separate tenants are bought on the same agreement but sit outside the main tenant, so the price comparison below and the E5 vs E7 view are scoped as stated.", "font-size:9.5pt;color:#555"));
    parts.push(table(["Tenant", "Type", "Licences", ...c.offers.map((o) => `${o.exhibit} per year`)], c.tenantRows.map((t) => [t.tenant, t.kindLabel, t.licences.toLocaleString("en-US"), ...c.offers.map((o) => (t.annualBy[o.id] ? $(t.annualBy[o.id]) : ""))]), 2));
    if (c.scope !== "all") parts.push(p(`The price positions that follow cover ${esc(c.scope === "home" ? "the main tenant only" : c.scope === "gov" ? "government-cloud tenants only" : "separate tenants only")}.`, "font-size:9.5pt;font-weight:bold"));
  }
  if (c.refRows.length) {
    const heads = ["Product", "Seats", ...c.offers.map((o) => o.exhibit), "Best quoted", "Current contract", "Annual gap to target"];
    const m = (v) => (v == null ? "" : usd(v));
    parts.push(table(heads, c.refRows.map((r) => [r.name, r.qty.toLocaleString("en-US"), ...c.offers.map((o) => m(r.prices[o.id])), m(r.best), m(r.current), $(r.gap)]), 1));
    parts.push(p("All prices are per user per month. Target and opening prices come from the volume bands in the Workspace rate card, which are assumptions until replaced with prices your organization has seen.", "font-size:9pt;color:#555"));
  } else parts.push(p("No price lines were read."));

  if (c.peerRows.some((r) => r.band)) {
    parts.push(h2("How your organization compares with other organisations"));
    parts.push(p(`Size band ${esc(c.peerTier.id)} (${esc(c.peerTier.label)}), from ${esc(c.peerSeatSource)}. Discount ranges are from an advisory firm's benchmark of 142 renewals and cannot be verified; they frame the ask and are not prices Microsoft has agreed.`, "font-size:9.5pt;color:#555"));
    const pc = (v) => (v == null ? "" : `${v.toFixed(1)}%`);
    const mm = (v) => (v == null ? "" : usd(v));
    parts.push(table(["Product", "List", "Your organization pays now", "Off list now", "Best quote", "Off list in quote", "Benchmark range off list", "Benchmark price range", "Position of quote"],
      c.peerRows.filter((r) => r.band).map((r) => [r.name, mm(r.list), mm(r.current), pc(r.currentDiscount), mm(r.best), pc(r.quoteDiscount), `${r.band.low}% to ${r.band.high}%`, `${mm(r.bestPrice)} to ${mm(r.worstPrice)}`, r.position === "below" ? "below the range" : r.position === "above" ? "better than the range" : "within the range"]), 1));
  }

  parts.push(h2("Term positions"));  parts.push(table(["Term", "Status", "Found in", "Ask"], c.termRows.map((r) => [r.term, r.status, r.where.join("; "), r.present ? `Verify: ${r.asks[0]}` : r.asks.join("; ")])));

  const insights = c.findings.filter((f) => f.scope === "case" || f.scope === "pricing");
  if (insights.length) {
    parts.push(h2("What the documents show together"));
    parts.push(table(["Level", "Finding", "Why", "Ask"], insights.filter((f) => f.level !== "ok").map((f) => [f.level, f.title, [f.text ?? "", whyText(f)].filter(Boolean).join(" "), f.ask ?? ""])));
  }

  if (c.redlines.length) {
    parts.push(h2("Proposed contract language"));
    parts.push(p(esc(REDLINE_NOTE), "font-style:italic"));
    c.redlines.forEach((r, i) => {
      parts.push(`<h3 style="${F};font-size:12pt;margin:16px 0 2px">${i + 1}. ${esc(r.topic)} <span style="font-size:9.5pt;color:#555">(${esc(r.level)} priority)</span></h3>`);
      parts.push(p(`<i>Raised by: ${esc(r.reasons.join("; "))}</i>`));
      if (r.kind === "replace" && r.original) parts.push(p(`<span style="color:#b42318;text-decoration:line-through">${esc(r.original)}</span>`));
      parts.push(p(`<span style="color:#18794e;text-decoration:underline">${esc(r.clause)}</span>`));
      parts.push(p(`<b>Fallback:</b> ${esc(r.fallback)}`));
    });
  }

  if (c.timeline.length) {
    parts.push(h2("Timeline"));
    parts.push(table(["When", "What", "Days"], c.timeline.map((t) => [t.text, t.label + (t.lever ? " (leverage)" : ""), t.days])));
  }

  parts.push(h2("Sources and what they do not prove"));
  parts.push(table(["Source", "Type", "What it shows", "Limit"], PEER_EVIDENCE.map((e) => [`${PEER_SOURCES[e.source].label}${PEER_SOURCES[e.source].url ? ` (${PEER_SOURCES[e.source].url})` : " (document supplied by the user)"}`, PEER_SOURCES[e.source].verified === "document" ? "public agreement, read in full" : PEER_SOURCES[e.source].verified === "primary" ? "Microsoft's own price list" : "consultancy source, not verified", e.takeaway, e.limit])));
  parts.push(h2("Claims checked and not supported"));
  parts.push(table(["Claim", "Result"], PEER_CLAIMS_CHECKED.map((x) => [x.claim, x.result])));

  parts.push(h2("How to read this"));
  parts.push(p("Prices and terms were read automatically from the uploaded documents and should be checked against them before they are quoted to a vendor. Reference prices are the contracted rate card where one is loaded and the published planning default otherwise. Volume bands are starting assumptions. This brief prepares questions for Procurement and Legal; it is not legal advice.", "font-size:9.5pt;color:#555"));

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Renewal negotiation brief</title></head><body style="max-width:900px;margin:24px auto">${parts.join("")}</body></html>`;
}
