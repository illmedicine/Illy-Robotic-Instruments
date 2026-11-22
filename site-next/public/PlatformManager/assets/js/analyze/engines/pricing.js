/* =============================================================================
 * engines/pricing.js — price review of a vendor proposal (Microsoft direct or a reseller).
 *
 * Reads the line items out of the proposal text, puts each on a per-user-per-month basis and
 * compares it with three reference points:
 *   current  — what your organization pays now (rate card, loaded from the renewal export)
 *   list     — published planning default from the product catalogue
 *   target   — list less the volume discount for your organization's size band (an editable assumption)
 * Nothing here is a price sheet from Microsoft or a reseller. The bands are starting points
 * and are marked as assumptions wherever they are shown.
 * ========================================================================== */

import { matchProduct, productById, productBySku, entitles } from "../data/products.js";
import { TERMS } from "../data/terms.js";
import { PEER_SOURCES, GOV_PEER_PRICES, advisorBand, evidenceById } from "../data/peers.js";
import { getRates, getProfile, orgContext } from "../org.js";
import { toNum, normaliseHeader, parseDelimited } from "../core.js";

export const CHANNELS = [
  { id: "microsoft", label: "Microsoft (direct)", channel: "direct" },
  { id: "reseller", label: "Reseller", channel: "reseller" },
  { id: "unknown", label: "Not identified", channel: "unknown" },
];
export const channelOf = (id) => CHANNELS.find((c) => c.id === id) ?? CHANNELS[CHANNELS.length - 1];

export const BASES = [["month", "per user / month"], ["year", "per user / year"], ["term", "per user / whole term"]];

/** Starting volume bands. Discounts are percent off list and are assumptions to be replaced with prices your organization has actually seen. */
export const DEFAULT_BANDS = [
  { id: "S", label: "Under 500 seats", min: 0, target: 0, stretch: 2 },
  { id: "A", label: "500 to 2,399 seats", min: 500, target: 0, stretch: 3 },
  { id: "B", label: "2,400 to 5,999 seats", min: 2400, target: 4, stretch: 7 },
  { id: "C", label: "6,000 to 14,999 seats", min: 6000, target: 7, stretch: 10 },
  { id: "D", label: "15,000 seats and over", min: 15000, target: 10, stretch: 13 },
];

export const usd = (n, dp = 2) => (Number.isFinite(n) ? n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: dp, maximumFractionDigits: dp }) : "-");

/* -----------------------------------------------------------------------------
 * Who sent it
 * -------------------------------------------------------------------------- */
const RESELLERS = [
  ["reseller", /\b(?:CDW(?:[- ]?G)?|Insight (?:Enterprises|Direct)|SHI(?: International)?|Softchoice|Presidio|PC Connection|Carahsoft|ePlus|Crayon|Pax8|Zones|Dell Technologies)\b|cdw\.com/i],
];

/** A reseller is named only when its name is in the file name or the opening of the document, never from a passing mention deeper in the text. */
export function vendorEvidence(text, name = "") {
  const body = String(text);
  const head = `${name}\n${body.slice(0, 4000)}`;
  const snip = (src, m) => src.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50).replace(/\s+/g, " ").trim();
  for (const [scopeName, scope] of [["the file name or the first part of the document", head]]) {
    for (const [id, re] of RESELLERS) {
      const m = scope.match(re);
      if (m) return { id, how: `"${m[0]}" appears in ${scopeName}`, quote: snip(scope, m) };
    }
  }
  const lsp = String(getProfile().resellerLSP || "").trim();
  if (lsp.length > 2) {
    const i = body.toLowerCase().indexOf(lsp.toLowerCase());
    if (i >= 0) return { id: "reseller", how: `the reseller named in the Workspace profile ("${lsp}") appears in the document`, quote: snip(body, { index: i, 0: lsp }) };
  }
  const ms = head.match(/Microsoft (?:Corporation|Licensing|Ireland)|Enterprise Agreement|MCA-E|Microsoft Customer Agreement/i);
  if (ms) return { id: "microsoft", how: `no reseller is named, and the text uses Microsoft's own wording ("${ms[0]}")`, quote: snip(head, ms) };
  return { id: "unknown", how: "no reseller name and no Microsoft agreement wording was found in the text", quote: "" };
}

export const detectVendor = (text, name = "") => vendorEvidence(text, name).id;

/* -----------------------------------------------------------------------------
 * Reading line items
 * -------------------------------------------------------------------------- */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const AMT = /\$\s?(\d[\d,]*(?:\.\d+)?)|(?<![\d.,$])(\d{1,3}(?:,\d{3})*\.\d{2})(?![\d%.])/g;
const WORDS = {
  month: /\b(?:per\s+(?:user\s+)?(?:per\s+)?month|monthly|pupm|per\s*mo\b)|\/\s?(?:user\s*\/\s*)?mo(?:nth)?\b/i,
  year: /\b(?:per\s+(?:user\s+)?(?:per\s+)?year|annual(?:ly)?|yearly|per\s*yr\b)|\/\s?(?:user\s*\/\s*)?(?:yr|year)\b/i,
  ext: /\b(?:total|extended|ext\.?|subtotal|amount)\b/i,
};

function amountsIn(s) {
  const v = [];
  for (const m of s.matchAll(AMT)) {
    const n = toNum(m[1] ?? m[2], NaN);
    if (Number.isFinite(n) && n > 0) v.push(n);
  }
  return v;
}

/** Removes the product name from a line so digits in "365" or "P1" are not read as a quantity. */
function stripProduct(line, prod) {
  const hints = [prod.name, ...prod.aliases, ...prod.skuPartNumbers].sort((a, b) => b.length - a.length);
  for (const hint of hints) {
    const toks = hint.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    const re = new RegExp(`(?<![a-z0-9])${toks.map(esc).join("[^a-z0-9]+")}(?![a-z0-9])`, "i");
    if (re.test(line)) return line.replace(re, " ");
  }
  return line;
}

function qtyIn(rest) {
  const t = rest
    .replace(AMT, " ")
    .replace(/\b(?:microsoft|office|dynamics|m)\s?365\b/gi, " ")
    .replace(/\b\d+\s*-?\s*(?:months?|mos?|years?|yrs?)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*%/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g, " ");
  const strong = t.match(/\b(?:qty|quantity)\b\.?\s*:?\s*(\d[\d,]*)/i)
    || t.match(/(\d[\d,]*)\s*(?:[x×](?![a-z0-9])|seats?\b|users?\b|licen[cs]es?\b|units?\b|subscriptions?\b|ea\b)/i);
  if (strong) {
    const n = toNum(strong[1], NaN);
    if (n >= 1 && n <= 500000) return n;
  }
  for (const m of t.matchAll(/(?<![A-Za-z0-9.\-])(\d{1,3}(?:,\d{3})+|\d{1,6})(?![A-Za-z0-9.\-])/g)) {
    const n = toNum(m[1], NaN);
    if (n >= 1 && n <= 500000 && !(n >= 2000 && n <= 2100 && !m[1].includes(","))) return n;
  }
  return null;
}

