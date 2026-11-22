/* =============================================================================
 * org.js — organisation profile, approved tenant register and contracted rate
 * card for the organisation using this copy.
 *
 * Every engine in this application reads from here, so a recommendation is
 * always framed against the real estate rather than a generic estate. What is
 * particular to one organisation lives in orgdefaults.js.
 * ========================================================================== */

import { store, daysUntil, parseLocalDate } from "./core.js";
import { ORG, ORG_CONSTRAINTS } from "./orgdefaults.js";

/* -----------------------------------------------------------------------------
 * Constraint catalogue — the environmental nuances that change a
 * recommendation. Switch on the ones that apply to your organisation in the Workspace.
 * -------------------------------------------------------------------------- */
export const CONSTRAINTS = [
  {
    id: "phi",
    label: "PHI / ePHI in Microsoft workloads",
    detail:
      "Protected health information is stored or processed in Exchange, SharePoint, OneDrive, Teams or Fabric.",
    defaultOn: true,
  },
  {
    id: "hipaa-baa",
    label: "HIPAA Business Associate Agreement required",
    detail:
      "Any service brought into scope must be covered by the Microsoft BAA before production use.",
    defaultOn: true,
  },
  {
    id: "hitrust",
    label: "HITRUST CSF certification scope",
    detail:
      "New services entering scope create assessment effort and evidence obligations at the next audit cycle.",
    defaultOn: true,
  },
  {
    id: "us-residency",
    label: "US-only data residency",
    detail:
      "Workloads and capacity must stay in US regions. This constrains Fabric capacity region choice and workspace moves.",
    defaultOn: true,
  },
  {
    id: "frontline",
    label: "Significant non-desk / frontline population",
    detail:
      "Operations, mailroom, print/fulfilment and facilities staff who may not need a full E3/E5 seat.",
    defaultOn: true,
  },
  {
    id: "clinical",
    label: "Clinical / care-management staff",
    detail:
      "Nurses, care managers and utilisation review staff with shift patterns and shared-device usage.",
    defaultOn: true,
  },
  {
    id: "change-freeze",
    label: "Seasonal change freeze (for example Q4 or year end)",
    detail:
      "Migrations and capacity changes are restricted during peak business periods such as open enrolment or year end.",
    defaultOn: true,
  },
  {
    id: "onprem-heavy",
    label: "Material on-premises Windows/SQL estate",
    detail: "Software Assurance reconciliation and Azure Hybrid Benefit are live levers.",
    defaultOn: true,
  },
  {
    id: "third-party-edr",
    label: "Third-party EDR / security stack in place",
    detail:
      "Defender entitlements inside E5 may be duplicating a tool that is still the active control.",
    defaultOn: false,
  },
  ...ORG_CONSTRAINTS,
];

export const PRIORITIES = [
  "Reduce total Microsoft spend",
  "Eliminate shelfware before renewal",
  "Right-size Fabric / Power BI capacity",
  "Control Copilot cost and prove value",
  "Consolidate overlapping security tooling",
  "Strengthen contract terms and exit rights",
  "Improve Azure commitment accuracy (MACC)",
  "Reduce Unified Support cost",
  "Simplify the SKU estate",
  "Maintain regulatory compliance posture (for example HIPAA / HITRUST)",
];

export const AGREEMENT_TYPES = ["EA", "MCA-E", "CSP", "MPSA", "Unknown"];
export const CLOUD_POSTURE = [
  { id: "azure-first", label: "Azure-first" },
  { id: "balanced", label: "Balanced / multi-cloud" },
  { id: "on-prem-heavy", label: "On-premises heavy" },
];

/* -----------------------------------------------------------------------------
 * Audience roles. This edition has no external sign-in: the viewer selects the
 * lens they need, which changes emphasis and depth, not the underlying numbers.
 * -------------------------------------------------------------------------- */
export const ROLES = [
  {
    id: "contracts",
    label: "Contracts & Vendor Management",
    short: "Contracts",
    lens: "Clause-level detail, obligations, renewal mechanics and the exact asks to table.",
  },
  {
    id: "it",
    label: "IT Management",
    short: "IT",
    lens: "Estate detail, SKU mix, capacity sizing, migration effort and operational risk.",
  },
  {
    id: "cfo",
    label: "CFO / Finance",
    short: "CFO",
    lens: "Spend, run-rate, committed vs consumed, savings ranges and multi-year exposure.",
  },
  {
    id: "cio",
    label: "CIO / Executive",
    short: "CIO",
    lens: "Decisions required, risk posture, strategic trade-offs and the one-page position.",
  },
];

