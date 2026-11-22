/* =============================================================================
 * engines/e7model.js — keep Microsoft 365 E5 and today's add-ons, or move to E7.
 *
 * Pure functions over the compared price rows (renewalcase.buildCase().refRows).
 * Every price is per user per month; every total is per year.
 * ========================================================================== */
import { E7 } from "../data/e7.js";

const KEYS = { e5: "m365-e5", copilot: "copilot-m365", e7: "m365-e7" };
const ADDONS = ["copilot", "agent", "entra"];
const pos = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 && v !== "" && v != null ? Number(v) : d);

const rowOf = (rows, base, gov) => rows.find((r) => r.productId === base + (gov ? ":gov" : "")) ?? rows.find((r) => r.productId === base) ?? rows.find((r) => r.productId === `${base}:gov`);

/** What the uploaded quotes already say about each part of the model; null when no E7 line was read. */
export function e7Defaults(refRows = [], offers = []) {
  const e7 = rowOf(refRows, KEYS.e7, false);
  if (!e7) return null;
  const gov = e7.productId.endsWith(":gov");
  const ex = (id) => offers.find((o) => o.id === id)?.exhibit ?? "";
  const quoted = (r, listUsd) => (r ? { price: r.best, source: `best quoted, ${ex(r.bestId)}` } : { price: listUsd, source: "list price, not quoted" });
  const co = rowOf(refRows, KEYS.copilot, gov);
  return {
    seats: e7.qty, gov,
    e5: quoted(rowOf(refRows, KEYS.e5, gov), E7.parts.e5.listUsd),
    copilot: { ...quoted(co, E7.parts.copilot.listUsd), seats: co?.qty ?? 0 },
    agent: { price: E7.parts.agent.listUsd, source: "list price, not quoted", seats: 0 },
    entra: { price: E7.parts.entra.listUsd, source: "list price, not quoted", seats: 0 },
  };
}

/** The two models side by side, plus where E7 sits against the other quotes. `over` holds anything the reader typed over a default. */
export function e7Compare(refRows = [], offers = [], over = {}) {
  const d = e7Defaults(refRows, offers);
  if (!d) return null;
  const e7row = rowOf(refRows, KEYS.e7, false);
  const e5row = rowOf(refRows, KEYS.e5, d.gov);

  const seats = Math.max(0, Math.round(pos(over.seats, d.seats)));
  const e5 = pos(over.e5, d.e5.price);
  const e7Options = offers.map((o) => ({ id: o.id, exhibit: o.exhibit, document: o.name, price: e7row.prices[o.id] })).filter((x) => x.price > 0);
  const chosen = e7Options.find((x) => x.id === over.e7) ?? e7Options.reduce((a, b) => (b.price < a.price ? b : a));
  const e7 = chosen.price;

  const parts = {};
  for (const k of ADDONS) {
    parts[k] = { name: E7.parts[k].name, price: pos(over[`${k}Price`], d[k].price), seats: Math.min(seats, Math.round(pos(over[`${k}Seats`], d[k].seats))), source: d[k].source };
  }
  const addOnMonthly = ADDONS.reduce((a, k) => a + parts[k].price * parts[k].seats, 0);
  const allParts = ADDONS.reduce((a, k) => a + parts[k].price, 0);

  const keep = (seats * e5 + addOnMonthly) * 12;
  const allIn = seats * e7 * 12;
  const alaCarte = seats * (e5 + allParts) * 12;
  const others = addOnMonthly - parts.copilot.price * parts.copilot.seats;
  const needed = parts.copilot.price > 0 ? (seats * (e7 - e5) - others) / parts.copilot.price : null;

  const promo = E7.promo.tiers.find((t) => seats >= t.minSeats) ?? null;
  const compared = e7Options.map((x) => {
    const e5Here = e5row?.prices?.[x.id] ?? null;
    return { id: x.id, exhibit: x.exhibit, document: x.document, price: x.price, offList: (1 - x.price / E7.listUsd) * 100, e5: e5Here,
      overE5: e5Here != null ? x.price - e5Here : null, alaCarte: (e5Here ?? e5) + allParts };
  }).sort((a, b) => a.price - b.price);

  return {
    gov: d.gov, seats, e5, e5Source: over.e5 != null ? "entered" : d.e5.source, e7, e7Exhibit: chosen.exhibit, e7Id: chosen.id, e7Options, parts,
    keep, allIn, alaCarte, extraForE7: allIn - keep, saveVsAlaCarte: alaCarte - allIn, perUserKeep: keep / 12 / (seats || 1), perUserE7: e7,
    breakEven: needed == null ? null : { seats: Math.max(0, Math.ceil(needed)), share: seats ? Math.max(0, needed) / seats : null, never: needed > seats, always: needed <= 0 },
    list: E7.listUsd, offListQuoted: (1 - e7 / E7.listUsd) * 100, promo, compared,
    mixed: mixedEstate(seats, e5, e7, parts, over.mixedSeats ?? parts.copilot.seats),
    perUser: { increment: e7 - e5, copilot: parts.copilot.price, edge: parts.copilot.price - (e7 - e5) },
  };
}