const near = (a, b, tol) => Math.abs(a - b) <= Math.abs(b) * tol;
const refMonthly = (prod) => {
  const c = getRates().unitPrices?.[prod.id];
  return Number.isFinite(c) && c > 0 ? c : Number.isFinite(prod.listPriceUsd) && prod.listPriceUsd > 0 ? prod.listPriceUsd : null;
};

/** Decides which figure is the unit price, and whether it is monthly, annual or for the whole term. */
function interpret(prod, qty, amounts, raw, termMonths) {
  const ref = prod ? refMonthly(prod) : null;
  const divs = { month: 1, year: 12, term: Math.max(1, termMonths) };
  const stated = { month: WORDS.month.test(raw), year: WORDS.year.test(raw) };
  const extWord = WORDS.ext.test(raw);
  const lo = Math.min(...amounts), hi = Math.max(...amounts);

  const unitPair = new Set(), extPair = new Set();
  if (qty) {
    amounts.forEach((u, i) => amounts.forEach((e, j) => {
      if (i === j) return;
      if ([1, 12, termMonths, 24, 36].some((m) => near(u * qty * m, e, 0.01))) { unitPair.add(i); extPair.add(j); }
    }));
  }

  let best = null;
  amounts.forEach((a, i) => {
    for (const basis of ["month", "year", "term"]) {
      for (const role of qty ? ["unit", "ext"] : ["unit"]) {
        const unit = role === "unit" ? a : a / qty;
        const perMonth = unit / divs[basis];
        const dist = ref ? Math.abs(Math.log(perMonth / ref)) : 0.5;
        let score = dist + (basis === "year" ? 0.05 : basis === "term" ? 0.1 : 0);
        if (stated[basis]) score -= 0.5;
        if (role === "ext" && extWord) score -= 0.3;
        if (amounts.length > 1) {
          if (role === "ext") score += a === hi ? -0.3 : 0.5;
          else score += a === lo ? -0.3 : 0.5;
        }
        if (role === "unit" && unitPair.has(i)) score -= 0.6;
        if (role === "ext" && extPair.has(i)) score -= 0.6;
        if (!best || score < best.score) best = { score, unit, basis, perMonth, dist };
      }
    }
  });
  return { ...best, basisSource: stated[best.basis] ? "stated" : ref ? "inferred" : "assumed", check: !ref || best.dist > 0.4 };
}

let seq = 0;
const nextId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function extractLineItems(text, { termMonths = 12 } = {}) {
  const lines = String(text).split(/\r?\n/).map((s) => s.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
  const out = [], seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 400) continue;
    const prod = matchProduct(lines[i]);
    if (!prod) continue;
    let cand = lines[i], used = 0;
    while (!amountsIn(stripProduct(cand, prod)).length && used < 2 && i + 1 + used < lines.length && !matchProduct(lines[i + 1 + used]) && lines[i + 1 + used].length < 200) {
      cand += ` | ${lines[i + 1 + used]}`; used++;
    }
    const rest = stripProduct(cand, prod);
    const amounts = amountsIn(rest);
    if (!amounts.length) continue;
    const qty = qtyIn(rest);
    if (!qty && amounts.length < 2 && !WORDS.month.test(cand) && !WORDS.year.test(cand)) continue;
    const it = interpret(prod, qty, amounts, cand, termMonths);
    // A figure many times the product's price is a total or a commitment, not a unit price.
    const ref = refMonthly(prod);
    if (ref ? it.perMonth > ref * 20 || it.perMonth < ref / 20 : it.perMonth > 5000) { i += used; continue; }
    const sig = `${prod.id}|${qty}|${amounts.join(",")}`;
    if (seen.has(sig)) { i += used; continue; }
    seen.add(sig);
    out.push({
      id: nextId(), productId: prod.id, desc: cand.slice(0, 160), qty: qty ?? 0,
      unit: Math.round(it.unit * 10000) / 10000, basis: it.basis, basisSource: it.basisSource, check: it.check || !qty,
    });
    i += used;
  }
  return out;
}

export function blankLine() {
  return { id: nextId(), productId: "", desc: "", qty: 0, unit: 0, basis: "month", basisSource: "stated", check: false };
}

/* -----------------------------------------------------------------------------
 * Reference prices and verdicts
 * -------------------------------------------------------------------------- */
export function bandFor(seats, bands = getRates().benchmarkBands ?? DEFAULT_BANDS) {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  let pick = sorted[0];
  for (const b of sorted) if (seats >= b.min) pick = b;
  return pick;
}

export function seatsFor(rows) {
  const p = getProfile();
  if (p.licensedUsers > 0) return { seats: p.licensedUsers, source: "licensed users in the Workspace profile" };
  if (p.employeeCount > 0) return { seats: p.employeeCount, source: "employee count in the Workspace profile" };
  const q = Math.max(0, ...rows.map((r) => r.qty || 0));
  return { seats: q, source: "the largest quantity on this quote (set licensed users in the Workspace for a firmer band)" };
}

const divisor = (basis, termMonths) => (basis === "year" ? 12 : basis === "term" ? Math.max(1, termMonths) : 1);
const EXTRA = ["termMonths", "billing", "sheetDiscountPct", "sku", "optionOf", "option", "vendor", "yearRatios", "gov", "tenant", "tenantKind"];

/** Where a line's seats live: the main tenant, a government-cloud tenant, or a separate tenant of an affiliate, vendor or test environment. */
export const TENANT_KINDS = [["home", "Main tenant"], ["gov", "Government cloud"], ["other", "Separate tenant"]];
export function tenantKindOf(tenant, overrides = {}) {
  const key = String(tenant ?? "");
  if (overrides && overrides[key]) return overrides[key];
  if (!key) return "home";
  return /gov|gcc|\bdod\b/i.test(key) ? "gov" : "other";
}

/** Government cloud lines are priced differently from commercial ones, so commercial list prices do not apply to them. */
export const isGovCloud = (s) => /\bGCC(?:[\s-]?H(?:igh)?)?\b|\bGCCH\b|\bDoD\b|\bUS[\s-]?Gov(?:ernment)?\b|\bG[135]\b/i.test(String(s ?? ""));

export const VERDICTS = {
  great: ["At or below the stretch price", "ok"],
  good: ["At target", "ok"],
  above: ["Above target", "warn"],
  over: ["Above what your organization pays now", "risk"],
  unpriced: ["No reference price", ""],
};