export const ROLE_IDS = ROLES.map((r) => r.id);
export const roleById = (id) => ROLES.find((r) => r.id === id) ?? ROLES[0];

/* -----------------------------------------------------------------------------
 * Default profile — a starting point. Every value is editable
 * in the Workspace and is explicitly marked as an estimate until confirmed.
 * -------------------------------------------------------------------------- */
export const DEFAULT_PROFILE = {
  orgName: ORG.name,
  division: "",
  analyst: "",
  role: "contracts",

  employeeCount: 0,
  licensedUsers: 0,
  knowledgeUsers: 0,
  frontlineUsers: 0,
  clinicalUsers: 0,
  contractorUsers: 0,

  agreementType: "EA",
  agreementNumber: "",
  resellerLSP: "",
  agreementStart: "",
  renewalDate: "",
  termYears: 3,
  hasPriceProtection: null,
  hasTrueDownRights: null,
  hasAlternative: false,

  // Date by which renewal decisions must be returned to Microsoft; quantities lock for the term.
  responseDeadline: ORG.responseDeadline,

  annualLicenceSpend: 0,
  annualAzureSpend: 0,
  annualSupportSpend: 0,
  maccAnnualCommit: 0,
  maccAnnualConsumed: 0,
  edeHours: 0,
  edeUtilizationPct: null,

  primaryCloud: "balanced",
  constraints: CONSTRAINTS.filter((c) => ORG.constraintsOn.includes(c.id)).map((c) => c.id),
  priorities: ["Eliminate shelfware before renewal", "Right-size Fabric / Power BI capacity"],
  learnings: [],

  confirmed: false,
  updatedAt: null,
};

/* -----------------------------------------------------------------------------
 * Tenant register.
 *
 * This edition is single-organisation. Exactly one tenant may be marked `home`
 * (the corporate tenant). Everything else is a `guest` tenant — a
 * partner, vendor, administered entity or acquired business whose data is
 * brought in for analysis. Guest tenants require a named approver and a review
 * date; they are never treated as owned spend by default.
 * -------------------------------------------------------------------------- */
export const TENANT_KINDS = [
  { id: "home", label: `Home tenant (${ORG.shortName})` },
  { id: "guest", label: "Guest tenant (partner / vendor / affiliate)" },
];

/** Cloud environment of a tenant record. Platform Manager is commercial-cloud only. */
export const TENANT_CLOUDS = [
  { id: "commercial", label: "Commercial" },
];
export const cloudLabel = (id) => TENANT_CLOUDS.find((c) => c.id === id)?.label ?? "Commercial";

export const DEFAULT_TENANTS = [
  {
    id: "corp",
    kind: "home",
    cloud: "commercial",
    name: ORG.homeTenantName,
    domain: ORG.homeDomain,
    tenantId: "",
    environment: "Production",
    approved: true,
    includeInRollup: true,
    approvedBy: "",
    reviewDate: "",
    baaInPlace: true,
    notes: "Primary corporate tenant.",
  },
];

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Domains accepted for the home tenant. */
export const HOME_DOMAIN_SUFFIXES = ORG.homeDomainSuffixes;

