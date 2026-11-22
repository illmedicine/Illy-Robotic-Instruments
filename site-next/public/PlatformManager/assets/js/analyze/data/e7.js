/* =============================================================================
 * data/e7.js — what Microsoft 365 E7 is said to contain and cost.
 *
 * These are COMMERCIAL-cloud figures from public pages. None has been checked
 * against a Microsoft price list or an order, and none says anything about
 * GCC / GCC High availability, so a quote in a government cloud is compared
 * with them as data only. Contracted prices in an uploaded quote always win.
 * ========================================================================== */

export const E7 = {
  name: "Microsoft 365 E7 (Frontier Suite)",
  listUsd: 99,
  /** Introductory discount reported for orders placed before the end date. */
  promo: { until: "2026-12-31", tiers: [{ minSeats: 100, pct: 15, price: 84 }, { minSeats: 10, pct: 10, price: 89 }] },
  /** What is bundled, with the stand-alone list price each part would otherwise be bought at. */
  parts: {
    e5: { name: "Microsoft 365 E5", listUsd: 60 },
    copilot: { name: "Microsoft 365 Copilot", listUsd: 30 },
    agent: { name: "Microsoft Agent 365", listUsd: 15 },
    entra: { name: "Microsoft Entra Suite", listUsd: 12 },
  },
  sources: [
    { label: "Microsoft: Microsoft 365 E7 page (names E5, Copilot, Entra Suite and Agent 365)", url: "https://www.microsoft.com/en-us/microsoft-365/enterprise/e7", level: "Microsoft" },
    { label: "Directions on Microsoft: E7 launches May 1 at $99 per user per month", url: "https://www.directionsonmicrosoft.com/m365-e7-to-launch-may-1-for-99-per-user-per-month/", level: "Analyst" },
    { label: "Microsoft Negotiations: E7 pricing, introductory discount and component list prices", url: "https://microsoftnegotiations.com/blog/e7-frontier-suite-pricing-99-per-user", level: "Reseller blog" },
    { label: "Redress Compliance: what E7 includes and costs", url: "https://redresscompliance.com/microsoft-365-e7-complete-guide", level: "Reseller blog" },
  ],
  caveat: "The $99 list price, the introductory discount and the stand-alone prices of Agent 365 ($15) and Entra Suite ($12) come from analyst and reseller pages, not from a Microsoft price list. Agent consumption costs sit outside the seat price. Confirm every figure with the account team and in the order.",
};

/**
 * What moving a person to E7 does to each licence they hold today, matched on the Graph skuPartNumber.
 * Only the four parts Microsoft names for E7 are treated as covered. Anything else is kept or checked, never assumed covered.
 */
export const COVERAGE = [
  { test: /^(SPE_E5|M365_E5|M365_G5|SPE_E5_.*)$/i, effect: "replaced", why: "Microsoft 365 E5 is the base of E7." },
  { test: /^MICROSOFT_365_COPILOT$/i, effect: "replaced", why: "Copilot is part of E7. Remove the stand-alone licence when E7 is assigned, or it is paid for twice." },
  { test: /ENTRA_SUITE/i, effect: "replaced", why: "The Entra Suite is part of E7." },
  { test: /AGENT_?365/i, effect: "replaced", why: "Agent 365 is part of E7." },
  { test: /^(ENTERPRISEPREMIUM|EMSPREMIUM|M365_E5_SUITE_COMPONENTS|WIN_DEF_ATP|AAD_PREMIUM_P2|ATP_ENTERPRISE|IDENTITY_THREAT_PROTECTION|THREAT_INTELLIGENCE|EMS|ENTERPRISEPACK|SPE_E3)$/i, effect: "included", why: "Already inside E5, so a stack like this is redundant once the person has E5 or E7." },
  { test: /POWERAPPS|POWER_APPS|FLOW_|POWER_AUTOMATE|POWERAUTOMATE/i, effect: "kept", why: "Power Apps and Power Automate premium are not among the four parts named for E7. Keep it." },
  { test: /DYN365|DYNAMICS/i, effect: "kept", why: "Dynamics 365 is a separate product and stays." },
  { test: /VISIO|PROJECT|PLANNER/i, effect: "kept", why: "Not part of E7. Keep it." },
  { test: /SECURITY_COPILOT|SECURITYCOPILOT/i, effect: "kept", why: "Security Copilot is a separate product from Microsoft 365 Copilot. Keep it unless Microsoft states otherwise." },
];

export function coverageOf(sku) {
  return COVERAGE.find((c) => c.test.test(String(sku))) ?? { effect: "check", why: "Not one of the parts named for E7 and not recognised here. Check it against the E7 service plans before removing it." };
}

/**
 * Where E7 changes the work for the IT desk. `basis`: Documented = a general licensing fact; Inference = follows from how the products work;
 * Verify = depends on how Microsoft packages E7 and must be checked with the account team or the admin centre before it is relied on.
 */
export const IT_EFFECTS = [
  { area: "Licence assignment", direction: "easier", basis: "Inference", text: "One licence replaces E5 plus the Copilot add-on, so there is one group to maintain, no Copilot request and approval step, and no separate Copilot licence to move when someone changes role." },
  { area: "Idle licence clean-up", direction: "easier", basis: "Inference", text: "The review that finds Copilot holders with no use disappears, because the licence is no longer bought separately. The waste moves into the E7 price instead, so it has to be judged at renewal." },
  { area: "Who can use Copilot", direction: "harder", basis: "Documented", text: "Copilot works on whatever the person can already open in SharePoint, OneDrive, Teams and mail. Today that exposure applies to the people holding a Copilot licence; under E7 it applies to every E7 user, so over-shared sites, missing sensitivity labels and gaps in data-loss prevention matter for the whole workforce. For an organisation holding regulated data such as PHI this is the largest new piece of work." },
  { area: "Restricting a group", direction: "harder", basis: "Verify", text: "Today a person without the licence has no Copilot. Under E7 the way to hold Copilot back for a group (contractors, regulated roles, a pilot ring) is to turn off individual service plans on the licence, or to restrict by policy. Confirm which E7 service plans can be switched off and whether group-based licensing supports it for E7 before relying on this." },
  { area: "Agents", direction: "harder", basis: "Inference", text: "More people can build and share agents, so the agent inventory, who may create them, which environments they live in and which data and connectors they reach all need owners. The Power Platform DLP policies and environment rules already in this app are where that starts." },
  { area: "Entra Suite", direction: "same", basis: "Verify", text: "The Entra Suite parts (Private Access, Internet Access, ID Governance, Verified ID) need to be deployed and configured before anyone benefits. Holding the licence changes nothing for IT until a project is chosen, so the risk is paying for them and not deploying them." },
  { area: "Audit and retention", direction: "harder", basis: "Inference", text: "Copilot interactions are recorded in the audit log. Every E7 user adds records, which raises audit volume, retention cost and eDiscovery scope. Confirm the Purview retention setting for Copilot interactions." },
  { area: "Help desk and training", direction: "harder", basis: "Inference", text: "Moving from a few hundred Copilot users to everyone means training, guidance on what may be pasted into prompts, and more how-do-I and wrong-answer calls." },
  { area: "Power Platform add-ons", direction: "same", basis: "Verify", text: "Power Apps and Power Automate premium licences are not among the four parts named for E7, so those add-ons stay and nothing changes for them. Confirm that no Power Platform capacity or Copilot Studio entitlement in E7 changes how makers are licensed." },
];