export function priceLines(lines, termMonths = 12) {
  const rates = getRates();
  const bands = rates.benchmarkBands ?? DEFAULT_BANDS;
  const rawRows = lines.map((l) => ({ l, prod: l.productId ? productById(l.productId) : null }));
  const seatInfo = seatsFor(lines);
  const band = bandFor(seatInfo.seats, bands);

  const groups = new Set();
  const rows = rawRows.map(({ l, prod }) => {
    const qty = Number(l.qty) || 0;
    const perMonth = (Number(l.unit) || 0) / divisor(l.basis, l.termMonths || termMonths);
    const row = { id: l.id, productId: l.productId, name: prod?.name ?? "(not matched)", qty, unit: Number(l.unit) || 0, basis: l.basis, perMonth, annual: perMonth * 12 * qty, desc: l.desc, check: l.check, basisSource: l.basisSource, ref: null, verdict: "unpriced", gap: 0, stretchGap: 0, alt: false };
    for (const k of EXTRA) if (l[k] != null) row[k] = l[k];
    if (l.optionOf != null) { row.alt = groups.has(l.optionOf); groups.add(l.optionOf); }
    if (l.gov && prod) { row.name = `${prod.name} (government cloud)`; return row; }
    if (!prod || !(perMonth > 0)) return row;
    const contracted = rates.unitPrices?.[prod.id];
    const current = Number.isFinite(contracted) && contracted > 0 ? contracted : null;
    const list = Number.isFinite(prod.listPriceUsd) && prod.listPriceUsd > 0 ? prod.listPriceUsd : null;
    if (!current && !list) return row;
    let target = list ? list * (1 - band.target / 100) : current;
    let stretch = list ? list * (1 - band.stretch / 100) : current;
    const peer = list ? advisorBand(prod.id, seatInfo.seats) : null;
    if (peer) {
      target = list * (1 - (peer.low + peer.high) / 2 / 100);
      stretch = list * (1 - peer.high / 100);
    }
    if (current && current < target) target = current;
    if (stretch > target) stretch = target;
    const ceiling = current ?? list;
    row.ref = { current, list, target, stretch, ceiling, basis: peer ? "advisor" : "assumed" };
    if (list) {
      row.ref.quoteDiscount = (1 - perMonth / list) * 100;
      if (current) row.ref.currentDiscount = (1 - current / list) * 100;
    }
    if (peer) {
      row.peer = { ...peer, bestPrice: list * (1 - peer.high / 100), worstPrice: list * (1 - peer.low / 100), midPrice: list * (1 - (peer.low + peer.high) / 2 / 100) };
      const d = row.ref.quoteDiscount;
      row.peer.position = d < peer.low - 0.05 ? "below" : d > peer.high + 0.05 ? "above" : "within";
      if (current) {
        const cd = row.ref.currentDiscount;
        row.peer.currentPosition = cd < peer.low - 0.05 ? "below" : cd > peer.high + 0.05 ? "above" : "within";
      }
    }
    const eps = 1.005;
    row.verdict = perMonth <= stretch * eps ? "great" : perMonth <= target * eps ? "good" : perMonth <= ceiling * eps ? "above" : "over";
    row.gap = Math.max(0, perMonth - target) * 12 * qty;
    row.stretchGap = Math.max(0, perMonth - stretch) * 12 * qty;
    return row;
  });

  const priced = rows.filter((r) => r.ref && !r.alt);
  const totals = {
    quoted: rows.filter((r) => !r.alt).reduce((a, r) => a + r.annual, 0),
    pricedQuoted: priced.reduce((a, r) => a + r.annual, 0),
    atTarget: priced.reduce((a, r) => a + r.annual - r.gap, 0),
    gap: priced.reduce((a, r) => a + r.gap, 0),
    stretchGap: priced.reduce((a, r) => a + r.stretchGap, 0),
    pricedLines: priced.length,
    lines: rows.filter((r) => !r.alt).length,
  };
  return { rows, totals, band, seats: seatInfo.seats, seatSource: seatInfo.source, assumed: !rates.benchmarkBands || rates.benchmarkBands === DEFAULT_BANDS };
}

/* -----------------------------------------------------------------------------
 * Asks for one proposal
 * -------------------------------------------------------------------------- */
const SUITES = new Set(["m365-e3", "m365-e5", "m365-f3", "o365-e3"]);

const pct1 = (n) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

/** A written reason behind a finding: where it comes from (document, calculation, benchmark or precedent) and its source. */
export const why = (basis, text, extra = {}) => ({ basis, text, ...extra });

/** A public-record or market precedent as a reason, with its quote, source and limits. */
export function precedentWhy(id) {
  const e = evidenceById(id);
  if (!e) return null;
  const s = PEER_SOURCES[e.source];
  return why("precedent", `${e.takeaway} Limit: ${e.limit}`, { quote: e.quote, source: s.label, url: s.url, verified: s.verified });
}

function lineReasons(r, band, docName) {
  const out = [];
  out.push(why("document", `${docName ? `${docName}: ` : ""}${r.qty.toLocaleString("en-US")} seats at ${usd(r.perMonth)} per user per month${r.desc ? ` ("${r.desc.slice(0, 90)}")` : ""}.`));
  const ref = r.ref;
  if (ref.list) {
    out.push(why("calculation", `List price ${usd(ref.list)}. This quote is ${pct1(ref.quoteDiscount)} off list.${ref.current ? ` Your organization pays ${usd(ref.current)} today on the rate card, ${pct1(ref.currentDiscount)} off list.` : ""}`));
  }
  if (r.peer) {
    const p = r.peer;
    out.push(why("benchmark", `Organisations with ${p.tier.label} report ${p.low}% to ${p.high}% off list for ${r.name}, which is ${usd(p.bestPrice)} to ${usd(p.worstPrice)}. This quote is ${p.position === "below" ? "below that range" : p.position === "above" ? "better than that range" : "inside that range"}.`, { source: PEER_SOURCES.redress.label, url: PEER_SOURCES.redress.url, verified: "secondary" }));
  } else {
    out.push(why("calculation", `No benchmark covers this product, so the target uses the size-band assumption (band ${band.id}: ${band.target}% off list, open at ${band.stretch}%). Replace it in Workspace, Rate card.`));
  }
  out.push(why("calculation", `Gap to target: (${usd(r.perMonth)} - ${usd(ref.target)}) x 12 months x ${r.qty.toLocaleString("en-US")} seats = ${usd(r.gap, 0)} a year.${ref.basis === "advisor" ? " Target is the middle of the benchmark range; open at the best end." : ""}`));
  return out;
}