/** E7 only for the people who would hold Copilot anyway, E5 for everyone else. `n` is how many get E7. */
export function mixedEstate(seats, e5, e7, parts, n) {
  const k = Math.min(seats, Math.max(0, Math.round(pos(n, 0))));
  const others = parts.entra.price * parts.entra.seats + parts.agent.price * parts.agent.seats;
  const leftoverCopilot = Math.max(0, parts.copilot.seats - k) * parts.copilot.price;
  const annual = (k * e7 + (seats - k) * e5 + others + leftoverCopilot) * 12;
  return { seats: k, annual };
}

/** If this share of the E7 users really used Copilot, what E7 costs over E5 with Copilot bought only for those users. */
export function sensitivity(m, shares = [0.1, 0.25, 0.5, 0.75, 1]) {
  const incr = m.e7 - m.e5;
  const cop = m.parts.copilot.price;
  const rest = m.parts.entra.price + m.parts.agent.price;
  return shares.map((s) => {
    const gap = incr - s * cop;
    return { share: s, users: Math.round(m.seats * s), extraYear: gap * m.seats * 12, perUserGap: gap,
      neededUse: gap <= 0 ? 0 : rest > 0 ? Math.min(1, gap / rest) : null, impossible: gap > rest };
  });
}

/** E7 against the market: published list, the reported introductory discount, the parts at list, and peer benchmark bands carried over from E5 and Copilot. */
export function e7Market(m, band) {
  const bandOf = (id) => (band ? band(id) : null);
  const e5Band = bandOf(KEYS.e5);
  const coBand = bandOf(KEYS.copilot);
  const partsList = E7.parts.e5.listUsd + E7.parts.copilot.listUsd + E7.parts.agent.listUsd + E7.parts.entra.listUsd;
  const mid = (b) => (b ? (b.low + b.high) / 2 : 0);
  const sumAtPeer = e5Band ? E7.parts.e5.listUsd * (1 - mid(e5Band) / 100) + E7.parts.copilot.listUsd * (1 - mid(coBand) / 100) + E7.parts.agent.listUsd + E7.parts.entra.listUsd : null;
  const peerRange = e5Band ? { low: E7.listUsd * (1 - e5Band.high / 100), high: E7.listUsd * (1 - e5Band.low / 100) } : null;
  const position = peerRange ? (m.e7 < peerRange.low - 0.005 ? "below" : m.e7 > peerRange.high + 0.005 ? "above" : "within") : null;
  const e5Discount = (1 - m.e5 / E7.parts.e5.listUsd) * 100;
  return { list: E7.listUsd, promo: E7.promo, partsList, offList: m.offListQuoted, e5Discount, e5Band, coBand, peerRange, position, sumAtPeer,
    belowPromo: m.promo ? m.e7 < m.promo.price : null };
}