export function isHomeDomain(domain) {
  const d = String(domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!d) return false;
  return HOME_DOMAIN_SUFFIXES.some((s) => d === s || d.endsWith("." + s));
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * Validates a tenant record against the single-organisation rules.
 * `existing` is the current register, used to enforce one home tenant.
 */
export function validateTenant(t, existing = []) {
  const errors = [];
  const kind = t.kind === "guest" ? "guest" : "home";
  const domain = String(t.domain ?? "").trim().toLowerCase().replace(/^@/, "");

  if (!String(t.name ?? "").trim()) errors.push("A tenant display name is required.");
  if (!domain) errors.push("A primary domain is required.");
  else if (!DOMAIN_RE.test(domain)) errors.push(`"${domain}" is not a valid domain name.`);

  if (kind === "home") {
    if (domain && HOME_DOMAIN_SUFFIXES.length && !isHomeDomain(domain)) {
      errors.push(
        `"${domain}" is not one of this organisation's domains. Record it as a guest tenant, or correct the domain — ` +
          `only the organisation's own domains may be the home tenant.`
      );
    }
    const otherHome = existing.find((x) => x.kind !== "guest" && x.id !== t.id);
    if (otherHome) {
      errors.push(
        `"${otherHome.name}" is already the home tenant. This edition supports one home tenant; ` +
          `add additional organisations as guest tenants.`
      );
    }
  } else {
    if (HOME_DOMAIN_SUFFIXES.length && isHomeDomain(domain))
      errors.push(`"${domain}" is one of this organisation's domains — record it as the home tenant, not a guest.`);
    if (!String(t.approvedBy ?? "").trim())
      errors.push("Guest tenants require a named approver before data is loaded.");
    if (!String(t.reviewDate ?? "").trim())
      errors.push("Guest tenants require a review date so the connection is re-authorised.");
  }

  if (t.tenantId && !GUID_RE.test(String(t.tenantId).trim()))
    errors.push("Tenant ID must be a GUID, or left blank.");

  const dupe = existing.find(
    (x) => x.id !== t.id && String(x.domain ?? "").toLowerCase() === domain && domain
  );
  if (dupe) errors.push(`"${domain}" is already registered as "${dupe.name}".`);

  return errors;
}

/** Guest tenants whose review date has passed. */
export function expiredGuests(list = getTenants(), on = new Date()) {
  return list.filter(
    (t) => t.kind === "guest" && t.reviewDate && parseLocalDate(t.reviewDate).getTime() < on.getTime()
  );
}

export const homeTenant = (list = getTenants()) => list.find((t) => t.kind !== "guest") ?? null;
export const guestTenants = (list = getTenants()) => list.filter((t) => t.kind === "guest");

/* -----------------------------------------------------------------------------
 * Rate card — contracted unit prices override published planning defaults.
 * Keyed by product id from data/products.js.
 * -------------------------------------------------------------------------- */
export const DEFAULT_RATES = {
  currency: "USD",
  source: "planning-default",
  effectiveDate: "",
  // USD / user / month your organisation actually pays, keyed by product id. Empty until loaded from a renewal export or typed in the Workspace.
  unitPrices: {},
  fabricDiscountPct: 0,
  supportPctOfSpend: 0,
  updatedAt: null,
};

/* -----------------------------------------------------------------------------
 * Persistence
 * -------------------------------------------------------------------------- */
export function getProfile() {
  const saved = store.get("profile", null);
  return { ...DEFAULT_PROFILE, ...(saved ?? {}) };
}

export function saveProfile(patch) {
  const next = { ...getProfile(), ...patch, updatedAt: new Date().toISOString() };
  store.set("profile", next);
  return next;
}

export function getTenants() {
  const saved = store.get("tenants", null);
  return Array.isArray(saved) && saved.length ? saved : DEFAULT_TENANTS;
}

export function saveTenants(list) {
  store.set("tenants", list);
  return list;
}

export function getRates() {
  const saved = store.get("rates", null) ?? {};
  // Prices read from the spend workbook are the base; only what someone typed over them counts as their own.
  const legacy = saved.manualPrices === undefined && saved.unitPrices
    ? Object.fromEntries(Object.entries(saved.unitPrices).filter(([k, v]) => v !== DEFAULT_RATES.unitPrices[k] && v !== saved.autoPrices?.[k]))
    : {};
  const manualPrices = saved.manualPrices ?? legacy;
  const autoPrices = saved.autoPrices ?? {};
  return { ...DEFAULT_RATES, ...saved, unitPrices: { ...DEFAULT_RATES.unitPrices, ...autoPrices, ...manualPrices }, autoPrices, manualPrices, ...rateOverride };
}

// Values set by the server config (for example pricing.fabricDiscountPct) win over the browser rate card.
let rateOverride = {};
export function setRatesOverride(o) {
  rateOverride = o ?? {};
}

export function saveRates(patch) {
  const { unitPrices, ...current } = getRates();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  delete next.unitPrices;
  store.set("rates", next);
  return getRates();
}

/** Records the prices read from the spend workbook without touching anything the user entered. */
export function setAutoRates(auto) {
  store.set("rates", { ...(store.get("rates", null) ?? {}), ...auto });
}

/** Contracted price for a product, falling back to the published planning default. */
export function unitPrice(productId, listPrice) {
  const rates = getRates();
  const contracted = rates.unitPrices?.[productId];
  if (Number.isFinite(contracted) && contracted > 0) {
    return { price: contracted, source: "contracted" };
  }
  return { price: Number.isFinite(listPrice) ? listPrice : 0, source: "planning-default" };
}

/* -----------------------------------------------------------------------------
 * Derived context — the shared object every engine uses to tailor output.
 * -------------------------------------------------------------------------- */
export function orgContext() {
  const p = getProfile();
  const has = (id) => p.constraints.includes(id);
  const days = daysUntil(p.renewalDate);

  const totalSpend =
    (p.annualLicenceSpend || 0) + (p.annualAzureSpend || 0) + (p.annualSupportSpend || 0);

  const tenants = getTenants();

  return {
    profile: p,
    role: roleById(p.role),
    tenants,
    home: homeTenant(tenants),
    guests: guestTenants(tenants),
    staleGuests: expiredGuests(tenants),
    has,
    daysToRenewal: days,
    totalAnnualSpend: totalSpend,
    /** Regulated-data posture (health data, audit evidence) — drives governance-weighted advice. */
    regulated: has("phi") || has("hipaa-baa") || has("hitrust"),
    federal: has("gov-contracts"),
    usOnly: has("us-residency"),
    frontlineHeavy: has("frontline") || has("clinical"),
    changeFreeze: has("change-freeze"),
    onPremHeavy: has("onprem-heavy") || p.primaryCloud === "on-prem-heavy",
    hasThirdPartyEdr: has("third-party-edr"),
    daysToDeadline: daysUntil(p.responseDeadline),
    completeness: profileCompleteness(p),
  };
}

/* -----------------------------------------------------------------------------
 * Existing renewal tooling. Analyzer links to these rather than
 * duplicating their per-account decision logic; URLs are set once in Workspace.
 * -------------------------------------------------------------------------- */
export const DEFAULT_TOOLS = {
  launcherUrl: "",
  insightToolUrl: "",
};

export function getTools() {
  return { ...DEFAULT_TOOLS, ...(store.get("tools", null) ?? {}) };
}

export function saveTools(patch) {
  const next = { ...getTools(), ...patch };
  store.set("tools", next);
  return next;
}

/** Only http(s) links are accepted, so a stored value can never be a script URL. */
export function safeUrl(u) {
  try {
    const url = new URL(String(u ?? "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

const REQUIRED_FIELDS = [
  "employeeCount",
  "licensedUsers",
  "agreementType",
  "renewalDate",
  "annualLicenceSpend",
];

export function profileCompleteness(p = getProfile()) {
  const optional = ["annualAzureSpend", "annualSupportSpend", "knowledgeUsers", "frontlineUsers"];
  const filled = (k) => {
    const v = p[k];
    return typeof v === "number" ? v > 0 : Boolean(String(v ?? "").trim());
  };
  const req = REQUIRED_FIELDS.filter(filled).length;
  const opt = optional.filter(filled).length;
  const missing = REQUIRED_FIELDS.filter((k) => !filled(k));
  return {
    score: Math.round(((req / REQUIRED_FIELDS.length) * 0.75 + (opt / optional.length) * 0.25) * 100),
    missing,
    ready: missing.length === 0,
  };
}

/** Human-readable list of the constraints currently in force. */
export function activeConstraints(p = getProfile()) {
  return CONSTRAINTS.filter((c) => p.constraints.includes(c.id));
}

/* -----------------------------------------------------------------------------
 * Change-freeze calendar — peak business periods such as open enrolment or year end.
 * Used to warn before scheduling a migration or capacity change.
 * -------------------------------------------------------------------------- */
export function inChangeFreeze(date = new Date()) {
  const m = date.getMonth(); // 0-indexed
  // Mid-October through mid-January: open enrolment + year-end claims run.
  if (m === 9 && date.getDate() >= 15) return true;
  if (m === 10 || m === 11) return true;
  if (m === 0 && date.getDate() <= 15) return true;
  return false;
}

export function nextSafeWindow(from = new Date()) {
  const d = new Date(from);
  let guard = 0;
  while (inChangeFreeze(d) && guard < 500) {
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return d;
}

/** Microsoft fiscal quarter ends — the leverage calendar. */
export function nextFiscalMilestones(from = new Date()) {
  const out = [];
  const year = from.getFullYear();
  for (const y of [year, year + 1, year + 2]) {
    out.push({ date: new Date(y, 2, 31), label: `Q3 end — 31 Mar ${y}`, strength: "medium" });
    out.push({ date: new Date(y, 5, 30), label: `FY end — 30 Jun ${y}`, strength: "strongest" });
    out.push({ date: new Date(y, 8, 30), label: `Q1 end — 30 Sep ${y}`, strength: "medium" });
    out.push({ date: new Date(y, 11, 31), label: `H1 end — 31 Dec ${y}`, strength: "strong" });
  }
  return out.filter((m) => m.date > from).sort((a, b) => a.date - b.date);
}