export function proposalAsks({ text, review, vendorId, name = "" }) {
  const out = [];
  const { rows, band } = review;
  const add = (f) => out.push({ scope: "price", ...f });

  for (const r of [...rows].filter((x) => !x.alt && (x.verdict === "above" || x.verdict === "over")).sort((a, b) => b.gap - a.gap).slice(0, 8)) {
    add({
      id: `pr-line-${r.id}`, level: r.verdict === "over" ? "high" : "med", value: r.gap,
      title: `${r.name}: ${usd(r.perMonth)} per user per month, target ${usd(r.ref.target)}`,
      text: `${r.qty.toLocaleString("en-US")} seats quoted at ${usd(r.perMonth)}. Your organization pays ${r.ref.current ? usd(r.ref.current) : "no loaded rate"} today; list is ${r.ref.list ? usd(r.ref.list) : "not set"}; the target is ${usd(r.ref.target)}.`,
      ask: `Ask for ${usd(r.ref.target)} or lower and open at ${usd(r.ref.stretch)}. The difference to target is ${usd(r.gap, 0)} a year.`,
      why: lineReasons(r, band, name),
    });
  }

  // A line that an included suite already covers is the cleanest saving on the table.
  for (const covered of rows) {
    if (!covered.productId || covered.alt || !(covered.annual > 0)) continue;
    const holder = rows.find((h) => h.id !== covered.id && h.productId && !(SUITES.has(h.productId) && SUITES.has(covered.productId)) && entitles(h.productId, covered.productId));
    if (holder) {
      add({
        id: `pr-overlap-${covered.id}`, level: "med",
        title: `${covered.name} is included in ${holder.name}, and both are on this quote`,
        text: `${covered.name} costs ${usd(covered.annual, 0)} a year on its own line. Anyone who also holds ${holder.name} already has it.`,
        ask: `Confirm the ${covered.name} seats are for people who are not on ${holder.name}. Ask for the line to be removed or reduced for anyone who holds both.`,
      });
    }
  }

  const profile = getProfile();
  const suiteSeats = rows.filter((r) => SUITES.has(r.productId)).reduce((a, r) => a + r.qty, 0);
  if (profile.licensedUsers > 0 && suiteSeats > profile.licensedUsers * 1.05) {
    add({
      id: "pr-seats", level: "med", title: "Suite seats quoted exceed licensed users",
      text: `${suiteSeats.toLocaleString("en-US")} suite seats are quoted; the Workspace profile has ${profile.licensedUsers.toLocaleString("en-US")} licensed users.`,
      ask: "Reconcile the quantity to the people who need a licence before accepting a price. Extra seats are paid for the full term.",
    });
  }

  const ch = channelOf(vendorId);
  if (ch.channel === "reseller") {
    add({
      id: "pr-channel-reseller", level: "med", title: `${ch.label} margin and fees are not visible`,
      text: "A reseller quote hides how much of each price is Microsoft's and how much is the reseller's.",
      ask: "Ask for the Microsoft price beside the reseller price on every line, and for fees or margin in writing. Ask them to match or beat Microsoft's direct price. If they cannot, price the same lines direct with Microsoft.",
    });
  } else if (ch.channel === "direct") {
    add({
      id: "pr-channel-direct", level: "med", title: "No competing quote on these lines",
      text: "A direct quote has nothing to be measured against unless a partner prices the same lines.",
      ask: `Ask ${String(profile.resellerLSP || "").trim() || "your reseller"} and one other reseller to quote identical products, quantities and term, then use the lower price to press Microsoft, and the reverse. Load each quote in this tab to compare them.`,
    });
  } else {
    add({
      id: "pr-channel-unknown", level: "low", title: "Source of the quote not identified",
      text: "The document does not clearly say whether it is from Microsoft or a reseller.",
      ask: "Choose the source above so the right asks are shown.",
    });
  }

  const fee = String(text).split(/\r?\n/).find((s) => /\b(?:service|admin(?:istration)?|processing|handling|procurement|freight|shipping|logistics|management)\s+fee/i.test(s) && /\$\s?\d/.test(s));
  if (fee) {
    add({ id: "pr-fee", level: "med", title: "A fee is added on top of the licence price", text: fee.replace(/\s+/g, " ").trim().slice(0, 260), ask: "Ask for the fee to be removed or folded into a lower unit price. Licence resale rarely needs a separate fee." });
  }
  if (/(?:billed|billing|invoice[sd]?)\s+(?:frequency\s*:?\s*)?monthly|monthly\s+billing/i.test(text)) {
    add({ id: "pr-monthly-text", level: "med", title: "Monthly billing is quoted", text: "Monthly billing on an annual commitment normally costs more than paying annually.", ask: "Ask for the annual-billing price for the committed seats and keep monthly only for variable seats." });
  }
  const valid = String(text).split(/\r?\n/).find((s) => /(?:quote|pricing|price)\s+(?:is\s+)?valid|valid\s+(?:through|until|for)|expires?\s+on/i.test(s));
  if (valid) {
    add({ id: "pr-valid", level: "low", title: "The price has an expiry date", text: valid.replace(/\s+/g, " ").trim().slice(0, 260), ask: "Ask the vendor to hold this price until your approval date. Microsoft is most willing to move near the end of its quarters (March, June, September, December)." });
  }

  const rank = { high: 0, med: 1, low: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* -----------------------------------------------------------------------------
 * Several proposals side by side
 * -------------------------------------------------------------------------- */
export function compareOffers(offers) {
  const byProd = new Map();
  // A product outside the catalogue is still compared across offers when both carry the same part number.
  const keyOf = (r) => (r.productId ? `${r.productId}${r.gov ? ":gov" : ""}` : r.sku ? `sku:${String(r.sku).toLowerCase()}` : "");
  for (const o of offers) {
    for (const r of o.rows) {
      const key = keyOf(r);
      if (r.alt || !key || !(r.perMonth > 0) || !(r.qty > 0)) continue;
      let e = byProd.get(key);
      if (!e) { e = { productId: key, name: r.productId ? r.name : (r.desc || r.sku), qty: 0, acc: {}, ref: r.ref }; byProd.set(key, e); }
      const a = (e.acc[o.id] ??= { spend: 0, qty: 0 });
      a.spend += r.perMonth * r.qty;
      a.qty += r.qty;
      e.ref = e.ref ?? r.ref;
    }
  }
  const rows = [...byProd.values()].map((e) => {
    const prices = {};
    for (const [id, a] of Object.entries(e.acc)) prices[id] = a.spend / a.qty;
    const ids = Object.keys(prices);
    const bestId = ids.reduce((b, id) => (prices[id] < prices[b] ? id : b), ids[0]);
    const best = prices[bestId];
    const worst = Math.max(...ids.map((id) => prices[id]));
    return { productId: e.productId, name: e.name, qty: Math.max(0, ...Object.values(e.acc).map((a) => a.qty)), prices, bestId, best, spreadPct: worst > 0 ? (worst - best) / worst : 0, ref: e.ref, aboveTarget: Boolean(e.ref && best > e.ref.target * 1.005) };
  }).sort((a, b) => b.best * b.qty - a.best * a.qty);

  const totals = {}, asks = [];
  for (const o of offers) {
    let total = 0, atBest = 0, lines = 0;
    for (const r of rows) {
      const p = r.prices[o.id];
      if (!(p > 0)) continue;
      total += p * r.qty * 12; atBest += r.best * r.qty * 12; lines++;
      if (p > r.best * 1.005) {
        const from = offers.find((x) => x.id === r.bestId);
        asks.push({ offerId: o.id, product: r.name, qty: r.qty, price: p, matchPrice: r.best, matchFrom: from?.name ?? "", save: (p - r.best) * r.qty * 12 });
      }
    }
    totals[o.id] = { total, atBest, lines, save: total - atBest };
  }
  const bestOf = rows.reduce((a, r) => a + r.best * r.qty * 12, 0);
  return { rows, totals, asks: asks.sort((a, b) => b.save - a.save), bestOf };
}

/* -----------------------------------------------------------------------------
 * Price sheets (CSV, pasted tables, Word tables)
 * -------------------------------------------------------------------------- */
const ROLE_RE = {
  ext: /extended|ext_price|ext_amount|line_total|total|subtotal|amount/,
  list: /list|msrp|erp|retail/,
  discount: /discount|disc(?:_|$)|off_list/,
  term: /(?:^|_)(?:term|duration|commitment|term_months|term_length|subscription_term)(?:_|$)/,
  billing: /billing|payment|frequency|invoice/,
  vendor: /vendor|reseller|supplier|partner|quote_from/,
  uom: /(?:^|_)(?:uom|unit_of_measure|period|price_period|pricing_unit|per)(?:_|$)/,
  unit: /unit_price|unit_cost|price|cost|rate|net_price|your_price|sell/,
  qty: /(?:^|_)(?:qty|quantity|seats?|licen[sc]es|users|units?|count)(?:_|$)/,
  sku: /(?:^|_)(?:sku|part(?:_number|_no|_num)?|mfr_part|manufacturer_part|offer_id|product_id|item_number|material)(?:_|$)/,
  product: /product|description|item|offer|service|name|title/,
};
const ROLE_ORDER = ["ext", "list", "discount", "term", "billing", "vendor", "uom", "unit", "qty", "sku", "product"];

function mapHeaders(headers) {
  const keys = headers.map(normaliseHeader);
  const map = { unit: [] };
  const taken = new Set();
  for (const role of ROLE_ORDER) {
    if (role === "unit") {
      keys.forEach((k, i) => { if (!taken.has(i) && ROLE_RE.unit.test(k)) { map.unit.push(i); taken.add(i); } });
      continue;
    }
    const i = keys.findIndex((k, ix) => !taken.has(ix) && ROLE_RE[role].test(k));
    if (i >= 0) { map[role] = i; taken.add(i); }
  }
  return map;
}

export function termMonthsOf(s, { words = true } = {}) {
  const t = String(s ?? "").toLowerCase();
  let m = t.match(/(\d+(?:\.\d+)?)\s*[- ]?\s*(?:years?|yrs?)\b/);
  if (m) return Math.round(Number(m[1]) * 12);
  m = t.match(/(\d{1,3})\s*[- ]?\s*(?:months?|mos?)\b/);
  if (m) return Number(m[1]);
  if (words) {
    if (/^\s*\d{1,3}\s*$/.test(t) && Number(t) >= 1 && Number(t) <= 120) return Number(t);
    if (/triennial/.test(t)) return 36;
    if (/\b(?:annual|yearly|one year)\b/.test(t)) return 12;
  }
  return null;
}

export function billingOf(s) {
  const t = String(s ?? "").toLowerCase();
  if (/up ?front|prepaid|triennial|full term|one[- ]time|3[- ]?year|36/.test(t)) return "upfront";
  if (/month/.test(t)) return "monthly";
  if (/annual|yearly|year/.test(t)) return "annual";
  return null;
}

function findTable(text) {
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    if (!lines[i].trim() || lines[i].length > 600) continue;
    for (const d of [",", "\t", "|", ";"]) {
      if (!lines[i].includes(d)) continue;
      const cells = (parseDelimited(lines[i], d)[0] ?? []).map((c) => String(c).trim());
      if (cells.length < 3 || cells.length > 40 || cells.some((c) => c.length > 60)) continue;
      const map = mapHeaders(cells);
      if (map.unit.length && (map.product != null || map.sku != null)) {
        const rows = parseDelimited(lines.slice(i).join("\n"), d).slice(1);
        return { headers: cells, map, rows };
      }
    }
  }
  return null;
}

export function parseQuoteTable(text, termMonths = 12) {
  const t = findTable(text);
  if (!t) return null;
  const { headers, map, rows } = t;
  const yearCols = headers.map((hd, i) => { const m = /^yr(\d)\s*amt$/i.exec(String(hd).trim()); return m ? { i, y: Number(m[1]) } : null; }).filter(Boolean);
  const lines = [];
  const meta = { headers, hasTerm: false, hasBilling: false, hasDiscount: false, hasQty: map.qty != null, hasList: map.list != null, options: map.unit.length > 1, rows: 0 };
  rows.forEach((r, rowIndex) => {
    const c = (i) => (i == null ? "" : String(r[i] ?? "").trim());
    const unitVals = map.unit.map((i) => ({ i, v: toNum(c(i), NaN) })).filter((x) => x.v > 0);
    if (!unitVals.length || r.length < 3) return;
    const sku = c(map.sku);
    const rawText = c(map.product);
    const tm1 = /\s*\(Tenant:\s*([^)]*)\)\s*$/i.exec(rawText);
    const tenant = tm1 ? tm1[1].trim() : "";
    const text1 = tm1 ? rawText.slice(0, tm1.index) : rawText;
    const prod = (sku && productBySku(sku)) || matchProduct(text1) || matchProduct(`${text1} ${sku}`) || matchProduct(r.join(" "));
    const qty = toNum(c(map.qty), 0);
    const ext = toNum(c(map.ext), NaN);
    const listV = toNum(c(map.list), NaN);
    const discRaw = c(map.discount);
    let disc = discRaw ? toNum(discRaw, NaN) : NaN;
    if (Number.isFinite(disc) && !/%/.test(discRaw) && disc > 0 && disc <= 1) disc *= 100;
    const rowTerm = termMonthsOf(c(map.term));
    const rowBilling = billingOf(c(map.billing));
    meta.rows++;
    unitVals.forEach(({ i, v }) => {
      const hdr = headers[i];
      const amounts = [v];
      if (unitVals.length === 1 && Number.isFinite(ext) && ext > 0 && qty) amounts.push(ext);
      const raw = `${hdr} ${c(map.uom)} ${c(map.billing)} ${c(map.term)}`;
      const lineTerm = rowTerm ?? termMonthsOf(hdr, { words: false });
      const it = interpret(prod, qty || null, amounts, raw, lineTerm || termMonths);
      const billing = rowBilling ?? billingOf(hdr);
      let sheetDiscountPct = Number.isFinite(disc) ? disc : null;
      if (sheetDiscountPct == null && listV > 0 && v / listV >= 0.3 && v / listV <= 1) sheetDiscountPct = Math.round((1 - v / listV) * 1000) / 10;
      if (lineTerm || billing) { meta.hasTerm = meta.hasTerm || Boolean(lineTerm); meta.hasBilling = meta.hasBilling || Boolean(billing); }
      if (sheetDiscountPct != null) meta.hasDiscount = true;
      const yearRatios = {};
      if (unitVals.length === 1) for (const { i: yi, y } of yearCols) { const yv = toNum(c(yi), NaN); if (yv > 0) yearRatios[y] = Math.round((yv / v) * 10000) / 10000; }
      lines.push({
        id: nextId(), productId: prod?.id ?? "", desc: [text1, sku].filter(Boolean).join(" ").slice(0, 160), qty,
        unit: Math.round(it.unit * 10000) / 10000, basis: it.basis, basisSource: it.basisSource, check: it.check || (!qty && meta.hasQty),
        termMonths: lineTerm || undefined, billing: billing || undefined, sheetDiscountPct: sheetDiscountPct ?? undefined,
        sku: sku || undefined, vendor: c(map.vendor) || undefined,
        yearRatios: Object.keys(yearRatios).length ? yearRatios : undefined, gov: isGovCloud(`${text1} ${sku}`) || tenantKindOf(tenant) === "gov" || undefined, tenant: tenant || undefined,
        optionOf: unitVals.length > 1 ? rowIndex : undefined, option: unitVals.length > 1 ? hdr : undefined,
      });
    });
  });
  return lines.length ? { lines, meta } : null;
}

