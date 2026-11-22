import { api } from "./api.js";
import { getProfile, saveProfile, setAutoRates, getRates } from "./analyze/org.js";
import { matchProduct, productBySku } from "./analyze/data/products.js";
import { slug } from "./analyze/engines/decisions.js";

/** True when a person typed the value, so it must never be replaced by a figure read from the system. */
export function isOwn(p, key) {
  const src = p.sources?.[key] ?? (key === "licensedUsers" ? p.licensedUsersSource : undefined);
  return src === "manual" || (Number(p[key]) > 0 && src !== "tenant" && src !== "workbook");
}

/** Price per user per month for each product, from the licences in the spend workbook (cost / records / 12). */
export function derivePrices(licences) {
  const byProduct = new Map();
  const prices = {};
  const matched = {};
  for (const l of licences) {
    if (!(l.perUserMonth > 0)) continue;
    const prod = l.gov ? null : productBySku(l.license) ?? matchProduct(l.license);
    if (!prod) { prices[slug(l.license)] = l.perUserMonth; continue; }
    matched[l.license] = prod.id;
    const e = byProduct.get(prod.id) ?? { cost: 0, n: 0 };
    e.cost += l.annual;
    e.n += l.records;
    byProduct.set(prod.id, e);
  }
  for (const [id, e] of byProduct) prices[id] = Math.round((e.cost / e.n / 12) * 100) / 100;
  return { prices, matched };
}

/**
 * Fills the Workspace profile and the rate card from what the system already holds: licensed users and an employee
 * estimate from Entra, annual licence spend and per-user prices from the newest renewal spend workbook. A figure someone
 * typed in is never overwritten. Returns what was read, or null when nothing is available.
 */
export async function syncWorkspace() {
  let s;
  try { s = await api.workspaceSuggest(); } catch { return null; }
  if (!s) return null;
  const p = getProfile();
  const want = {};
  if (s.tenant) {
    want.licensedUsers = [s.tenant.licensed, "tenant"];
    if (s.tenant.employeesEstimate > 0) want.employeeCount = [s.tenant.employeesEstimate, "tenant"];
  }
  if (s.spend) want.annualLicenceSpend = [Math.round(s.spend.annualLicenceSpend), "workbook"];
  const patch = {}, sources = { ...(p.sources ?? {}) };
  for (const [k, [v, src]] of Object.entries(want)) {
    if (isOwn(p, k)) continue;
    if (p[k] !== v) patch[k] = v;
    sources[k] = src;
  }
  if (JSON.stringify(sources) !== JSON.stringify(p.sources ?? {}) || Object.keys(patch).length) {
    saveProfile({ ...patch, sources, licensedUsersSource: sources.licensedUsers ?? p.licensedUsersSource });
  }
  if (s.spend) {
    const { prices, matched } = derivePrices(s.spend.licences);
    const current = getRates();
    if (JSON.stringify(current.autoPrices) !== JSON.stringify(prices) || current.autoSource?.id !== s.spend.dataset.id) {
      setAutoRates({ autoPrices: prices, autoMatched: matched, autoLicences: s.spend.licences, autoSource: s.spend.dataset });
    }
  }
  return s;
}