/** Says what a document holds when no price lines could be read from it, so an empty result is explained and not just reported. */
export function explainNoPrices(text) {
  const all = String(text).split(/\r?\n/);
  const lines = all.filter((l) => l.trim());
  let best = null;
  for (let i = 0; i < Math.min(all.length, 80); i++) {
    if (!all[i].trim() || all[i].length > 600) continue;
    for (const d of [",", "\t", "|", ";"]) {
      if (!all[i].includes(d)) continue;
      const cells = (parseDelimited(all[i], d)[0] ?? []).map((c) => String(c).trim());
      if (cells.length < 3 || cells.some((c) => c.length > 60)) continue;
      const map = mapHeaders(cells);
      const found = { product: map.product != null || map.sku != null, quantity: map.qty != null, price: map.unit.length > 0 };
      const score = Object.values(found).filter(Boolean).length;
      if (score && (!best || score > best.score)) best = { score, row: i + 1, cells: cells.filter(Boolean).slice(0, 10), found };
    }
  }
  return { rows: lines.length, amounts: amountsIn(String(text)).length, header: best, sample: lines.slice(0, 5).map((l) => l.slice(0, 140)) };
}

/** Reads whatever price lines a document holds, from a table when there is one and from prose otherwise. */
export function analyzePricing(text, { name = "", termMonths } = {}) {
  const profile = getProfile();
  const tm = termMonths || (profile.termYears > 0 ? profile.termYears * 12 : 12);
  const table = parseQuoteTable(text, tm);
  const lines = table ? table.lines : extractLineItems(text, { termMonths: tm });
  const ve = vendorEvidence(text, name);
  return { vendorId: ve.id, vendorWhy: ve, termMonths: tm, lines, source: table ? "table" : "text", meta: table?.meta ?? {} };
}

/* -----------------------------------------------------------------------------
 * What the prices and the terms say together
 * -------------------------------------------------------------------------- */
const VARIABLE = new Set(["copilot-m365", "teams-phone", "teams-premium", "power-bi-pro", "m365-e5"]);

export const PRICING_SCOPES = new Set(["price", "pricing", "terms"]);

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function pricingInsights({ review, text, meta = {} }) {
  const out = [];
  const add = (f) => out.push({ scope: "pricing", ...f });
  const rows = review.rows.filter((r) => !r.alt);
  const priced = rows.filter((r) => r.annual > 0);
  const hasTerm = rows.some((r) => r.termMonths) || meta.hasTerm || /\b(?:term|commitment)\b[^.\n]{0,40}\d+\s*(?:months?|years?)|\d+\s*(?:months?|years?)\s*(?:term|subscription|commitment)/i.test(text);
  const hasBilling = rows.some((r) => r.billing) || meta.hasBilling || /\b(?:billed|billing|invoice[sd]?)\b/i.test(text);
  const hasValidity = /\bvalid\b|expires?\b|expiration|good through/i.test(text);
  const hasProtection = /price (?:protection|lock|guarantee)|prices? (?:are |is )?(?:fixed|held|locked)/i.test(text);

  const missing = [];
  if (!hasTerm) missing.push("the term length");
  if (!hasBilling) missing.push("how it is billed");
  if (!hasValidity) missing.push("how long the price is valid");
  if (!hasProtection) missing.push("whether the price is held for the term and for seats added later");
  if (missing.length) {
    add({
      id: "pr-no-terms", level: missing.length >= 3 ? "high" : "med", termId: "price-protection", redlineKey: hasProtection ? null : "price-lock",
      title: "The prices come without terms",
      text: `This document gives prices but does not state ${missing.join("; ")}. A unit price cannot be compared with another quote until those are known, because the same number is worth very different amounts on a monthly-billed 12-month term and a prepaid 36-month one.`,
      ask: `Ask the vendor to put on the quote: ${missing.join("; ")}. Then ask for the price for 12 and 36 months, billed annually, so the options sit side by side.`,
    });
  }

  const byProd = new Map();
  for (const r of priced) if (r.productId) { const k = `${r.productId}${r.gov ? ":gov" : ""}`; byProd.set(k, [...(byProd.get(k) ?? []), r]); }
  for (const [pid, rs] of byProd) {
    const prices = rs.map((r) => r.perMonth);
    const lowest = Math.min(...prices);
    if (rs.length < 2 || Math.max(...prices) <= lowest * 1.02) continue;
    const save = rs.reduce((a, r) => a + (r.perMonth - lowest) * 12 * r.qty, 0);
    add({
      id: `pr-spread-${pid}`, level: save >= 10000 ? "high" : "med", value: save,
      title: `${rs[0].name} is priced differently on different lines`,
      text: rs.map((r) => `${r.qty ? `${r.qty.toLocaleString("en-US")} seats` : "line"} at ${usd(r.perMonth)}`).join("; ") + ".",
      ask: `Ask for the lowest price, ${usd(lowest)}, on every ${rs[0].name} line.${save > 0 ? ` Worth ${usd(save, 0)} a year.` : ""}`,
    });
  }

  const terms = [...new Set(priced.map((r) => r.termMonths).filter(Boolean))];
  if (terms.length > 1) {
    add({
      id: "pr-mixed-terms", level: "med", termId: "price-protection", redlineKey: "co-term",
      title: "Lines run for different terms",
      text: `Terms on the sheet: ${terms.sort((a, b) => a - b).map((t) => `${t} months`).join(", ")}. Lines that end on different dates are renegotiated separately and cannot be priced against each other.`,
      ask: "Co-term every line to one end date and ask for each product on a common term. A longer commitment should carry a lower per-user price.",
    });
  }

  const monthly = priced.filter((r) => r.billing === "monthly");
  if (monthly.length) {
    const spend = monthly.reduce((a, r) => a + r.annual, 0);
    add({
      id: "pr-monthly", level: "med",
      title: `Monthly billing on ${plural(monthly.length, "line")}`,
      text: `${usd(spend, 0)} a year is billed monthly. Monthly billing on an annual commitment normally costs more than paying annually.`,
      ask: "Ask for the annual-billing price on seats that are stable, and keep monthly billing only for seats that vary.",
    });
  }

  const withDisc = priced.filter((r) => r.sheetDiscountPct != null);
  if (withDisc.length) {
    const floor = (r) => (r.peer ? r.peer.low : review.band.target);
    const low = withDisc.filter((r) => r.sheetDiscountPct + 0.05 < floor(r));
    if (low.length) {
      add({
        id: "pr-discount-low", level: "med", termId: "price-levels",
        title: `Discount below the expected range on ${plural(low.length, "line")}`,
        text: low.slice(0, 5).map((r) => `${r.name}: ${r.sheetDiscountPct}% off list on the sheet against ${floor(r)}% or more${r.peer ? ` for organisations with ${r.peer.tier.label}` : " (size-band assumption)"}`).join("; ") + ".",
        ask: "Ask for at least the bottom of the range on those lines, and for the price-list basis behind each discount.",
      });
    }
    const set = new Set(withDisc.map((r) => r.sheetDiscountPct));
    if (withDisc.length >= 3 && set.size === 1) {
      add({
        id: "pr-discount-flat", level: "low", termId: "price-levels",
        title: "The same discount is applied to every line",
        text: `Every line carries ${[...set][0]}% off list, which points to a blanket rate rather than a price set per product.`,
        ask: "Ask for the discount line by line, so the large lines carry the best rate and add-ons are not priced off the suite discount.",
      });
    }
  }

  const shortTerm = priced.filter((r) => r.termMonths && r.termMonths <= 12 && SUITE_IDS.has(r.productId));
  if (shortTerm.length) {
    add({
      id: "pr-short-term", level: "low", termId: "price-protection", redlineKey: "price-lock",
      title: "Stable suite seats are quoted on a 12-month term",
      text: `${shortTerm.map((r) => r.name).join(", ")} are quoted for 12 months or less, so the price has to be won again at every renewal.`,
      ask: "Ask for a 36-month price with price protection and compare it with the 12-month price before deciding.",
    });
  }

  const optGroups = new Map();
  for (const r of review.rows) if (r.optionOf != null) optGroups.set(r.optionOf, [...(optGroups.get(r.optionOf) ?? []), r]);
  const cheaper = [];
  for (const rs of optGroups.values()) {
    const first = rs[0], best = rs.reduce((b, r) => (r.perMonth < b.perMonth ? r : b), rs[0]);
    if (best !== first && best.perMonth < first.perMonth * 0.97) cheaper.push({ first, best, save: (first.perMonth - best.perMonth) * 12 * (first.qty || 0) });
  }
  if (cheaper.length) {
    add({
      id: "pr-options", level: "med", termId: "true-down", redlineKey: "true-down",
      title: "A longer commitment is cheaper on the same sheet",
      text: cheaper.slice(0, 5).map((c) => `${c.first.name}: ${usd(c.best.perMonth)} on "${c.best.option}" against ${usd(c.first.perMonth)} on "${c.first.option}" (${Math.round((1 - c.best.perMonth / c.first.perMonth) * 100)}% lower)`).join("; ") + ".",
      ask: "Take the longer-term price only with reduction rights and price protection. Without them, seats that are no longer needed cost more than the saving.",
    });
  }

  const rising = priced.filter((r) => r.yearRatios && Object.values(r.yearRatios).some((x) => x > 1.0005));
  if (rising.length) {
    const extra = (r) => Object.values(r.yearRatios).reduce((a, x) => a + Math.max(0, x - 1) * r.perMonth * 12 * r.qty, 0);
    const total = rising.reduce((a, r) => a + extra(r), 0);
    const top = [...rising].sort((a, b) => extra(b) - extra(a)).slice(0, 5);
    const yrs = (r) => Object.entries(r.yearRatios).filter(([, x]) => x > 1.0005).map(([y, x]) => `${usd(r.perMonth * x)} in year ${y}`).join(", ");
    add({
      id: "pr-year-rise", level: total >= 100000 ? "high" : "med", value: total, termId: "price-protection", redlineKey: "price-lock",
      title: `Prices rise after year 1 on ${plural(rising.length, "line")}`,
      text: `${top.map((r) => `${r.name}: ${usd(r.perMonth)} in year 1, ${yrs(r)}`).join("; ")}. The increases add ${usd(total, 0)} over the term at the quoted quantities.`,
      ask: `Ask for the year 1 price to be held for every year of the term on every line, in the agreement. Worth ${usd(total, 0)} over the term.`,
      why: [
        why("document", `The sheet shows a higher price in a later year for ${plural(rising.length, "line")}, for example ${top[0].name}: ${usd(top[0].perMonth)} in year 1 and ${yrs(top[0])}.`),
        why("calculation", `Extra cost = (later-year price - year 1 price) x 12 months x seats, summed over the later years and ${plural(rising.length, "line")}: ${usd(total, 0)}.`),
        precedentWhy("bv-fixed-price"),
      ].filter(Boolean),
    });
  }

  const govRows = [...new Map(priced.filter((r) => r.gov && GOV_PEER_PRICES[r.productId]).map((r) => [r.productId, r])).values()];
  if (govRows.length) {
    add({
      id: "pr-gov-peer", level: "low",
      title: "Government cloud prices have one public peer to ask about",
      text: `${govRows.map((r) => `${r.name}: ${usd(r.perMonth)} a month here, against ${usd(GOV_PEER_PRICES[r.productId].perMonth)} for ${GOV_PEER_PRICES[r.productId].label} on a 380-user city's December 2024 quote`).join("; ")}. It is one preliminary quote for a different government cloud and a much smaller buyer, so it is context for the question below and not a target price.`,
      ask: "Ask the reseller for the government-cloud list price behind each of these lines and the discount applied. Commercial list prices do not apply to them.",
      why: [precedentWhy("bv-quote")].filter(Boolean),
    });
  }

  const unpriced = rows.filter((r) => !r.ref);
  if (unpriced.length) {
    const spend = unpriced.reduce((a, r) => a + r.annual, 0);
    const gov = unpriced.filter((r) => r.gov).length;
    add({
      id: "pr-unpriced", level: spend > 0 ? "med" : "low",
      title: `${plural(unpriced.length, "line")} could not be checked against a reference price`,
      text: `${unpriced.slice(0, 4).map((r) => r.desc || r.name).join("; ")}${unpriced.length > 4 ? "; ..." : ""}. Either the product was not recognised or there is no list price for it in the catalogue.${gov ? ` ${plural(gov, "line")} ${gov === 1 ? "is" : "are"} government cloud, which is priced differently from the commercial list, so no commercial reference is applied.` : ""}`,
      ask: "Ask for the Microsoft part number and the Microsoft list price for each of these lines, and match them to a product in the table so they can be checked.",
    });
  }

  if (rows.length && rows.every((r) => !(r.qty > 0))) {
    add({
      id: "pr-no-qty", level: "med",
      title: "No quantities on the sheet",
      text: "Without seat counts the dollar value of each price gap cannot be sized.",
      ask: "Enter quantities in the table, or ask the vendor to quote at your organization's current counts.",
    });
  }

  const top = [...priced].sort((a, b) => b.annual - a.annual).slice(0, 3);
  const total = review.totals.quoted;
  if (top.length && total > 0) {
    const share = top.reduce((a, r) => a + r.annual, 0) / total;
    add({
      id: "pr-focus", level: "low",
      title: `${top.map((r) => r.name).join(", ")} carry ${Math.round(share * 100)}% of the spend`,
      text: `The quote comes to ${usd(total, 0)} a year; these lines come to ${usd(top.reduce((a, r) => a + r.annual, 0), 0)}.`,
      ask: "Negotiate these first. A small move on a large line is worth more than a large move on a small one.",
    });
  }
  return out;
}

/** Terms to get alongside a bare price sheet, chosen from what is on it. */
export function termsToSecure({ review, text }) {
  const out = [];
  const add = (f) => out.push({ scope: "terms", level: "med", ...f });
  const askOf = (id) => TERMS.find((t) => t.id === id)?.askFor?.[0] ?? "";
  const rows = review.rows.filter((r) => !r.alt);
  const ctx = orgContext();

  if (!/price (?:protection|lock|guarantee)|prices? (?:are |is )?(?:fixed|held|locked)/i.test(text)) {
    add({
      id: "term-price-protection", termId: "price-protection", redlineKey: "price-lock",
      title: "Secure price protection with these prices",
      text: "A price that can change mid-term, or that applies only to the seats on the quote, is not a fixed price.",
      ask: `${askOf("price-protection")}. Ask that seats added later are priced at these same unit prices.`,
    });
  }
  if (rows.some((r) => VARIABLE.has(r.productId)) || ctx.frontlineHeavy) {
    add({
      id: "term-true-down", termId: "true-down", redlineKey: "true-down",
      title: "Secure reduction rights on the seats most likely to be over-bought",
      text: `${rows.filter((r) => VARIABLE.has(r.productId)).map((r) => r.name).join(", ") || "Suite seats"} ${ctx.frontlineHeavy ? "and your organization's frontline roles " : ""}change from year to year, and a quantity committed now is paid for the whole term.`,
      ask: askOf("true-down"),
    });
  }
  if (!/true[- ]?up[^.]{0,120}(price|rate|contracted)/i.test(text)) {
    add({
      id: "term-trueup", level: "low", termId: "true-up", redlineKey: "trueup-price",
      title: "Pre-agree the price of extra seats",
      text: "Seats added after signing are otherwise priced at whatever applies on the day.",
      ask: askOf("true-up"),
    });
  }
  return out;
}

/** Written reasons for the findings that do not build their own: what was read, what was calculated and what precedent applies. */
function attachReasons(findings, { review, text, vendorId, name }) {
  const rows = review.rows.filter((r) => !r.alt);
  const find = (re) => String(text).split(/\r?\n/).find((s) => re.test(s));
  const sentence = (s) => String(s).replace(/\s+/g, " ").trim().slice(0, 240);
  const doc = (t) => why("document", `${name ? `${name}: ` : ""}${t}`);
  for (const f of findings) {
    if (f.why) continue;
    const w = [];
    switch (true) {
      case f.id === "pr-no-terms":
        w.push(doc("the text was searched for a term length, a billing frequency, a validity date and price-protection wording, and the items listed above were not found."));
        w.push(why("calculation", "Without a term the same unit price cannot be turned into a cost. Example: $57.00 a month is $684 a year on a 12-month term and $2,052 a seat over 36 months, so a quote that omits the term hides 3x the commitment."));
        w.push(precedentWhy("pa-term"));
        break;
      case f.id.startsWith("pr-spread-"): {
        const pid = f.id.slice(10);
        for (const r of rows.filter((x) => x.productId === pid)) w.push(doc(`${r.qty.toLocaleString("en-US")} seats at ${usd(r.perMonth)} per user per month${r.desc ? ` ("${r.desc.slice(0, 80)}")` : ""}.`));
        w.push(why("calculation", "Saving = sum over lines of (price - lowest price) x 12 x seats."));
        break;
      }
      case f.id === "pr-channel-reseller":
        w.push(doc(`the quote is attributed to ${channelOf(vendorId).label}.`));
        w.push(precedentWhy("pa-reseller"), precedentWhy("cdwg-discount"), precedentWhy("ea-levels-removed"));
        break;
      case f.id === "pr-channel-direct":
        w.push(precedentWhy("ea-levels-removed"));
        break;
      case f.id === "pr-discount-low" || f.id === "pr-discount-flat":
        w.push(doc("the discount percentages are taken from the sheet's own discount or list-price columns."));
        w.push(precedentWhy("ea-levels-removed"));
        break;
      case f.id === "pr-monthly" || f.id === "pr-monthly-text":
        w.push(doc("the billing column or text says the lines are billed monthly."));
        w.push(why("calculation", `Monthly billing on ${rows.filter((r) => r.billing === "monthly").map((r) => r.name).join(", ") || "these lines"} is priced for flexibility; ask for the annual-billing price before comparing quotes.`));
        break;
      case f.id === "pr-fee": { const s = find(/\bfee\b/i); if (s) w.push(doc(`"${sentence(s)}"`)); w.push(precedentWhy("cdwg-discount")); break; }
      case f.id === "pr-valid": { const s = find(/valid|expires?/i); if (s) w.push(doc(`"${sentence(s)}"`)); break; }
      case f.id === "pr-short-term" || f.id === "pr-mixed-terms":
        w.push(doc(`terms on the lines: ${[...new Set(rows.map((r) => r.termMonths).filter(Boolean))].join(", ")} months.`));
        w.push(precedentWhy("pa-term"));
        break;
      case f.id === "pr-options":
        w.push(doc("the sheet quotes the same product at more than one commitment."));
        break;
      case f.id.startsWith("pr-overlap-"):
        w.push(why("calculation", "The catalogue records that the higher suite includes this product. Microsoft's Product Terms are the authority; confirm there before removing seats."));
        break;
      default:
        break;
    }
    const filled = w.filter(Boolean);
    if (filled.length) f.why = filled;
  }
}

const SUITE_IDS = new Set(["m365-e3", "m365-e5", "m365-f3", "o365-e3"]);

/** Everything the pricing adds to a contract review, recomputed from the current lines. */
export function pricingFindings({ pricing, text, kind, name = "" }) {
  const review = priceLines(pricing.lines, pricing.termMonths);
  const out = [
    ...proposalAsks({ text, review, vendorId: pricing.vendorId, name }),
    ...pricingInsights({ review, text, meta: pricing.meta }),
    ...(kind === "pricing" ? termsToSecure({ review, text }) : []),
  ];
  attachReasons(out, { review, text, vendorId: pricing.vendorId, name });
  return { review, findings: out };
}
